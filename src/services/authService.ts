import Taro from '@tarojs/taro';
import { request } from '../utils/httpAdapter';
import { getItem, removeItem, setItem } from '../utils/storageAdapter';
import { UserInfo } from './storage';

const TOKEN_KEY = 'miao_auth_token';
const CURRENT_USER_KEY = 'miao_current_user';

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
  };
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
      },
      timeout: 15000,
    });
    const token = res.data?.token;
    if (!token) throw new Error('微信登录失败：服务端未返回 token');
    const user = normalizeUser(res.data?.user);
    persistAuth(token, user);
    return user;
  },

  logout() {
    removeItem(TOKEN_KEY);
    removeItem(CURRENT_USER_KEY);
  },
};

export default authService;
