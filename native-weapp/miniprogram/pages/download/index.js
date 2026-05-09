const { safeBack } = require('../../utils/nav');

Page({
  goBack() {
    safeBack('/pages/profile/index');
  },

  comingSoon() {
    wx.showToast({ title: '即将上线，敬请期待', icon: 'none' });
  }
});
