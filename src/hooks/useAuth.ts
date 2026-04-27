import { useState, useEffect, useCallback } from 'react';
import { storage, UserInfo, CatInfo } from '../services/storage';

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = storage.getUserInfo();
    setUser(storedUser);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const foundUser = storage.findUser(username);
    if (foundUser && foundUser.password === password) {
      storage.saveUserInfo(foundUser);
      setUser(foundUser);
      return { success: true };
    }
    return { success: false, error: '用户名或密码错误' };
  }, []);

  const register = useCallback(async (userInfo: UserInfo) => {
    storage.saveUserInfo(userInfo);
    setUser(userInfo);
  }, []);

  const logout = useCallback(() => {
    storage.clearCurrentUser();
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout
  };
}

export function useCat() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [catList, setCatList] = useState<CatInfo[]>([]);

  const refreshCat = useCallback(() => {
    const activeCat = storage.getActiveCat();
    setCat(activeCat);
    setCatList(storage.getCatList());
  }, []);

  useEffect(() => {
    refreshCat();
  }, [refreshCat]);

  const switchCat = useCallback((catId: string) => {
    storage.setActiveCatId(catId);
    refreshCat();
  }, [refreshCat]);

  return {
    cat,
    catList,
    refreshCat,
    switchCat
  };
}