import Taro from '@tarojs/taro';
import { request } from '../utils/httpAdapter';
import { getItem, removeItem, setItem } from '../utils/storageAdapter';
import { UserInfo } from './storage';

const TOKEN_KEY = 'miao_auth_token';
const CURRENT_USER_KEY = 'miao_current_user';
const WECHAT_DEV_OPENID_KEY = 'miao_wechat_dev_openid';

function persistAuth(token: string, user: UserInfo) {
  setItem(TOKEN_KEY, token);
  setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function normalizeUser(raw: any, fallbackPassword?: string): UserInfo {
  return {
    username: raw?.username || '',
    nickname: raw?.nickname || raw?.username || 'Miao 用户',
    avatar: raw?.avatar || '',
    password: fallbackPassword,
    passwordSet: !!raw?.passwordSet || !!fallbackPassword,
    openidBound: !!raw?.openidBound,
    phone: raw?.phone,
  };
}

function getStableWechatDevOpenid(): string {
  const cached = getItem(WECHAT_DEV_OPENID_KEY);
  if (cached) return cached;

  const currentUserRaw = getItem(CURRENT_USER_KEY);
  if (currentUserRaw) {
    try {
      const currentUser = JSON.parse(currentUserRaw);
      if (typeof currentUser?.username === 'string' && currentUser.username.startsWith('wx_dev_')) {
        const legacyOpenid = currentUser.username.replace(/^wx_/, '');
        setItem(WECHAT_DEV_OPENID_KEY, legacyOpenid);
        return legacyOpenid;
      }
    } catch {}
  }

  const generated = `dev_mini_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  setItem(WECHAT_DEV_OPENID_KEY, generated);
  return generated;
}

export const authService = {
  getToken() {
    return getItem(TOKEN_KEY);
  },

  getCachedUser(): UserInfo | null {
    const raw = getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async getCurrentUser(): Promise<UserInfo | null> {
    if (!this.getToken()) return null;
    const res = await request({ url: '/api/v1/me', method: 'GET', timeout: 10000 });
    const user = normalizeUser(res.data?.user);
    persistAuth(this.getToken() || '', user);
    return user;
  },

  async passwordLogin(username: string, password: string): Promise<UserInfo> {
    const res = await request({
      url: '/api/v1/auth/password-login',
      method: 'POST',
      data: { username, password },
      timeout: 15000,
    });
    const token = res.data?.token;
    if (!token) throw new Error('登录失败：服务端未返回 token');
    const user = normalizeUser(res.data?.user, password);
    persistAuth(token, user);
    return user;
  },

  async register(info: UserInfo): Promise<UserInfo> {
    const res = await request({
      url: '/api/v1/auth/register',
      method: 'POST',
      data: info,
      timeout: 15000,
    });
    const token = res.data?.token;
    if (!token) throw new Error('注册失败：服务端未返回 token');
    const user = normalizeUser(res.data?.user, info.password);
    persistAuth(token, user);
    return user;
  },

  async wechatLogin(profile?: Partial<UserInfo>): Promise<UserInfo> {
    const loginRes = await Taro.login();
    if (!loginRes.code) throw new Error('微信登录失败：未获取到 code');
    const res = await request({
      url: '/api/v1/auth/wechat-login',
      method: 'POST',
      data: {
        code: loginRes.code,
        nickname: profile?.nickname,
        avatar: profile?.avatar,
        devOpenid: getStableWechatDevOpenid(),
      },
      timeout: 15000,
    });
    const token = res.data?.token;
    if (!token) throw new Error('微信登录失败：服务端未返回 token');
    const user = normalizeUser(res.data?.user);
    persistAuth(token, user);
    return user;
  },

  async phoneLogin(phoneCode: string): Promise<UserInfo & { isNewUser?: boolean }> {
    // 检查 session 有效性，过期则 Taro.login() 会自动刷新
    try {
      await Taro.checkSession();
    } catch {
      // session 过期，Taro.login() 会获取新 session
    }
    const loginRes = await Taro.login();
    if (!loginRes.code) throw new Error('手机号登录失败：未获取到微信 code');
    const res = await request({
      url: '/api/v1/auth/phone-login',
      method: 'POST',
      data: { phoneCode, loginCode: loginRes.code },
      timeout: 15000,
    });
    const token = res.data?.token;
    if (!token) throw new Error('手机号登录失败：服务端未返回 token');
    const user = normalizeUser(res.data?.user);
    persistAuth(token, user);
    return { ...user, isNewUser: res.data?.isNewUser };
  },

  async setPassword(password: string, currentPassword?: string): Promise<UserInfo> {
    const res = await request({
      url: '/api/v1/auth/set-password',
      method: 'POST',
      data: { password, currentPassword },
      timeout: 15000,
    });
    const cached = this.getCachedUser();
    const user = normalizeUser(res.data?.user || cached, password);
    persistAuth(this.getToken() || '', user);
    return user;
  },

  logout() {
    removeItem(TOKEN_KEY);
    removeItem(CURRENT_USER_KEY);
  },
};

export default authService;
