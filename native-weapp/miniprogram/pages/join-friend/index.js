const { socialStore } = require('../../services/social-store');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    code: '',
    invite: null,
    loading: false
  },

  onLoad(options = {}) {
    if (options.invite) {
      this.setData({ code: options.invite });
      this.lookup(options.invite);
    }
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onInput(event) {
    this.setData({ code: event.detail.value.trim() });
  },

  async lookup(codeOverride) {
    const code = String(codeOverride || this.data.code || '').trim();
    if (!code) return;
    this.setData({ loading: true });
    try {
      const invite = await socialStore.getInvite(code);
      this.setData({ invite, code });
    } catch (error) {
      wx.showToast({ title: error.message || '邀请码无效', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async accept() {
    const code = String(this.data.code || '').trim();
    if (!code) return;
    this.setData({ loading: true });
    try {
      await socialStore.acceptInvite(code);
      wx.showToast({ title: '已添加好友', icon: 'success' });
      safeBack('/pages/profile/index');
    } catch (error) {
      wx.showToast({ title: error.message || '添加失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
