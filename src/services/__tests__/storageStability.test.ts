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

  it('expires delete tombstones after retention window', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-01T00:00:00Z'));
      const { storage, setSyncQueueForTesting } = await import('../storage');
      setSyncQueueForTesting(syncQueue);
      storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
      storage.saveDiaries([{
        id: 'diary-1',
        catId: 'cat-1',
        content: 'hello',
        createdAt: 1,
        likes: 0,
        isLiked: false,
        comments: [],
      }]);

      storage.deleteDiary('diary-1');
      expect(storage.hasDeleteTombstone('diary', 'diary-1')).toBe(true);

      vi.setSystemTime(new Date('2026-06-01T00:00:01Z'));
      expect(storage.hasDeleteTombstone('diary', 'diary-1')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears delete tombstones explicitly', async () => {
    const { storage, setSyncQueueForTesting } = await import('../storage');
    setSyncQueueForTesting(syncQueue);
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
    storage.saveTimeLetters([{
      id: 'letter-1',
      catId: 'cat-1',
      catAvatar: 'avatar-1',
      content: 'future',
      createdAt: 1,
      unlockAt: 2,
    }]);

    storage.deleteTimeLetter('letter-1');
    expect(storage.hasDeleteTombstone('letter', 'letter-1')).toBe(true);

    storage.clearDeleteTombstone('letter', 'letter-1');
    expect(storage.hasDeleteTombstone('letter', 'letter-1')).toBe(false);
  });

  it('deduplicates points transactions by idempotency key', async () => {
    const { storage, setSyncQueueForTesting } = await import('../storage');
    setSyncQueueForTesting(syncQueue);
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });

    storage.addPoints(10, '每日登录奖励', 'daily-login:2026-05-30');
    storage.addPoints(10, '每日登录奖励', 'daily-login:2026-05-30');

    const points = storage.getPoints();
    expect(points.total).toBe(10);
    expect(points.history).toHaveLength(1);
    expect(points.history[0]).toMatchObject({
      id: 'daily-login:2026-05-30',
      amount: 10,
      type: 'earn',
    });
  });

  it('deduplicates point deductions by idempotency key', async () => {
    const { storage, setSyncQueueForTesting } = await import('../storage');
    setSyncQueueForTesting(syncQueue);
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
    storage.addPoints(50, 'seed', 'seed');

    expect(storage.deductPoints(20, '解锁新伙伴', 'unlock:cat-1')).toBe(true);
    expect(storage.deductPoints(20, '解锁新伙伴', 'unlock:cat-1')).toBe(true);

    const points = storage.getPoints();
    expect(points.total).toBe(30);
    expect(points.history.filter(item => item.id === 'unlock:cat-1')).toHaveLength(1);
  });
});
