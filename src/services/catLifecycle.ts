import Taro from '@tarojs/taro';
import { storage, CatInfo } from './storage';

export function getPrimaryVideoUrl(cat: CatInfo | null | undefined): string {
  if (!cat) return '';
  return cat.videoPaths?.idle || cat.videoPath || cat.remoteVideoUrl || '';
}

export function isCatReady(cat: CatInfo | null | undefined): boolean {
  return !!getPrimaryVideoUrl(cat);
}

export function getActiveOrFirstCat(): CatInfo | null {
  return storage.getActiveCat() || storage.getCatList()[0] || null;
}

export function routeAfterCatSync(): void {
  const cat = getActiveOrFirstCat();

  if (!cat) {
    Taro.reLaunch({ url: '/pages/cat-start/index' });
    return;
  }

  storage.setActiveCatId(cat.id);

  if (isCatReady(cat)) {
    Taro.switchTab({ url: '/pages/home/index' }).catch(() => {
      Taro.reLaunch({ url: '/pages/home/index' });
    });
    return;
  }

  Taro.reLaunch({ url: '/pages/generation-progress/index' });
}
