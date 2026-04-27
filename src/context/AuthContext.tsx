import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage, UserInfo, CatInfo } from '../services/storage';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userInfo: UserInfo) => Promise<void>;
  logout: () => void;
  refreshCatStatus: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = storage.getUserInfo();
    if (storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const foundUser = storage.findUser(username);
    if (foundUser && foundUser.password === password) {
      storage.saveUserInfo(foundUser);
      setUser(foundUser);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: '用户名或密码错误' };
  };

  const register = async (userInfo: UserInfo) => {
    storage.saveUserInfo(userInfo);
    setUser(userInfo);
    setIsAuthenticated(true);
  };

  const logout = () => {
    storage.clearCurrentUser();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshCatStatus = () => {
    // 刷新猫咪状态
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout, refreshCatStatus }}>
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