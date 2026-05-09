const { get } = require('../utils/request');
const { events } = require('../utils/event-bus');
const { authService } = require('./auth');
const { dataStore } = require('./data-store');

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
      const results = await Promise.allSettled([
        dataStore.syncCatsFromServer(),
        get('/api/v1/diaries'),
        get('/api/v1/letters'),
        get('/api/v1/points'),
        get('/api/v1/friends')
      ]);
      events.emit('data:synced', { timestamp: now, results });
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
