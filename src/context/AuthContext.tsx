import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { storage, UserInfo } from '../services/storage';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  hasCat: boolean;
  catCount: number;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  wechatLogin: () => Promise<{ success: boolean; error?: string }>;
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
          storage.syncFromServer(remoteUser.username).catch((error) => {
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

  const login = async (username: string, password: string) => {
    try {
      const remoteUser = await authService.passwordLogin(username, password);
      storage.saveUserInfo(remoteUser);
      storage.saveLoginTime(Date.now());
      storage.saveLastActiveTime(Date.now());
      await storage.syncFromServer(remoteUser.username);
      setUser(remoteUser);
      setIsAuthenticated(true);
      refreshCatStatus();
      return { success: true };
    } catch {
      return { success: false, error: '登录失败，请检查用户名密码或服务器状态' };
    }
  };

  const register = async (userInfo: UserInfo) => {
    const remoteUser = await authService.register(userInfo);
    storage.saveUserInfo(remoteUser);
    storage.saveLoginTime(Date.now());
    storage.saveLastActiveTime(Date.now());
    await storage.syncFromServer(remoteUser.username);
    setUser(remoteUser);
    setIsAuthenticated(true);
    refreshCatStatus();
  };

  const wechatLogin = async () => {
    try {
      const remoteUser = await authService.wechatLogin();
      storage.saveUserInfo(remoteUser);
      storage.saveLoginTime(Date.now());
      storage.saveLastActiveTime(Date.now());
      await storage.syncFromServer(remoteUser.username);
      setUser(remoteUser);
      setIsAuthenticated(true);
      refreshCatStatus();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || '微信登录失败' };
    }
  };

  const logout = () => {
    authService.logout();
    storage.clearCurrentUser();
    setUser(null);
    setIsAuthenticated(false);
    setCatCount(0);
  };

  const updateProfile = (updates: Partial<UserInfo>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      storage.saveUserInfo(updated);
      return updated;
    });
  };

  const contextValue = useMemo(() => ({
    user, isAuthenticated, isInitializing, hasCat, catCount,
    login, wechatLogin, register, logout, updateProfile, refreshCatStatus,
  }), [user, isAuthenticated, isInitializing, hasCat, catCount]);

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