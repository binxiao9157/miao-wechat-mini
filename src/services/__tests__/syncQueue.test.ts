import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setItem } from '../../utils/storageAdapter';

vi.mock('../storage', () => ({
  storage: {
    getUserInfo: vi.fn(() => ({ username: 'alice' })),
    clearDeleteTombstone: vi.fn(),
  },
  serverSync: {
    syncDiaryToServer: vi.fn(async () => undefined),
    deleteDiaryFromServer: vi.fn(async () => undefined),
    syncLetterToServer: vi.fn(async () => undefined),
    deleteLetterFromServer: vi.fn(async () => undefined),
    syncPointsToServer: vi.fn(async () => undefined),
    syncPointTransactionToServer: vi.fn(async () => undefined),
    syncCatToServer: vi.fn(async () => undefined),
    deleteCatFromServer: vi.fn(async () => undefined),
  },
}));

describe('syncQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('flushes an enqueued diary through typed serverSync', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'hello' },
    });

    await syncQueue.flushNow();

    expect(serverSync.syncDiaryToServer).toHaveBeenCalledWith('alice', {
      id: 'd1',
      content: 'hello',
    });
  });

  it('hydrates pending tasks before flushing', async () => {
    setItem('miao_pending_sync_tasks', JSON.stringify([
      { type: 'points', action: 'upsert', payload: { total: 10 } },
    ]));
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');

    await syncQueue.flushNow();

    expect(serverSync.syncPointsToServer).toHaveBeenCalledWith('alice', { total: 10 });
  });

  it('flushes points transactions through the atomic server endpoint', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');

    syncQueue.enqueue({
      type: 'points',
      id: 'daily-login:2026-06-01',
      action: 'transaction',
      payload: {
        id: 'daily-login:2026-06-01',
        type: 'earn',
        amount: 10,
        reason: '每日登录奖励',
        timestamp: Date.now(),
      },
    });

    await syncQueue.flushNow();

    expect(serverSync.syncPointTransactionToServer).toHaveBeenCalledWith('alice', {
      id: 'daily-login:2026-06-01',
      type: 'earn',
      amount: 10,
      reason: '每日登录奖励',
      timestamp: expect.any(Number),
    });
  });

  it('resolves every concurrent flush caller when a flush is already running', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');
    let releaseSync!: () => void;
    vi.mocked(serverSync.syncDiaryToServer).mockImplementationOnce(
      () => new Promise<void>(resolve => { releaseSync = resolve; }),
    );

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'hello' },
    });

    const firstFlush = syncQueue.flushNow();
    await vi.waitFor(() => {
      expect(serverSync.syncDiaryToServer).toHaveBeenCalled();
    });
    let secondResolved = false;
    let thirdResolved = false;
    const secondFlush = syncQueue.flushNow().then(() => { secondResolved = true; });
    const thirdFlush = syncQueue.flushNow().then(() => { thirdResolved = true; });

    releaseSync();
    await firstFlush;
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(secondResolved).toBe(true);
    expect(thirdResolved).toBe(true);
    await Promise.all([secondFlush, thirdFlush]);
  });

  it('keeps a newer same-key task enqueued when an older in-flight task succeeds', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');
    let releaseSync!: () => void;
    vi.mocked(serverSync.syncDiaryToServer).mockImplementationOnce(
      () => new Promise<void>(resolve => { releaseSync = resolve; }),
    );

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'old' },
    });

    const flush = syncQueue.flushNow();
    await vi.waitFor(() => {
      expect(serverSync.syncDiaryToServer).toHaveBeenCalledWith('alice', { id: 'd1', content: 'old' });
    });

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'new' },
    });
    releaseSync();
    await flush;

    expect(syncQueue.getPendingTasks()).toMatchObject([
      {
        type: 'diary',
        action: 'upsert',
        id: 'd1',
        payload: { id: 'd1', content: 'new' },
      },
    ]);
  });

  it('keeps a newer same-key task when an older in-flight task fails', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');
    let rejectSync!: (error: Error) => void;
    vi.mocked(serverSync.syncDiaryToServer).mockImplementationOnce(
      () => new Promise<void>((_resolve, reject) => { rejectSync = reject; }),
    );

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'old' },
    });

    const flush = syncQueue.flushNow();
    await vi.waitFor(() => {
      expect(serverSync.syncDiaryToServer).toHaveBeenCalledWith('alice', { id: 'd1', content: 'old' });
    });

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'new' },
    });
    rejectSync(new Error('offline'));
    await flush;

    expect(syncQueue.getPendingTasks()).toMatchObject([
      {
        type: 'diary',
        action: 'upsert',
        id: 'd1',
        retries: 0,
        payload: { id: 'd1', content: 'new' },
      },
    ]);
  });

  it('drops malformed persisted delete tasks instead of deleting with an empty id', async () => {
    setItem('miao_pending_sync_tasks', JSON.stringify([
      { type: 'diary', action: 'delete' },
      { type: 'letter', action: 'delete', id: '' },
      { type: 'cat', action: 'delete' },
    ]));
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');

    await syncQueue.flushNow();

    expect(serverSync.deleteDiaryFromServer).not.toHaveBeenCalled();
    expect(serverSync.deleteLetterFromServer).not.toHaveBeenCalled();
    expect(serverSync.deleteCatFromServer).not.toHaveBeenCalled();
  });

  it('exposes exhausted tasks after retry limit is reached', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');
    vi.mocked(serverSync.syncDiaryToServer).mockRejectedValue(new Error('offline'));

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'hello' },
    });

    await syncQueue.flushNow();
    await syncQueue.flushNow();
    await syncQueue.flushNow();

    expect(syncQueue.getPendingTasks()).toHaveLength(0);
    expect(syncQueue.getExhaustedTasks()).toMatchObject([
      {
        type: 'diary',
        action: 'upsert',
        id: 'd1',
        retries: 3,
        lastError: 'offline',
      },
    ]);
  });

  it('can retry exhausted tasks without exposing internal mutable state', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');
    vi.mocked(serverSync.syncDiaryToServer).mockRejectedValue(new Error('offline'));

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'hello' },
    });
    await syncQueue.flushNow();
    await syncQueue.flushNow();
    await syncQueue.flushNow();

    const exhausted = syncQueue.getExhaustedTasks();
    exhausted[0].payload.content = 'mutated outside';

    syncQueue.retryExhaustedTasks();

    expect(syncQueue.getExhaustedTasks()).toHaveLength(0);
    expect(syncQueue.getPendingTasks()).toMatchObject([
      {
        type: 'diary',
        action: 'upsert',
        id: 'd1',
        retries: 0,
        payload: { id: 'd1', content: 'hello' },
      },
    ]);
  });

  it('schedules a flush after retrying exhausted tasks', async () => {
    vi.useFakeTimers();
    try {
      const { syncQueue } = await import('../syncQueue');
      const { serverSync } = await import('../storage');
      const syncDiaryToServer = vi.mocked(serverSync.syncDiaryToServer);
      syncDiaryToServer.mockRejectedValue(new Error('offline'));

      syncQueue.enqueue({
        type: 'diary',
        action: 'upsert',
        id: 'd1',
        payload: { id: 'd1', content: 'hello' },
      });
      await syncQueue.flushNow();
      await syncQueue.flushNow();
      await syncQueue.flushNow();

      syncDiaryToServer.mockResolvedValue(undefined);
      syncQueue.retryExhaustedTasks();
      await vi.advanceTimersByTimeAsync(5000);

      expect(syncDiaryToServer).toHaveBeenCalledTimes(4);
      expect(syncQueue.getPendingTasks()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('backs off automatic retries after a failed task', async () => {
    vi.useFakeTimers();
    try {
      const { syncQueue } = await import('../syncQueue');
      const { serverSync } = await import('../storage');
      const syncDiaryToServer = vi.mocked(serverSync.syncDiaryToServer);
      syncDiaryToServer.mockRejectedValue(new Error('offline'));

      syncQueue.enqueue({
        type: 'diary',
        action: 'upsert',
        id: 'd1',
        payload: { id: 'd1', content: 'hello' },
      });

      await syncQueue.flushNow();
      expect(syncDiaryToServer).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(syncDiaryToServer).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(syncDiaryToServer).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears only exhausted tasks', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync } = await import('../storage');
    vi.mocked(serverSync.syncDiaryToServer).mockRejectedValue(new Error('offline'));

    syncQueue.enqueue({
      type: 'diary',
      action: 'upsert',
      id: 'd1',
      payload: { id: 'd1', content: 'hello' },
    });
    await syncQueue.flushNow();
    await syncQueue.flushNow();
    await syncQueue.flushNow();
    syncQueue.enqueue({
      type: 'points',
      action: 'upsert',
      payload: { total: 10 },
    });

    syncQueue.clearExhaustedTasks();

    expect(syncQueue.getExhaustedTasks()).toHaveLength(0);
    expect(syncQueue.getPendingTasks()).toMatchObject([
      {
        type: 'points',
        action: 'upsert',
        payload: { total: 10 },
      },
    ]);
  });

  it('clears delete tombstone after remote delete succeeds', async () => {
    const { syncQueue } = await import('../syncQueue');
    const { serverSync, storage } = await import('../storage');

    syncQueue.enqueue({
      type: 'diary',
      action: 'delete',
      id: 'd1',
    });

    await syncQueue.flushNow();

    expect(serverSync.deleteDiaryFromServer).toHaveBeenCalledWith('alice', 'd1');
    expect(storage.clearDeleteTombstone).toHaveBeenCalledWith('diary', 'd1');
  });
});
