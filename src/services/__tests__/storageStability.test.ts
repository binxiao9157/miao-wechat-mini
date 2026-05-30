import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('storage stability behavior', () => {
  const syncQueue = {
    enqueue: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    syncQueue.enqueue.mockReset();
  });

  it('returns defensive cached copies for cat lists', async () => {
    const { storage } = await import('../storage');
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
    storage.saveCatList([
      {
        id: 'cat-1',
        name: 'Miao',
        breed: '狸花',
        color: 'brown',
        source: 'uploaded',
        avatar: 'avatar-1',
        videoPath: 'video-1',
        createdAt: 1,
      },
    ]);

    const firstRead = storage.getCatList();
    firstRead[0].name = 'mutated outside';

    expect(storage.getCatList()[0].name).toBe('Miao');
  });

  it('does not enqueue unchanged time letters again', async () => {
    const { storage, setSyncQueueForTesting } = await import('../storage');
    setSyncQueueForTesting(syncQueue);
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
    const letter = {
      id: 'letter-1',
      catId: 'cat-1',
      catAvatar: 'avatar-1',
      title: 'hello',
      content: 'world',
      createdAt: 1,
      unlockAt: 2,
    };

    storage.saveTimeLetters([letter]);
    syncQueue.enqueue.mockClear();
    storage.saveTimeLetters([letter]);

    expect(syncQueue.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues changed time letters', async () => {
    const { storage, setSyncQueueForTesting } = await import('../storage');
    setSyncQueueForTesting(syncQueue);
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
    const letter = {
      id: 'letter-1',
      catId: 'cat-1',
      catAvatar: 'avatar-1',
      title: 'hello',
      content: 'world',
      createdAt: 1,
      unlockAt: 2,
    };

    storage.saveTimeLetters([letter]);
    syncQueue.enqueue.mockClear();
    storage.saveTimeLetters([{ ...letter, content: 'updated' }]);

    expect(syncQueue.enqueue).toHaveBeenCalledWith({
      type: 'letter',
      id: 'letter-1',
      action: 'upsert',
      payload: { ...letter, content: 'updated' },
    });
  });
});
