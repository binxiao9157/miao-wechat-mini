const { socialStore } = require('../../services/social-store');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    code: '',
    invite: null,
    inviterInitial: 'M',
    showSuccess: false,
    loading: false
  },

  onLoad(options = {}) {
    if (options.invite) {
      const code = socialStore.extractInviteCode(options.invite);
      this.setData({ code });
      this.lookup(code);
    }
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onInput(event) {
    this.setData({ code: event.detail.value.trim() });
  },

  async lookup(codeOverride) {
    const code = socialStore.extractInviteCode(codeOverride || this.data.code);
    if (!code) return;
    this.setData({ loading: true });
    try {
      const invite = await socialStore.getInvite(code);
      const inviterName = invite && invite.inviter && invite.inviter.nickname
        ? invite.inviter.nickname
        : (invite && invite.ownerId) || 'M';
      this.setData({ invite, code, inviterInitial: String(inviterName).slice(0, 1).toUpperCase() });
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
      this.setData({ showSuccess: true });
      setTimeout(() => safeBack('/pages/profile/index'), 1200);
    } catch (error) {
      wx.showToast({ title: error.message || '添加失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
