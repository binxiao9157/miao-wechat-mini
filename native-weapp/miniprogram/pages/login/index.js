const { authService } = require('../../services/auth');
const { routeAfterAuth } = require('../../services/session-router');
const { navigateTo, redirectTo } = require('../../utils/nav');
const { getItem } = require('../../utils/storage');

function getMiniProgramEnvVersion() {
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync();
    return info && info.miniProgram && info.miniProgram.envVersion;
  } catch {
    return 'release';
  }
  return 'release';
}

Page({
  data: {
    username: '',
    password: '',
    showPassword: false,
    agreed: false,
    loading: false,
    error: '',
    catImage: ''
  },

  onLoad() {
    const lastUsername = getItem('miao_last_username') || '';
    const lastCatImage = getItem('miao_last_cat_image') || '';
    this.setData({
      username: lastUsername || this.data.username,
      catImage: lastCatImage || this.data.catImage
    });
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

  getPhoneLoginError(message) {
    const msg = String(message || '');
    if (msg.includes('WECHAT_NOT_CONFIGURED')) return '手机号登录暂未开通，请使用其他登录方式';
    if (msg.includes('PHONE_LOGIN_FAILED')) return '微信手机号验证失败，请重试或使用其他登录方式';
    if (msg.includes('WECHAT_UPSTREAM_ERROR')) return '微信服务暂时不可用，请稍后重试';
    if (msg.includes('no permission') || msg.includes('deny')) return '小程序未开通手机号登录能力，请使用其他登录方式';
    if (msg.includes('timeout') || msg.includes('超时')) return '网络超时，请检查网络后重试';
    return msg || '手机号登录失败，请重试';
  },

  handlePhoneLoginTap() {
    if (!this.ensureAgreement()) return;
    clearTimeout(this.phoneLoginTimer);
    this.setData({ loading: true, error: '' });
    this.phoneLoginTimer = setTimeout(() => {
      this.setData({ loading: false });
      wx.showModal({
        title: '提示',
        content: '获取手机号失败，请确认小程序已开通手机号登录能力，或在微信真机上重试。也可以使用其他登录方式。',
        showCancel: false,
        confirmText: '我知道了'
      });
    }, 5000);
  },

  async handlePhoneLogin(event) {
    clearTimeout(this.phoneLoginTimer);
    if (!this.ensureAgreement()) return;
    const detail = event.detail || {};
    if (detail.errMsg && detail.errMsg.includes('fail')) {
      this.setData({ loading: false });
      wx.showModal({
        title: '提示',
        content: this.getPhoneLoginError(detail.errMsg),
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    const canUseDevFallback = getMiniProgramEnvVersion() === 'develop';
    const phoneCode = detail.code || (canUseDevFallback ? (detail.cloudID || `dev_phone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`) : '');
    if (!phoneCode) {
      this.setData({ loading: false, error: '获取手机号授权失败' });
      return;
    }

    this.setData({ loading: true, error: '' });
    try {
      const user = await authService.phoneLogin(phoneCode);
      const app = getApp();
      app.globalData.user = user;
      app.globalData.isAuthenticated = true;
      if (user.isNewUser || (user.nickname || '').startsWith('喵星人_')) {
        redirectTo('/pages/set-nickname/index');
        return;
      }
      await routeAfterAuth();
    } catch (error) {
      this.setData({ error: this.getPhoneLoginError(error.message) });
    } finally {
      this.setData({ loading: false });
    }
  },

  goRegister() {
    navigateTo('/pages/register/index');
  },

  goResetPassword() {
    navigateTo('/pages/reset-password/index');
  },

  goPrivacyPolicy() {
    navigateTo('/pages/privacy-policy/index');
  },

  goTerms() {
    navigateTo('/pages/terms-of-service/index');
  }
});
