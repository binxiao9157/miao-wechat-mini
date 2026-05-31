import type { CatInfo } from './storage';

export const FOUR_STAGE_VIDEO_ACTIONS = ['v1_approach', 'v2_wait', 'v3_return', 'v4_fetch'] as const;

export type FourStageVideoAction = typeof FOUR_STAGE_VIDEO_ACTIONS[number];
export type CatVideoAction = FourStageVideoAction;

const FOUR_STAGE_SET = new Set<string>(FOUR_STAGE_VIDEO_ACTIONS);

export function isFourStageVideoAction(action: string): action is FourStageVideoAction {
  return FOUR_STAGE_SET.has(action);
}

export function hasFourStageVideos(cat: CatInfo | null | undefined): boolean {
  return FOUR_STAGE_VIDEO_ACTIONS.every(action => !!cat?.videoPaths?.[action]);
}

export function getPrimaryVideoAction(cat: CatInfo | null | undefined): string | null {
  if (!cat) return null;

  for (const action of FOUR_STAGE_VIDEO_ACTIONS) {
    if (cat.videoPaths?.[action]) return action;
  }

  if (cat.videoPath) return 'videoPath';
  if (cat.remoteVideoUrl) return 'remoteVideoUrl';
  return null;
}

export function getPrimaryVideoUrl(cat: CatInfo | null | undefined): string {
  if (!cat) return '';
  const action = getPrimaryVideoAction(cat);
  if (!action) return '';
  if (action === 'videoPath') return cat.videoPath || '';
  if (action === 'remoteVideoUrl') return cat.remoteVideoUrl || '';
  return cat.videoPaths?.[action] || '';
}

export function getVideoActionUrl(cat: CatInfo | null | undefined, action: CatVideoAction | string): string {
  if (!cat) return '';
  if (!isFourStageVideoAction(action)) return '';
  return cat.videoPaths?.[action] || '';
}

export function selectPrimaryVideoUrl(paths: Record<string, string | undefined> | undefined, fallback?: string): string {
  const pseudoCat = { videoPaths: paths, videoPath: fallback } as CatInfo;
  return getPrimaryVideoUrl(pseudoCat);
}
