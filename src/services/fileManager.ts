import { storage, CatInfo } from './storage';
import type { CatUnlockProgress } from './storage';
import { trigger } from '../utils/eventAdapter';
import { post } from '../utils/httpAdapter';
import { selectPrimaryVideoUrl } from './videoActions';
import Taro from '@tarojs/taro';

const getApiBaseURL = () => (process.env.TARO_APP_API_BASE_URL || '').replace(/\/$/, '');

function normalizeLocalhostUrl(url: string): string {
  return url.replace(/^http:\/\/localhost(?::|\/)/, (match) => match.replace('localhost', '127.0.0.1'));
}

function toPlayableVideoUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//.test(url) || url.startsWith('wxfile://') || url.startsWith('ttfile://')) {
    return normalizeLocalhostUrl(url);
  }
  if (url.startsWith('/')) {
    const baseURL = getApiBaseURL();
    return baseURL ? normalizeLocalhostUrl(`${baseURL}${url}`) : url;
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

function isMiniProgram(): boolean {
  try {
    return Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  } catch {
    return process.env.TARO_ENV === 'weapp';
  }
}

function isLocalImagePath(src: string): boolean {
  return src.startsWith('wxfile://') || src.startsWith('ttfile://') || src.startsWith('http://tmp') || src.startsWith('/tmp/');
}

function compressMiniImage(src: string, quality: number): Promise<string> {
  return new Promise((resolve) => {
    Taro.compressImage({
      src,
      quality: Math.max(1, Math.min(100, Math.round(quality * 100))),
      success: (res) => resolve(res.tempFilePath || src),
      fail: (error) => {
        console.warn('[FileManager] mini image compression failed, using original:', error);
        resolve(src);
      },
    });
  });
}

function compressForStorage(image: string | undefined, maxSize: number, quality: number): Promise<string | undefined> {
  if (!image) return Promise.resolve(image);
  if (isMiniProgram()) {
    if (isLocalImagePath(image)) return compressMiniImage(image, quality);
    if (image.startsWith('data:image')) {
      console.warn('[FileManager] skip base64 image compression in mini program runtime');
    }
    return Promise.resolve(image);
  }
  if (!image.startsWith('data:image')) return Promise.resolve(image);
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      console.warn('[FileManager] skip browser image compression without window');
      resolve(image);
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
    img.onerror = () => resolve(image);
    img.src = image;
  });
}

function getPrimaryStatus(currentStatus: CatInfo['generationStatus'], primaryVideo?: string): CatInfo['generationStatus'] {
  return primaryVideo ? 'ready' : currentStatus;
}

interface UpdateCatVideosOptions {
  actionGenerationError?: string | null;
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

    const existingCat = storage.getCatById(groupId);
    const newCat: CatInfo = {
      ...(existingCat || {}),
      id: groupId,
      name: catName,
      breed: metadata?.breed || 'AI 生成',
      color: metadata?.furColor || '未知',
      avatar: avatarUrl,
      source: metadata?.source === 'created' ? 'created' : 'uploaded',
      createdAt: existingCat?.createdAt || Date.now(),
      videoPath: selectPrimaryVideoUrl(finalPaths),
      videoPaths: finalPaths,
      remoteVideoUrl: selectPrimaryVideoUrl(finalPaths),
      placeholderImage: compressedPlaceholder,
      anchorFrame: compressedAnchor,
      actionGenerationError: undefined,
      generationStatus: 'ready',
      generationError: undefined,
      generationUpdatedAt: Date.now(),
    };

    storage.saveCatInfo(newCat);

    return finalPaths;
  }

  public static async updateCatVideos(
    catId: string,
    newVideoUrls: { [key: string]: string },
    isUnlocking: boolean = false,
    unlockProgress?: Omit<CatUnlockProgress, 'updatedAt'>,
    options?: UpdateCatVideosOptions
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
    const nextUnlockProgress: CatUnlockProgress | undefined = unlockProgress
      ? {
          completed: unlockProgress.completed,
          total: unlockProgress.total,
          currentAction: unlockProgress.currentAction,
          failed: unlockProgress.failed,
          updatedAt: Date.now(),
        }
      : isUnlocking
        ? cat.unlockProgress
        : undefined;

    const nextVideoPaths = {
      ...cat.videoPaths,
      ...persistedUrls
    };
    const primaryVideo = selectPrimaryVideoUrl(nextVideoPaths, cat.videoPath || cat.remoteVideoUrl);
    const nextActionGenerationError = options?.actionGenerationError === null
      ? undefined
      : options?.actionGenerationError ?? cat.actionGenerationError;

    const updatedCat: CatInfo = {
      ...cat,
      videoPaths: nextVideoPaths,
      videoPath: primaryVideo,
      remoteVideoUrl: primaryVideo,
      isUnlocking,
      unlockProgress: nextUnlockProgress,
      actionGenerationError: nextActionGenerationError,
      generationStatus: getPrimaryStatus(cat.generationStatus, primaryVideo),
      generationError: undefined,
      generationUpdatedAt: Date.now(),
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
    storage.deleteCatById(catId);
  }
}
