const { API_BASE_URL } = require('../../config/env');
const { get } = require('../../utils/request');
const { authService } = require('../../services/auth');
const { syncManager } = require('../../services/sync-manager');
const { events } = require('../../utils/event-bus');

Page({
  data: {
    statusBarHeight: 0,
    apiBaseUrl: API_BASE_URL,
    authLabel: '检查中',
    syncLabel: '未同步',
    checking: false,
    syncing: false
  },

  onLoad() {
    const info = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: info.statusBarHeight || 0 });
    this.refreshAuthLabel();

    this.handleAuthReady = () => this.refreshAuthLabel();
    events.on('auth:ready', this.handleAuthReady);
    events.on('auth:unauthorized', this.handleAuthReady);
  },

  onUnload() {
    if (this.handleAuthReady) {
      events.off('auth:ready', this.handleAuthReady);
      events.off('auth:unauthorized', this.handleAuthReady);
    }
  },

  refreshAuthLabel() {
    const user = authService.getCachedUser();
    this.setData({
      authLabel: user ? `${user.nickname || user.username} 已登录` : '未登录'
    });
  },

  async handleCheckHealth() {
    this.setData({ checking: true });
    try {
      const res = await get('/api/health', { timeout: 10000 });
      wx.showToast({ title: res.data && res.data.status === 'ok' ? '服务正常' : '已响应', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '服务检查失败', icon: 'none' });
    } finally {
      this.setData({ checking: false });
    }
  },

  async handleSync() {
    this.setData({ syncing: true, syncLabel: '同步中' });
    try {
      await syncManager.forceSyncAll();
      this.setData({ syncLabel: '已触发同步' });
      wx.showToast({ title: '同步完成', icon: 'success' });
    } catch (error) {
      this.setData({ syncLabel: '同步失败' });
      wx.showToast({ title: error.message || '同步失败', icon: 'none' });
    } finally {
      this.setData({ syncing: false });
    }
  }
});
