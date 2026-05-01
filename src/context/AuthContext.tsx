import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage, UserInfo } from '../services/storage';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  wechatLogin: () => Promise<{ success: boolean; error?: string }>;
  register: (userInfo: UserInfo) => Promise<void>;
  logout: () => void;
  refreshCatStatus: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    const storedUser = authService.getCachedUser();
    if (token && storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      authService.getCurrentUser()
        .then((remoteUser) => {
          if (!remoteUser) return;
          storage.saveUserInfo(remoteUser);
          storage.syncFromServer(remoteUser.username).catch((error) => {
            console.warn('[AuthContext] background sync failed:', error);
          });
          setUser(remoteUser);
        })
        .catch(() => {
          authService.logout();
          storage.clearCurrentUser();
          setUser(null);
          setIsAuthenticated(false);
        });
    } else if (!token && storage.getUserInfo()) {
      storage.clearCurrentUser();
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
  };

  const refreshCatStatus = () => {
    // 刷新猫咪状态
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, wechatLogin, register, logout, refreshCatStatus }}>
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
