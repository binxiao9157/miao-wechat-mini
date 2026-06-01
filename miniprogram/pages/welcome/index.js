const { authService } = require('../../services/auth');
const { routeAfterAuth } = require('../../services/session-router');
const { events } = require('../../utils/event-bus');
const { reLaunch } = require('../../utils/nav');

Page({
  data: {},

  onLoad() {
    this.didRoute = false;
    this.handleAuthReady = () => this.route();
    events.on('auth:ready', this.handleAuthReady);
    setTimeout(() => this.route(), 500);
  },

  onUnload() {
    if (this.handleAuthReady) {
      events.off('auth:ready', this.handleAuthReady);
    }
  },

  async route() {
    if (this.didRoute) return;
    const app = getApp();
    if (app.globalData && app.globalData.isInitializing) return;
    this.didRoute = true;

    const user = authService.getCachedUser();
    if (!user || !authService.getToken()) {
      reLaunch('/pages/login/index');
      return;
    }
    await routeAfterAuth();
  }
});
