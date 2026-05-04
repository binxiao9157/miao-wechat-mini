import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import { storage, UserInfo } from '../services/storage';
import { authService } from '../services/authService';
import { syncManager } from '../services/syncManager';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  hasCat: boolean;
  catCount: number;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  wechatLogin: () => Promise<{ success: boolean; error?: string }>;
  phoneLogin: (phoneCode: string) => Promise<{ success: boolean; isNewUser?: boolean; error?: string }>;
  register: (userInfo: UserInfo) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserInfo>) => void;
  refreshCatStatus: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [catCount, setCatCount] = useState(() => storage.getCatList().length);

  const hasCat = useMemo(() => catCount > 0, [catCount]);

  const refreshCatStatus = () => {
    setCatCount(storage.getCatList().length);
  };

  useEffect(() => {
    const token = authService.getToken();
    const storedUser = authService.getCachedUser();
    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      refreshCatStatus();
      authService.getCurrentUser()
        .then((remoteUser) => {
          if (!remoteUser) return;
          storage.saveUserInfo(remoteUser);
          syncManager.syncAll().catch((error) => {
            console.warn('[AuthContext] background sync failed:', error);
          });
          setUser(remoteUser);
          refreshCatStatus();
        })
        .catch(() => {
          authService.logout();
          storage.clearCurrentUser();
          setUser(null);
          setIsAuthenticated(false);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else if (!token && storage.getUserInfo()) {
      storage.clearCurrentUser();
      setIsInitializing(false);
    } else {
      setIsInitializing(false);
    }
  }, []);

  // 401 自动登出：httpAdapter 检测到 401 时派发 auth:unauthorized 事件
  useEffect(() => {
    let handling401 = false;
    const handler = () => {
      if (handling401) return;
      handling401 = true;
      authService.logout();
      storage.clearCurrentUser();
      setIsAuthenticated(false);
      setUser(null);
      setCatCount(0);
      Taro.reLaunch({ url: '/pages/login/index' });
      setTimeout(() => { handling401 = false; }, 2000);
    };
    Taro.eventCenter.on('auth:unauthorized', handler);
    return () => { Taro.eventCenter.off('auth:unauthorized', handler); };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const remoteUser = await authService.passwordLogin(username, password);
      storage.saveUserInfo(remoteUser);
      storage.saveLoginTime(Date.now());
      storage.saveLastActiveTime(Date.now());
      syncManager.syncAll().catch((e) => { console.warn('[Auth] sync failed:', e); });
      setUser(remoteUser);
      setIsAuthenticated(true);
      refreshCatStatus();
      return { success: true };
    } catch {
      return { success: false, error: '登录失败，请检查用户名密码或服务器状态' };
    }
  }, []);

  const register = useCallback(async (userInfo: UserInfo) => {
    const remoteUser = await authService.register(userInfo);
    storage.saveUserInfo(remoteUser);
    storage.saveLoginTime(Date.now());
    storage.saveLastActiveTime(Date.now());
    syncManager.syncAll().catch((e) => { console.warn('[Auth] sync failed:', e); });
    setUser(remoteUser);
    setIsAuthenticated(true);
    refreshCatStatus();
  }, []);

  const wechatLogin = useCallback(async () => {
    try {
      const remoteUser = await authService.wechatLogin();
      storage.saveUserInfo(remoteUser);
      storage.saveLoginTime(Date.now());
      storage.saveLastActiveTime(Date.now());
      syncManager.syncAll().catch((e) => { console.warn('[Auth] sync failed:', e); });
      setUser(remoteUser);
      setIsAuthenticated(true);
      refreshCatStatus();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || '微信登录失败' };
    }
  }, []);

  const phoneLogin = useCallback(async (phoneCode: string) => {
    try {
      const result = await authService.phoneLogin(phoneCode);
      storage.saveUserInfo(result);
      storage.saveLoginTime(Date.now());
      storage.saveLastActiveTime(Date.now());
      syncManager.syncAll().catch((e) => { console.warn('[Auth] sync failed:', e); });
      setUser(result);
      setIsAuthenticated(true);
      refreshCatStatus();
      return { success: true, isNewUser: result.isNewUser };
    } catch (e: any) {
      return { success: false, error: e.message || '手机号登录失败' };
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    storage.clearCurrentUser();
    setUser(null);
    setIsAuthenticated(false);
    setCatCount(0);
  }, []);

  const updateProfile = useCallback((updates: Partial<UserInfo>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      storage.saveUserInfo(updated);
      return updated;
    });
  }, []);

  const contextValue = useMemo(() => ({
    user, isAuthenticated, isInitializing, hasCat, catCount,
    login, wechatLogin, phoneLogin, register, logout, updateProfile, refreshCatStatus,
  }), [user, isAuthenticated, isInitializing, hasCat, catCount, login, wechatLogin, phoneLogin, register, logout, updateProfile, refreshCatStatus]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}