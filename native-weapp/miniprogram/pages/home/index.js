const { dataStore } = require('../../services/data-store');
const { authService } = require('../../services/auth');
const { reLaunch } = require('../../utils/nav');

Page({
  data: {
    cat: null
  },

  onShow() {
    this.setData({ cat: dataStore.getActiveCat() });
  },

  logout() {
    authService.logout();
    const app = getApp();
    app.globalData.user = null;
    app.globalData.isAuthenticated = false;
    reLaunch('/pages/login/index');
  }
});
