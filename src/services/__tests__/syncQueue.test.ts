import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setItem } from '../../utils/storageAdapter';

vi.mock('../storage', () => ({
  storage: {
    getUserInfo: vi.fn(() => ({ username: 'alice' })),
  },
  serverSync: {
    syncDiaryToServer: vi.fn(async () => undefined),
    deleteDiaryFromServer: vi.fn(async () => undefined),
    syncLetterToServer: vi.fn(async () => undefined),
    deleteLetterFromServer: vi.fn(async () => undefined),
    syncPointsToServer: vi.fn(async () => undefined),
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
});
