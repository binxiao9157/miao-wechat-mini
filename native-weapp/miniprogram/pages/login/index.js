const { authService } = require('../../services/auth');
const { routeAfterAuth } = require('../../services/session-router');
const { navigateTo } = require('../../utils/nav');

Page({
  data: {
    username: '',
    password: '',
    showPassword: false,
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

  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  ensureAgreement() {
    if (this.data.agreed) return true;
    wx.showModal({
      title: '提示',
      content: '请先阅读并同意服务条款和隐私政策',
      showCancel: false
    });
    return false;
  },

  async handlePasswordLogin() {
    if (!this.ensureAgreement()) return;
    const username = this.data.username.trim();
    const password = this.data.password.trim();
    if (!username || !password) {
      this.setData({ error: '请输入用户名和密码' });
      return;
    }

    this.setData({ loading: true, error: '' });
    try {
      const user = await authService.passwordLogin(username, password);
      const app = getApp();
      app.globalData.user = user;
      app.globalData.isAuthenticated = true;
      await routeAfterAuth();
    } catch (error) {
      this.setData({ error: error.message || '登录失败，请检查用户名密码或服务器状态' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleWechatLogin() {
    if (!this.ensureAgreement()) return;
    this.setData({ loading: true, error: '' });
    try {
      const user = await authService.wechatLogin();
      const app = getApp();
      app.globalData.user = user;
      app.globalData.isAuthenticated = true;
      await routeAfterAuth();
    } catch (error) {
      this.setData({ error: error.message || '微信登录失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goRegister() {
    navigateTo('/pages/register/index');
  }
});
