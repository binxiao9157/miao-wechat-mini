const { authService } = require('../../services/auth');
const { safeBack, navigateTo } = require('../../utils/nav');

Page({
  data: {
    nickname: '',
    avatar: '',
    saving: false
  },

  onShow() {
    const user = authService.getCachedUser() || {};
    this.setData({
      nickname: user.nickname || user.username || '',
      avatar: user.avatar || ''
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onNicknameInput(event) {
    this.setData({ nickname: event.detail.value });
  },

  onAvatarInput(event) {
    this.setData({ avatar: event.detail.value });
  },

  async save() {
    const nickname = this.data.nickname.trim();
    if (nickname.length < 2 || nickname.length > 12) {
      wx.showToast({ title: '昵称需为 2-12 个字符', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await authService.updateProfile({ nickname, avatar: this.data.avatar.trim() });
      wx.showToast({ title: '已保存', icon: 'success' });
      safeBack('/pages/profile/index');
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  changePassword() {
    navigateTo('/pages/change-password/index');
  }
});
