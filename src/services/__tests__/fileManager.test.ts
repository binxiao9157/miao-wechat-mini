import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileManager } from '../fileManager';
import { storage, type CatInfo } from '../storage';
import { trigger } from '../../utils/eventAdapter';

vi.mock('../storage', () => ({
  storage: {
    getCatById: vi.fn(),
    saveCatInfo: vi.fn(),
  },
}));

vi.mock('../../utils/httpAdapter', () => ({
  post: vi.fn(async (_url: string, data: { videoUrl: string }) => ({
    data: { url: data.videoUrl },
  })),
}));

vi.mock('../../utils/eventAdapter', () => ({
  trigger: vi.fn(),
}));

describe('FileManager.updateCatVideos', () => {
  const baseCat: CatInfo = {
    id: 'cat-1',
    name: 'Miao',
    breed: '狸花',
    color: 'brown',
    avatar: 'https://cdn.example.com/cat.png',
    source: 'uploaded',
    createdAt: 1,
    videoPath: 'https://cdn.example.com/v1.mp4',
    remoteVideoUrl: 'https://cdn.example.com/v1.mp4',
    videoPaths: { v1_approach: 'https://cdn.example.com/v1.mp4' },
    generationStatus: 'ready',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.getCatById).mockReturnValue(baseCat);
  });

  it('persists background unlock progress metadata', async () => {
    await FileManager.updateCatVideos(
      'cat-1',
      { v2_wait: 'https://cdn.example.com/v2.mp4' },
      true,
      {
        completed: 1,
        total: 3,
        currentAction: 'v2_wait',
        failed: 0,
      },
    );

    expect(storage.saveCatInfo).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cat-1',
      isUnlocking: true,
      unlockProgress: expect.objectContaining({
        completed: 1,
        total: 3,
        currentAction: 'v2_wait',
        failed: 0,
        updatedAt: expect.any(Number),
      }),
    }));
    expect(trigger).toHaveBeenCalledWith('cat-updated', { catId: 'cat-1' });
  });

  it('promotes v1_approach as the primary video when modern actions are saved', async () => {
    await FileManager.updateCatVideos(
      'cat-1',
      { v1_approach: 'https://cdn.example.com/v1.mp4' },
      false,
    );

    expect(storage.saveCatInfo).toHaveBeenCalledWith(expect.objectContaining({
      videoPath: 'https://cdn.example.com/v1.mp4',
      remoteVideoUrl: 'https://cdn.example.com/v1.mp4',
      generationStatus: 'ready',
    }));
  });

  it('stores action generation failures without clearing playable videos', async () => {
    await FileManager.updateCatVideos(
      'cat-1',
      {},
      false,
      undefined,
      { actionGenerationError: '后续动作生成失败' },
    );

    expect(storage.saveCatInfo).toHaveBeenCalledWith(expect.objectContaining({
      videoPath: 'https://cdn.example.com/v1.mp4',
      actionGenerationError: '后续动作生成失败',
      generationStatus: 'ready',
    }));
  });

  it('clears stale unlock progress and previous action error after successful completion', async () => {
    vi.mocked(storage.getCatById).mockReturnValue({
      ...baseCat,
      isUnlocking: true,
      actionGenerationError: '有 1 个后续动作暂未生成成功',
      unlockProgress: {
        completed: 2,
        total: 3,
        currentAction: 'v4_fetch',
        failed: 1,
        updatedAt: 1,
      },
    });

    await FileManager.updateCatVideos(
      'cat-1',
      {},
      false,
      undefined,
      { actionGenerationError: null },
    );

    expect(storage.saveCatInfo).toHaveBeenCalledWith(expect.objectContaining({
      isUnlocking: false,
      unlockProgress: undefined,
      actionGenerationError: undefined,
    }));
  });
});

describe('FileManager.downloadVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.getCatById).mockReturnValue(null);
  });

  it('does not save a generated cat when the caller cancels before commit', async () => {
    await FileManager.downloadVideos(
      { v1_approach: 'https://cdn.example.com/v1.mp4' },
      'cat-cancelled',
      'Cancelled',
      'https://cdn.example.com/cat.png',
      {
        breed: '狸花',
        furColor: 'brown',
        source: 'upload',
        placeholderImage: 'https://cdn.example.com/cat.png',
        anchorFrame: 'https://cdn.example.com/cat.png',
      },
      { shouldCommit: () => false },
    );

    expect(storage.saveCatInfo).not.toHaveBeenCalled();
  });
});
