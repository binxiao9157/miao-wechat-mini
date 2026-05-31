import { storage, CatInfo } from './storage';
import { reLaunch, switchTab } from '../utils/navigateAdapter';
import { getPrimaryVideoUrl as getPreferredPrimaryVideoUrl } from './videoActions';

export function getPrimaryVideoUrl(cat: CatInfo | null | undefined): string {
  return getPreferredPrimaryVideoUrl(cat);
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
    reLaunch('/pages/cat-start/index');
    return;
  }

  storage.setActiveCatId(cat.id);

  if (isCatGenerationFailed(cat)) {
    reLaunch('/pages/empty-cat/index');
    return;
  }

  if (isCatReady(cat)) {
    switchTab('/pages/home/index').catch(() => {
      reLaunch('/pages/home/index');
    });
    return;
  }

  reLaunch('/pages/generation-progress/index');
}
