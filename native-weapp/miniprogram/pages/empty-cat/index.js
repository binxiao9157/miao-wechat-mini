const { authService } = require('../../services/auth');
const { navigateTo, reLaunch } = require('../../utils/nav');

Page({
  goCreate() {
    navigateTo(`/pages/create-companion/index${this.getRedemptionQuery()}`);
  },

  goUpload() {
    navigateTo(`/pages/upload-material/index${this.getRedemptionQuery()}`);
  },

  onLoad(options = {}) {
    this.redemptionAmount = Number(options.redemptionAmount || 0);
    this.setData({
      isRedemption: options.isRedemption === '1' && this.redemptionAmount > 0,
      redemptionText: this.redemptionAmount > 0 ? `${this.redemptionAmount} 积分兑换新伙伴` : ''
    });
  },

  getRedemptionQuery() {
    return this.redemptionAmount > 0 ? `?isRedemption=1&redemptionAmount=${this.redemptionAmount}` : '';
  },

  logout() {
    authService.logout();
    const app = getApp();
    app.globalData.user = null;
    app.globalData.isAuthenticated = false;
    reLaunch('/pages/login/index');
  }
});
