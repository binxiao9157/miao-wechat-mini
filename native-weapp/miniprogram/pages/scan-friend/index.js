const { socialStore } = require('../../services/social-store');
const { safeBack, navigateTo } = require('../../utils/nav');

Page({
  data: {
    friends: [],
    diaries: []
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const friends = await socialStore.syncFriends().catch(() => socialStore.getFriends());
    const diaries = await socialStore.getFriendDiaries().catch(() => []);
    this.setData({ friends, diaries });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  invite() {
    navigateTo('/pages/add-friend-qr/index');
  },

  join() {
    navigateTo('/pages/join-friend/index');
  },

  scan() {
    wx.scanCode({
      success: (res) => {
        const code = String(res.result || '').trim();
        if (code) navigateTo(`/pages/join-friend/index?invite=${encodeURIComponent(code)}`);
      }
    });
  }
});
