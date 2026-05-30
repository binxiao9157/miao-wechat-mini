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
    videoPath: 'https://cdn.example.com/idle.mp4',
    remoteVideoUrl: 'https://cdn.example.com/idle.mp4',
    videoPaths: { idle: 'https://cdn.example.com/idle.mp4' },
    generationStatus: 'ready',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.getCatById).mockReturnValue(baseCat);
  });

  it('persists background unlock progress metadata', async () => {
    await FileManager.updateCatVideos(
      'cat-1',
      { tail: 'https://cdn.example.com/tail.mp4' },
      true,
      {
        completed: 1,
        total: 3,
        currentAction: 'tail',
        failed: 0,
      },
    );

    expect(storage.saveCatInfo).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cat-1',
      isUnlocking: true,
      unlockProgress: expect.objectContaining({
        completed: 1,
        total: 3,
        currentAction: 'tail',
        failed: 0,
        updatedAt: expect.any(Number),
      }),
    }));
    expect(trigger).toHaveBeenCalledWith('cat-updated', { catId: 'cat-1' });
  });
});
