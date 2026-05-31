import { describe, expect, it } from 'vitest';
import {
  FOUR_STAGE_VIDEO_ACTIONS,
  getPrimaryVideoAction,
  getPrimaryVideoUrl,
  getVideoActionUrl,
  hasFourStageVideos,
  isFourStageVideoAction,
} from '../videoActions';
import type { CatInfo } from '../storage';

describe('video action model compatibility', () => {
  const baseCat: CatInfo = {
    id: 'cat-1',
    name: 'Miao',
    breed: '狸花',
    color: 'brown',
    avatar: 'https://cdn.example.com/cat.png',
    source: 'uploaded',
  };

  it('prefers the PWA four-stage primary video and ignores legacy idle videos', () => {
    const cat: CatInfo = {
      ...baseCat,
      videoPath: 'https://cdn.example.com/legacy-video-path.mp4',
      remoteVideoUrl: 'https://cdn.example.com/legacy-remote.mp4',
      videoPaths: {
        idle: 'https://cdn.example.com/idle.mp4',
        v1_approach: 'https://cdn.example.com/v1.mp4',
      },
    };

    expect(getPrimaryVideoAction(cat)).toBe('v1_approach');
    expect(getPrimaryVideoUrl(cat)).toBe('https://cdn.example.com/v1.mp4');
  });

  it('falls back only to PWA direct video fields, not legacy action keys', () => {
    expect(getPrimaryVideoUrl({
      ...baseCat,
      videoPaths: { idle: 'https://cdn.example.com/idle.mp4' },
    })).toBe('');

    expect(getPrimaryVideoUrl({
      ...baseCat,
      videoPath: 'https://cdn.example.com/direct.mp4',
    })).toBe('https://cdn.example.com/direct.mp4');
  });

  it('detects four-stage actions without treating legacy actions as modern', () => {
    expect(FOUR_STAGE_VIDEO_ACTIONS).toEqual(['v1_approach', 'v2_wait', 'v3_return', 'v4_fetch']);
    expect(isFourStageVideoAction('v4_fetch')).toBe(true);
    expect(isFourStageVideoAction('idle')).toBe(false);
  });

  it('reports four-stage readiness only when all v1-v4 videos exist', () => {
    expect(hasFourStageVideos({ ...baseCat, videoPaths: { v2_wait: 'https://cdn.example.com/v2.mp4' } })).toBe(false);
    expect(hasFourStageVideos({
      ...baseCat,
      videoPaths: {
        v1_approach: 'https://cdn.example.com/v1.mp4',
        v2_wait: 'https://cdn.example.com/v2.mp4',
        v3_return: 'https://cdn.example.com/v3.mp4',
        v4_fetch: 'https://cdn.example.com/v4.mp4',
      },
    })).toBe(true);
    expect(hasFourStageVideos({ ...baseCat, videoPaths: { tail: 'https://cdn.example.com/tail.mp4' } })).toBe(false);
  });

  it('does not map four-stage story actions to legacy action videos', () => {
    const cat: CatInfo = {
      ...baseCat,
      videoPaths: {
        tail: 'https://cdn.example.com/tail.mp4',
      },
    };

    expect(getVideoActionUrl(cat, 'v2_wait')).toBe('');
  });

  it('does not fake unavailable legacy actions with the primary video', () => {
    const cat: CatInfo = {
      ...baseCat,
      videoPaths: {
        idle: 'https://cdn.example.com/idle.mp4',
      },
    };

    expect(getVideoActionUrl(cat, 'tail')).toBe('');
  });
});
