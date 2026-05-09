const { authService } = require('../../services/auth');
const { reLaunch, safeBack } = require('../../utils/nav');

Page({
  data: {
    nickname: '',
    saving: false
  },

  onInput(event) {
    this.setData({ nickname: event.detail.value });
  },

  goBack() {
    safeBack('/pages/login/index');
  },

  async submit() {
    const nickname = this.data.nickname.trim();
    if (nickname.length < 2 || nickname.length > 12) {
      wx.showToast({ title: '昵称需为 2-12 个字符', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await authService.updateProfile({ nickname });
      reLaunch('/pages/home/index');
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  skip() {
    reLaunch('/pages/home/index');
  }
});
