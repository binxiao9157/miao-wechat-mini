const { authService } = require('../../services/auth');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    phone: '',
    code: '',
    password: '',
    saving: false
  },

  goBack() {
    safeBack('/pages/login/index');
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [field]: event.detail.value });
  },

  async submit() {
    const phone = this.data.phone.trim();
    const code = this.data.code.trim();
    if (!phone || !code || this.data.password.length < 6) {
      wx.showToast({ title: '请输入手机号、验证码和新密码', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await authService.resetPassword(phone, code, this.data.password);
      wx.showToast({ title: '已重置', icon: 'success' });
      safeBack('/pages/login/index');
    } catch (error) {
      wx.showToast({ title: error.message || '重置失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
