const { authService } = require('../../services/auth');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    phone: '',
    code: '',
    password: '',
    showPassword: false,
    countdown: 0,
    saving: false,
    error: '',
    showSuccessToast: false
  },

  goBack() {
    safeBack('/pages/login/index');
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [field]: event.detail.value, error: '' });
  },

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  async sendCode() {
    const phone = this.data.phone.trim();
    if (!phone || phone.length !== 11) {
      this.setData({ error: '请输入正确的手机号' });
      return;
    }
    if (this.data.countdown > 0) return;
    try {
      await authService.sendResetCode(phone);
      wx.showToast({ title: '验证码已发送', icon: 'none' });
    } catch (error) {
      this.setData({ error: error.message || '验证码发送失败，请稍后重试' });
      return;
    }
    this.setData({ countdown: 60, error: '' });
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
    if (!phone || phone.length !== 11) {
      this.setData({ error: '请输入正确的手机号' });
      return;
    }
    if (!code) {
      this.setData({ error: '请输入验证码' });
      return;
    }
    if (!this.data.password || this.data.password.length < 6) {
      this.setData({ error: '新密码长度不能少于6位' });
      return;
    }
    this.setData({ saving: true, error: '' });
    try {
      await authService.resetPassword(phone, code, this.data.password);
      this.setData({ showSuccessToast: true });
      setTimeout(() => safeBack('/pages/login/index'), 1500);
    } catch (error) {
      this.setData({ error: error.message || '重置密码失败，请重试' });
    } finally {
      this.setData({ saving: false });
    }
  },

  onUnload() {
    clearInterval(this.countdownTimer);
  }
});
