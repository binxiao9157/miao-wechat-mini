const { authService } = require('../../services/auth');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    phone: '',
    code: '',
    password: '',
    showPassword: false,
    countdown: 0,
    saving: false
  },

  goBack() {
    safeBack('/pages/login/index');
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [field]: event.detail.value });
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  sendCode() {
    const phone = this.data.phone.trim();
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }
    if (this.data.countdown > 0) return;
    wx.showToast({ title: '验证码已发送', icon: 'none' });
    this.setData({ countdown: 60 });
    clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        clearInterval(this.countdownTimer);
        this.setData({ countdown: 0 });
        return;
      }
      this.setData({ countdown: next });
    }, 1000);
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
