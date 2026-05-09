const { authService } = require('../../services/auth');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    currentPassword: '',
    password: '',
    confirmPassword: '',
    saving: false
  },

  goBack() {
    safeBack('/pages/edit-profile/index');
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [field]: event.detail.value });
  },

  async save() {
    const { currentPassword, password, confirmPassword } = this.data;
    if (password.length < 6 || password.length > 20) {
      wx.showToast({ title: '密码需为 6-20 位', icon: 'none' });
      return;
    }
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await authService.setPassword(currentPassword, password);
      wx.showToast({ title: '已更新', icon: 'success' });
      safeBack('/pages/edit-profile/index');
    } catch (error) {
      wx.showToast({ title: error.message || '修改失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
