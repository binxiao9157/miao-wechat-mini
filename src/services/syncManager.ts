import Taro from '@tarojs/taro';
import { storage } from './storage';
import { friendService } from './friendService';

class SyncManager {
  private lastSyncTime = 0;
  private syncing = false;
  private readonly COOLDOWN_MS = 30_000;

  async syncAll(): Promise<void> {
    if (this.syncing) return;
    const now = Date.now();
    if (now - this.lastSyncTime < this.COOLDOWN_MS) return;

    this.syncing = true;
    try {
      const username = storage.getUserInfo()?.username;
      if (!username) return;

      await Promise.allSettled([
        storage.syncFromServer(username),
        friendService.syncFriends(),
        friendService.syncFriendDiaries(),
      ]);
      Taro.eventCenter.trigger('data-synced', { timestamp: now });
    } finally {
      this.lastSyncTime = Date.now();
      this.syncing = false;
    }
  }

  forceSyncAll(): void {
    this.lastSyncTime = 0;
    this.syncAll();
  }
}

export const syncManager = new SyncManager();