const { socialStore } = require('../../services/social-store');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    invite: null,
    loading: false
  },

  onShow() {
    if (!this.data.invite) this.createInvite();
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  async createInvite() {
    this.setData({ loading: true });
    try {
      const invite = await socialStore.createInvite();
      this.setData({ invite });
    } catch (error) {
      wx.showToast({ title: error.message || '创建失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  copyCode() {
    const code = this.data.invite && this.data.invite.code;
    if (!code) return;
    wx.setClipboardData({ data: code });
  }
});
