const { authService } = require('../../services/auth');
const { navigateTo, reLaunch } = require('../../utils/nav');

Page({
  goCreate() {
    navigateTo('/pages/create-companion/index');
  },

  goUpload() {
    navigateTo('/pages/upload-material/index');
  },

  logout() {
    authService.logout();
    const app = getApp();
    app.globalData.user = null;
    app.globalData.isAuthenticated = false;
    reLaunch('/pages/login/index');
  }
});
