import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SecondaryUnlockCat } from '../secondaryUnlockService';

vi.mock('../fileManager', () => ({
  FileManager: {
    updateCatVideos: vi.fn(async () => undefined),
  },
}));

vi.mock('../volcanoService', () => ({
  ACTION_PROMPTS: {
    v1_approach: { prompt: 'v1 prompt', duration: 7 },
    v2_wait: { prompt: 'v2 prompt', duration: 4 },
    v3_return: { prompt: 'v3 prompt', duration: 7 },
    v4_fetch: { prompt: 'v4 prompt', duration: 7 },
  },
  VolcanoService: {
    submitTask: vi.fn(async (_image: string, options: { prompt: string }) => ({ id: `task-${options.prompt}` })),
    pollTaskResult: vi.fn(async (taskId: string) => `https://cdn.example.com/${taskId}.mp4`),
  },
}));

import { FileManager } from '../fileManager';
import { setSecondaryUnlockFrameResolverForTesting, startSecondaryUnlock } from '../secondaryUnlockService';
import { VolcanoService } from '../volcanoService';

describe('secondary unlock service', () => {
  const cat: SecondaryUnlockCat = {
    id: 'cat-1',
    name: 'Miao',
    breed: '狸花',
    color: 'brown',
    avatar: 'https://cdn.example.com/cat.png',
    source: 'uploaded',
    anchorFrame: 'https://cdn.example.com/anchor.png',
    placeholderImage: 'https://cdn.example.com/placeholder.png',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setSecondaryUnlockFrameResolverForTesting(async (_videoUrl, fallbackFrame) => fallbackFrame);
  });

  afterEach(() => {
    setSecondaryUnlockFrameResolverForTesting(null);
    vi.useRealTimers();
  });

  it('runs all secondary video actions without a page abort signal', async () => {
    const task = startSecondaryUnlock(cat);

    await vi.waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledTimes(1);
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledTimes(2);
    });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledTimes(3);
    });
    await vi.advanceTimersByTimeAsync(3000);
    await task;

    expect(VolcanoService.submitTask).toHaveBeenNthCalledWith(1, cat.anchorFrame, expect.objectContaining({
      prompt: 'v2 prompt',
      duration: 4,
      hasLastFrame: true,
    }));
    expect(VolcanoService.submitTask).toHaveBeenNthCalledWith(2, cat.anchorFrame, expect.objectContaining({
      prompt: 'v3 prompt',
      duration: 7,
      hasLastFrame: true,
    }));
    expect(VolcanoService.submitTask).toHaveBeenNthCalledWith(3, cat.anchorFrame, expect.objectContaining({
      prompt: 'v4 prompt',
      duration: 7,
      hasLastFrame: true,
    }));
    expect(VolcanoService.pollTaskResult).toHaveBeenNthCalledWith(1, 'task-v2 prompt');
    expect(FileManager.updateCatVideos).toHaveBeenLastCalledWith(cat.id, {}, false, undefined, {
      actionGenerationError: null,
    });
  });

  it('deduplicates concurrent unlock requests for the same cat', async () => {
    const first = startSecondaryUnlock({ ...cat, id: 'cat-dedupe' });
    const second = startSecondaryUnlock({ ...cat, id: 'cat-dedupe' });

    expect(second).toBe(first);

    await vi.waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledTimes(1);
    });
    await vi.advanceTimersByTimeAsync(9000);
    await first;

    expect(VolcanoService.submitTask).toHaveBeenCalledTimes(3);
  });

  it('chains secondary video frames using the PWA waterfall model', async () => {
    setSecondaryUnlockFrameResolverForTesting(async (videoUrl, fallbackFrame) => (
      videoUrl.includes('/task-v2 prompt.mp4') ? 'frame:v2-last' :
      videoUrl.includes('/v1.mp4') ? 'frame:v1-last' :
      fallbackFrame
    ));

    const task = startSecondaryUnlock({
      ...cat,
      videoPaths: {
        v1_approach: 'https://cdn.example.com/v1.mp4',
      },
    });

    await vi.waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledTimes(1);
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledTimes(2);
    });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => {
      expect(VolcanoService.submitTask).toHaveBeenCalledTimes(3);
    });
    await vi.advanceTimersByTimeAsync(3000);
    await task;

    expect(VolcanoService.submitTask).toHaveBeenNthCalledWith(1, 'frame:v1-last', expect.objectContaining({
      firstFrame: 'frame:v1-last',
      lastFrame: 'frame:v1-last',
      hasLastFrame: true,
    }));
    expect(VolcanoService.submitTask).toHaveBeenNthCalledWith(2, 'frame:v2-last', expect.objectContaining({
      firstFrame: 'frame:v2-last',
      lastFrame: cat.anchorFrame,
      hasLastFrame: true,
    }));
    expect(VolcanoService.submitTask).toHaveBeenNthCalledWith(3, 'frame:v2-last', expect.objectContaining({
      firstFrame: 'frame:v2-last',
      lastFrame: cat.anchorFrame,
      hasLastFrame: true,
    }));
  });
});
