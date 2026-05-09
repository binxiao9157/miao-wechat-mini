const { authService } = require('../../services/auth');
const { routeAfterAuth } = require('../../services/session-router');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    agreed: false,
    loading: false,
    error: ''
  },

  onUsernameInput(event) {
    this.setData({ username: event.detail.value });
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value });
  },

  onConfirmInput(event) {
    this.setData({ confirmPassword: event.detail.value });
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  goBack() {
    safeBack('/pages/login/index');
  },

  validate() {
    const username = this.data.username.trim();
    const password = this.data.password.trim();
    const confirmPassword = this.data.confirmPassword.trim();
    if (!this.data.agreed) return '请先阅读并勾选同意服务条款与隐私政策';
    if (!username || !password || !confirmPassword) return '请填写完整信息';
    if (password !== confirmPassword) return '两次输入的密码不一致';
    if (password.length < 6 || password.length > 20) return '密码长度需为 6-20 位';
    return '';
  },

  async handleRegister() {
    const validationError = this.validate();
    if (validationError) {
      this.setData({ error: validationError });
      return;
    }

    this.setData({ loading: true, error: '' });
    try {
      const user = await authService.register({
        username: this.data.username.trim(),
        password: this.data.password.trim(),
        nickname: this.data.username.trim(),
        avatar: ''
      });
      const app = getApp();
      app.globalData.user = user;
      app.globalData.isAuthenticated = true;
      await routeAfterAuth();
    } catch (error) {
      this.setData({ error: error.message || '注册失败，请稍后重试' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
