const { request, patch } = require('../utils/request');
const { getItem, setItem, removeItem } = require('../utils/storage');
const { STORAGE_KEYS } = require('../types/models');

const WECHAT_DEV_OPENID_KEY = 'miao_wechat_dev_openid';

function normalizeUser(raw = {}) {
  return {
    username: raw.username || '',
    nickname: raw.nickname || raw.username || 'Miao 用户',
    avatar: raw.avatar || '',
    passwordSet: !!raw.passwordSet,
    openidBound: !!raw.openidBound,
    phone: raw.phone
  };
}

function persistAuth(token, user) {
  setItem(STORAGE_KEYS.TOKEN, token);
  setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  if (user && user.username) {
    setItem(STORAGE_KEYS.LAST_USERNAME, user.username);
  }
}

function getStableWechatDevOpenid() {
  const cached = getItem(WECHAT_DEV_OPENID_KEY);
  if (cached) return cached;
  const generated = `dev_native_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  setItem(WECHAT_DEV_OPENID_KEY, generated);
  return generated;
}

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject
    });
  });
}

const authService = {
  getToken() {
    return getItem(STORAGE_KEYS.TOKEN);
  },

  getCachedUser() {
    const raw = getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async getCurrentUser() {
    if (!this.getToken()) return null;
    const res = await request({ url: '/api/v1/me', method: 'GET', timeout: 10000 });
    const user = normalizeUser(res.data && res.data.user);
    persistAuth(this.getToken() || '', user);
    return user;
  },

  async passwordLogin(username, password) {
    const res = await request({
      url: '/api/v1/auth/password-login',
      method: 'POST',
      data: { username, password },
      timeout: 15000
    });
    const token = res.data && res.data.token;
    if (!token) throw new Error('登录失败：服务端未返回 token');
    const user = normalizeUser(res.data.user);
    persistAuth(token, user);
    return user;
  },

  async register(info) {
    const username = String(info.username || '').trim();
    const password = String(info.password || '').trim();
    const nickname = String(info.nickname || username).trim();

    if (!username || !password) throw new Error('用户名和密码不能为空');
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
      throw new Error('用户名需为 3-32 位字母、数字、下划线、短横线或点号');
    }
    if (password.length < 6 || password.length > 20) {
      throw new Error('密码长度需为 6-20 位');
    }

    const res = await request({
      url: '/api/v1/auth/register',
      method: 'POST',
      data: {
        username,
        password,
        nickname,
        avatar: info.avatar || ''
      },
      timeout: 15000
    });
    const token = res.data && res.data.token;
    if (!token) throw new Error('注册失败：服务端未返回 token');
    const user = normalizeUser(res.data.user);
    persistAuth(token, user);
    return user;
  },

  async wechatLogin(profile = {}) {
    const loginRes = await wxLogin();
    if (!loginRes.code) throw new Error('微信登录失败：未获取到 code');

    const res = await request({
      url: '/api/v1/auth/wechat-login',
      method: 'POST',
      data: {
        code: loginRes.code,
        nickname: profile.nickname,
        avatar: profile.avatar,
        devOpenid: getStableWechatDevOpenid()
      },
      timeout: 15000
    });
    const token = res.data && res.data.token;
    if (!token) throw new Error('微信登录失败：服务端未返回 token');
    const user = normalizeUser(res.data.user);
    persistAuth(token, user);
    return user;
  },

  async phoneLogin(phoneCode) {
    const loginRes = await wxLogin();
    if (!loginRes.code) throw new Error('手机号登录失败：未获取到微信 code');

    const res = await request({
      url: '/api/v1/auth/phone-login',
      method: 'POST',
      data: { phoneCode, loginCode: loginRes.code },
      timeout: 15000
    });
    const token = res.data && res.data.token;
    if (!token) throw new Error('手机号登录失败：服务端未返回 token');
    const user = normalizeUser(res.data.user);
    persistAuth(token, user);
    return { ...user, isNewUser: res.data.isNewUser };
  },

  async updateProfile(profile = {}) {
    const res = await patch('/api/v1/me', profile, { timeout: 15000 });
    const user = normalizeUser(res.data && res.data.user);
    persistAuth(this.getToken() || '', user);
    return user;
  },

  async setPassword(currentPassword, password) {
    const res = await request({
      url: '/api/v1/auth/set-password',
      method: 'POST',
      data: { currentPassword, password },
      timeout: 15000
    });
    const user = this.getCachedUser();
    if (user) persistAuth(this.getToken() || '', { ...user, passwordSet: true });
    return res.data;
  },

  async resetPassword(phone, code, newPassword) {
    const res = await request({
      url: '/api/v1/auth/reset-password',
      method: 'POST',
      data: { phone, code, newPassword },
      timeout: 15000
    });
    return res.data;
  },

  async sendResetCode(phone) {
    const res = await request({
      url: '/api/v1/auth/send-reset-code',
      method: 'POST',
      data: { phone },
      timeout: 15000
    });
    return res.data;
  },

  logout() {
    removeItem(STORAGE_KEYS.TOKEN);
    removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

module.exports = {
  authService,
  normalizeUser,
  persistAuth
};
