const { authService } = require('./services/auth');
const { syncManager } = require('./services/sync-manager');
const { events } = require('./utils/event-bus');

App({
  globalData: {
    user: null,
    isAuthenticated: false,
    isInitializing: true
  },

  async onLaunch() {
    events.on('auth:unauthorized', () => {
      this.globalData.user = null;
      this.globalData.isAuthenticated = false;
      wx.reLaunch({ url: '/pages/login/index' });
    });
    await this.bootstrapSession();
  },

  async onShow() {
    if (this.globalData.isAuthenticated) {
      syncManager.syncAll().catch((error) => {
        console.warn('[native] foreground sync failed:', error);
      });
    }
  },

  async bootstrapSession() {
    const token = authService.getToken();
    const cachedUser = authService.getCachedUser();

    if (!token || !cachedUser) {
      this.globalData.isInitializing = false;
      events.emit('auth:ready', { user: null });
      return;
    }

    this.globalData.user = cachedUser;
    this.globalData.isAuthenticated = true;

    try {
      const user = await authService.getCurrentUser();
      this.globalData.user = user;
      this.globalData.isAuthenticated = !!user;
      if (user) {
        await syncManager.syncAll();
      }
      events.emit('auth:ready', { user });
    } catch (error) {
      console.warn('[native] keep cached session after auth check failed:', error);
      events.emit('auth:ready', { user: cachedUser });
    } finally {
      this.globalData.isInitializing = false;
    }
  }
});
