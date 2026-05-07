import Taro from '@tarojs/taro';
import { storage, CatInfo } from './storage';

export function getPrimaryVideoUrl(cat: CatInfo | null | undefined): string {
  if (!cat) return '';
  return cat.videoPaths?.idle || cat.videoPath || cat.remoteVideoUrl || '';
}

export function isCatReady(cat: CatInfo | null | undefined): boolean {
  return !!getPrimaryVideoUrl(cat);
}

export function isCatGenerationFailed(cat: CatInfo | null | undefined): boolean {
  return cat?.generationStatus === 'failed' && !isCatReady(cat);
}

export function isCatGenerationPending(cat: CatInfo | null | undefined): boolean {
  return !cat?.generationStatus || cat.generationStatus === 'pending';
}

export function getActiveOrFirstCat(): CatInfo | null {
  const cats = storage.getCatList();
  const activeId = storage.getActiveCatId();
  const active = cats.find(c => c.id === activeId) || null;

  if (active && (isCatReady(active) || isCatGenerationPending(active))) {
    return active;
  }

  return cats.find(isCatReady)
    || cats.find(isCatGenerationPending)
    || active
    || cats[0]
    || null;
}

export function routeAfterCatSync(): void {
  const cat = getActiveOrFirstCat();

  if (!cat) {
    Taro.reLaunch({ url: '/pages/cat-start/index' });
    return;
  }

  storage.setActiveCatId(cat.id);

  if (isCatGenerationFailed(cat)) {
    Taro.reLaunch({ url: '/pages/empty-cat/index' });
    return;
  }

  if (isCatReady(cat)) {
    Taro.switchTab({ url: '/pages/home/index' }).catch(() => {
      Taro.reLaunch({ url: '/pages/home/index' });
    });
    return;
  }

  Taro.reLaunch({ url: '/pages/generation-progress/index' });
}
