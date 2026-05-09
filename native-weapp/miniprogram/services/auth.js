const { request } = require('../utils/request');
const { getItem, setItem, removeItem } = require('../utils/storage');
const { STORAGE_KEYS } = require('../types/models');

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
