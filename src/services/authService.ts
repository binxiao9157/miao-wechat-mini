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
  const debugExpiresAt = Number(raw?.debugExpiresAt);
  return {
    username: raw?.username || '',
    nickname: raw?.nickname || raw?.username || 'Miao 用户',
    avatar: raw?.avatar || '',
    passwordSet: !!raw?.passwordSet || !!fallbackPassword,
    openidBound: !!raw?.openidBound,
    phone: raw?.phone,
    debugAllowed: raw?.debugAllowed === true,
    debugRole: ['developer', 'operator', 'support', 'none'].includes(raw?.debugRole) ? raw.debugRole : undefined,
    debugExpiresAt: Number.isFinite(debugExpiresAt) ? debugExpiresAt : undefined,
  };
}

function toAuthErrorMessage(error: any, fallback: string): string {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;

  if (status === 409 || code === 'USERNAME_EXISTS') return '用户名已被注册';
  if (code === 'INVALID_PARAMETER' || status === 400) return '用户名或密码格式不正确，请重新检查';
  if (message && !/^HTTP \d+$/.test(message)) return message;
  return fallback;
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
    } catch (error) {
      console.warn('[authService] failed to parse cached dev user:', error);
    }
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
    const username = (info.username || '').trim();
    const password = (info.password || '').trim();
    if (!username || !password) throw new Error('用户名和密码不能为空');
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
      throw new Error('用户名需为 3-32 位字母、数字、下划线、短横线或点号');
    }
    if (password.length < 6 || password.length > 20) {
      throw new Error('密码长度需为 6-20 位');
    }
    try {
      const res = await request({
        url: '/api/v1/auth/register',
        method: 'POST',
        data: {
          username,
          password,
          nickname: (info.nickname || username).trim(),
          avatar: info.avatar || '',
        },
        timeout: 15000,
      });
      const token = res.data?.token;
      if (!token) throw new Error('注册失败：服务端未返回 token');
      const user = normalizeUser(res.data?.user, info.password);
      persistAuth(token, user);
      return user;
    } catch (error: any) {
      throw new Error(toAuthErrorMessage(error, '注册失败，请稍后重试'));
    }
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
