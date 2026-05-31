import { beforeEach, describe, expect, it, vi } from 'vitest';
import Taro from '@tarojs/taro';

vi.mock('../storage', () => ({
  storage: {
    getUserInfo: vi.fn(() => ({ username: 'alice' })),
    syncFromServer: vi.fn(async () => ({ success: true, sections: [] })),
  },
}));

vi.mock('../friendService', () => ({
  friendService: {
    syncFriends: vi.fn(async () => []),
    syncFriendDiaries: vi.fn(async () => []),
  },
}));

describe('syncManager', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns the same in-flight sync result to concurrent callers', async () => {
    const { syncManager } = await import('../syncManager');
    const { storage } = await import('../storage');
    let releaseSync!: () => void;
    vi.mocked(storage.syncFromServer).mockImplementationOnce(
      () => new Promise(resolve => {
        releaseSync = () => resolve({ success: true, sections: [] });
      }),
    );

    const first = syncManager.syncAll();
    const second = syncManager.syncAll();
    releaseSync();

    await expect(first).resolves.toMatchObject({ success: true, skipped: false });
    await expect(second).resolves.toMatchObject({ success: true, skipped: false });
    expect(storage.syncFromServer).toHaveBeenCalledTimes(1);
  });

  it('returns a skipped result during cooldown', async () => {
    const { syncManager } = await import('../syncManager');

    await syncManager.syncAll();
    const result = await syncManager.syncAll();

    expect(result).toMatchObject({
      success: true,
      skipped: true,
      reason: 'cooldown',
    });
  });

  it('reports failed sync sections and does not emit data-synced', async () => {
    const { syncManager } = await import('../syncManager');
    const { friendService } = await import('../friendService');
    vi.mocked(friendService.syncFriends).mockRejectedValueOnce(new Error('friends offline'));

    const result = await syncManager.forceSyncAll();

    expect(result.success).toBe(false);
    expect(result.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'friends',
          success: false,
          error: 'friends offline',
        }),
      ]),
    );
    expect(Taro.eventCenter.trigger).toHaveBeenCalledWith('data-sync-failed', result);
    expect(Taro.eventCenter.trigger).not.toHaveBeenCalledWith('data-synced', expect.anything());
  });

  it('does not let anonymous skipped sync consume cooldown', async () => {
    const { syncManager } = await import('../syncManager');
    const { storage } = await import('../storage');
    vi.mocked(storage.getUserInfo)
      .mockImplementationOnce(() => null)
      .mockImplementation(() => ({ username: 'alice' } as any));

    const anonymous = await syncManager.syncAll();
    const authenticated = await syncManager.syncAll();

    expect(anonymous).toMatchObject({ skipped: true, reason: 'anonymous' });
    expect(authenticated).toMatchObject({ skipped: false, success: true });
    expect(storage.syncFromServer).toHaveBeenCalledTimes(1);
  });
});
