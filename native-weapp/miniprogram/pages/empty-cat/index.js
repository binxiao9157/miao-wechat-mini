const { authService } = require('../../services/auth');
const { reLaunch } = require('../../utils/nav');

Page({
  showNext() {
    wx.showToast({ title: '阶段 2 将迁移猫咪主链路', icon: 'none' });
  },

  logout() {
    authService.logout();
    const app = getApp();
    app.globalData.user = null;
    app.globalData.isAuthenticated = false;
    reLaunch('/pages/login/index');
  }
});
