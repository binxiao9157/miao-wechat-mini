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
    expect(syncQueue.enqueue).toHaveBeenCalledWith({
      type: 'points',
      id: 'daily-login:2026-05-30',
      action: 'transaction',
      payload: expect.objectContaining({
        id: 'daily-login:2026-05-30',
        amount: 10,
        type: 'earn',
        reason: '每日登录奖励',
      }),
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
    expect(syncQueue.enqueue).toHaveBeenCalledWith({
      type: 'points',
      id: 'unlock:cat-1',
      action: 'transaction',
      payload: expect.objectContaining({
        id: 'unlock:cat-1',
        amount: 20,
        type: 'spend',
        reason: '解锁新伙伴',
      }),
    });
  });

  it('tops up real points when debug points cheat is enabled', async () => {
    vi.stubEnv('TARO_APP_DEBUG_BUILD', 'true');

    try {
      const { storage, setSyncQueueForTesting } = await import('../storage');
      setSyncQueueForTesting(syncQueue);
      storage.saveUserInfo({ username: 'debug-points-user', nickname: 'Debug', avatar: '' });
      storage.saveCatList([
        {
          id: 'cat-debug',
          name: 'Debug Cat',
          breed: '狸花',
          color: 'brown',
          source: 'uploaded',
          avatar: 'avatar-debug',
          createdAt: 1,
        },
      ]);
      storage.savePoints({
        total: 70,
        lastLoginDate: null,
        dailyInteractionPoints: 0,
        lastInteractionDate: null,
        onlineMinutes: 0,
        lastOnlineUpdate: Date.now(),
        history: [],
      });
      syncQueue.enqueue.mockClear();

      storage.setIsPointsCheat(true);

      const points = storage.getPoints();
      expect(points.total).toBe(200);
      expect(points.history[0]).toMatchObject({
        type: 'earn',
        amount: 130,
        reason: '调试积分补足',
      });
      expect(syncQueue.enqueue).toHaveBeenCalledWith({
        type: 'points',
        id: expect.stringMatching(/^debug-points-cheat:/),
        action: 'transaction',
        payload: expect.objectContaining({
          type: 'earn',
          amount: 130,
          reason: '调试积分补足',
        }),
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('auto tops up before point deduction while debug points cheat is enabled', async () => {
    vi.stubEnv('TARO_APP_DEBUG_BUILD', 'true');

    try {
      const { storage, setSyncQueueForTesting } = await import('../storage');
      setSyncQueueForTesting(syncQueue);
      storage.saveUserInfo({ username: 'debug-deduct-user', nickname: 'Debug', avatar: '' });
      storage.savePoints({
        total: 70,
        lastLoginDate: null,
        dailyInteractionPoints: 0,
        lastInteractionDate: null,
        onlineMinutes: 0,
        lastOnlineUpdate: Date.now(),
        history: [],
      });
      storage.setIsPointsCheat(true);
      syncQueue.enqueue.mockClear();

      expect(storage.deductPoints(200, '解锁新伙伴', 'unlock:debug-cat')).toBe(true);

      const points = storage.getPoints();
      expect(points.total).toBe(0);
      expect(points.history[0]).toMatchObject({
        id: 'unlock:debug-cat',
        type: 'spend',
        amount: 200,
      });
      expect(points.history[1]).toMatchObject({
        type: 'earn',
        amount: 130,
        reason: '调试积分补足',
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('applies point mutations against the latest stored value', async () => {
    const { storage, setSyncQueueForTesting } = await import('../storage');
    setSyncQueueForTesting(syncQueue);
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });

    storage.updatePoints(points => {
      points.total += 10;
      points.history.unshift({
        id: 'tx-1',
        type: 'earn',
        amount: 10,
        reason: 'first',
        timestamp: Date.now(),
      });
    });
    storage.updatePoints(points => {
      points.total += 5;
      points.history.unshift({
        id: 'tx-2',
        type: 'earn',
        amount: 5,
        reason: 'second',
        timestamp: Date.now(),
      });
    });

    const points = storage.getPoints();
    expect(points.total).toBe(15);
    expect(points.history.map(item => item.id)).toEqual(['tx-2', 'tx-1']);
  });

  it('keeps stale background unlock state resumable when reading cats', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
      const { storage, setSyncQueueForTesting } = await import('../storage');
      setSyncQueueForTesting(syncQueue);
      storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
      storage.saveCatList([{
        id: 'cat-1',
        name: 'Miao',
        breed: '狸花',
        color: 'brown',
        source: 'uploaded',
        avatar: 'avatar-1',
        videoPath: 'video-1',
        createdAt: 1,
        isUnlocking: true,
        unlockProgress: {
          completed: 1,
          total: 3,
          currentAction: 'v3_return',
          failed: 0,
          updatedAt: Date.now() - 21 * 60 * 1000,
        },
      }]);

      const [cat] = storage.getCatList();

      expect(cat.isUnlocking).toBe(true);
      expect(cat.unlockProgress).toMatchObject({
        completed: 1,
        total: 3,
        currentAction: 'v3_return',
      });
      expect(cat.actionGenerationError).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears background unlock state when all secondary actions are already available', async () => {
    const { storage, setSyncQueueForTesting } = await import('../storage');
    setSyncQueueForTesting(syncQueue);
    storage.saveUserInfo({ username: 'alice', nickname: 'Alice', avatar: '' });
    storage.saveCatList([{
      id: 'cat-1',
      name: 'Miao',
      breed: '狸花',
      color: 'brown',
      source: 'uploaded',
      avatar: 'avatar-1',
      videoPath: 'video-1',
      createdAt: 1,
      isUnlocking: true,
      unlockProgress: {
        completed: 3,
        total: 3,
        currentAction: 'v4_fetch',
        failed: 0,
        updatedAt: Date.now(),
      },
      videoPaths: {
        v1_approach: 'video-1',
        v2_wait: 'video-2',
        v3_return: 'video-3',
        v4_fetch: 'video-4',
      },
    }]);

    const [cat] = storage.getCatList();

    expect(cat.isUnlocking).toBe(false);
    expect(cat.unlockProgress).toBeUndefined();
    expect(cat.actionGenerationError).toBeUndefined();
  });
});
