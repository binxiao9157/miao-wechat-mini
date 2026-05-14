const { events } = require('../utils/event-bus');
const { authService } = require('./auth');
const { dataStore } = require('./data-store');
const { contentStore } = require('./content-store');
const { socialStore } = require('./social-store');

class SyncManager {
  constructor() {
    this.lastSyncTime = 0;
    this.syncing = false;
    this.cooldownMs = 30000;
  }

  async syncAll() {
    if (this.syncing) return;
    const now = Date.now();
    if (now - this.lastSyncTime < this.cooldownMs) return;

    const user = authService.getCachedUser();
    if (!user || !user.username) return;

    this.syncing = true;
    try {
      const pendingSyncResults = await contentStore.processPendingSyncTasks().catch((error) => {
        console.warn('[native] process pending sync tasks failed:', error);
        return [];
      });
      const results = await Promise.allSettled([
        dataStore.syncCatsFromServer(),
        contentStore.syncDiariesFromServer(),
        contentStore.syncLettersFromServer(),
        contentStore.syncPointsFromServer(),
        contentStore.syncNotificationsFromServer(),
        socialStore.syncFriends()
      ]);
      events.emit('data:synced', { timestamp: now, results, pendingSyncResults });
    } finally {
      this.lastSyncTime = Date.now();
      this.syncing = false;
    }
  }

  forceSyncAll() {
    this.lastSyncTime = 0;
    return this.syncAll();
  }
}

const syncManager = new SyncManager();

module.exports = {
  syncManager,
  SyncManager
};
