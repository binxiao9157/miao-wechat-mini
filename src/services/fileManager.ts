import { storage, CatInfo } from './storage';
import { trigger } from '../utils/eventAdapter';
import { post } from '../utils/httpAdapter';

const getApiBaseURL = () => (process.env.TARO_APP_API_BASE_URL || '').replace(/\/$/, '');

function toPlayableVideoUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//.test(url) || url.startsWith('wxfile://') || url.startsWith('ttfile://')) {
    return url;
  }
  if (url.startsWith('/')) {
    const baseURL = getApiBaseURL();
    return baseURL ? `${baseURL}${url}` : url;
  }
  return url;
}

function isPersistedVideoUrl(url: string): boolean {
  if (!url) return false;
  const baseURL = getApiBaseURL();
  return url.startsWith('/uploads/') || (!!baseURL && url.startsWith(`${baseURL}/uploads/`));
}

async function persistVideoUrl(url: string, catId: string, action: string): Promise<string> {
  if (!url) return url;
  if (isPersistedVideoUrl(url)) {
    return toPlayableVideoUrl(url);
  }

  try {
    const resp = await post('/api/v1/assets/persist-video', { videoUrl: url, catId, action }, { timeout: 120000 });
    const data = resp.data;
    return toPlayableVideoUrl(data.url || url);
  } catch (error: any) {
    console.error('[FileManager] persist video failed:', error?.message || error);
    throw new Error('视频持久化失败，请检查服务器或视频源');
  }
}

function compressForStorage(base64: string | undefined, maxSize: number, quality: number): Promise<string | undefined> {
  if (!base64 || !base64.startsWith('data:image')) return Promise.resolve(base64);
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(base64);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export class FileManager {
  public static async downloadVideos(
    videoUrls: { [key: string]: string },
    groupId: string,
    catName: string,
    avatarUrl: string,
    metadata?: { breed?: string; furColor?: string; source?: 'upload' | 'created'; placeholderImage?: string; anchorFrame?: string }
  ): Promise<{ [key: string]: string }> {
    const finalPaths: { [key: string]: string } = {};

    const entries = Object.entries(videoUrls);
    const persisted = await Promise.all(
      entries.map(([action, url]) => persistVideoUrl(url, groupId, action))
    );
    entries.forEach(([action], i) => {
      finalPaths[action] = persisted[i];
    });

    const [compressedPlaceholder, compressedAnchor] = await Promise.all([
      compressForStorage(metadata?.placeholderImage, 200, 0.5),
      compressForStorage(metadata?.anchorFrame, 600, 0.7),
    ]);

    const newCat: CatInfo = {
      id: groupId,
      name: catName,
      breed: metadata?.breed || 'AI 生成',
      color: metadata?.furColor || '未知',
      avatar: avatarUrl,
      source: metadata?.source === 'created' ? 'created' : 'uploaded',
      createdAt: Date.now(),
      videoPath: finalPaths.idle || finalPaths.petting || Object.values(finalPaths)[0],
      videoPaths: finalPaths,
      remoteVideoUrl: finalPaths.idle || finalPaths.petting || Object.values(finalPaths)[0],
      placeholderImage: compressedPlaceholder,
      anchorFrame: compressedAnchor,
    };

    storage.saveCatInfo(newCat);

    return finalPaths;
  }

  public static async updateCatVideos(
    catId: string,
    newVideoUrls: { [key: string]: string },
    isUnlocking: boolean = false
  ): Promise<void> {
    const cat = storage.getCatById(catId);
    if (!cat) return;

    const entries = Object.entries(newVideoUrls);
    const persisted = await Promise.all(
      entries.map(([action, url]) => persistVideoUrl(url, catId, action))
    );
    const persistedUrls: { [key: string]: string } = {};
    entries.forEach(([action], i) => {
      persistedUrls[action] = persisted[i];
    });

    const updatedCat: CatInfo = {
      ...cat,
      videoPaths: {
        ...cat.videoPaths,
        ...persistedUrls
      },
      isUnlocking
    };

    storage.saveCatInfo(updatedCat);
    trigger('cat-updated', { catId });
  }

  public static async downloadVideo(videoUrl: string, taskId: string, catName: string, avatarUrl: string): Promise<string> {
    const paths = await this.downloadVideos({ longPress: videoUrl }, taskId, catName, avatarUrl);
    return paths.longPress;
  }

  public static getHistory() {
    return storage.getCatList().filter(cat => cat.source === 'uploaded');
  }

  public static deleteVideo(catId: string) {
    const list = storage.getCatList();
    const updated = list.filter(c => c.id !== catId);
    storage.saveCatList(updated);

    if (storage.getActiveCatId() === catId) {
      storage.setActiveCatId(updated[0]?.id || '');
    }
  }
}
