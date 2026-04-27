/**
 * 存储适配器
 * 统一 localStorage（Web）和 Taro.getStorage（小程序）的调用
 */

import Taro from '@tarojs/taro';

const isMiniProgram = process.env.TARO_ENV === 'weapp';

/**
 * 获取存储值
 */
export const getItem = (key: string): string | null => {
  if (isMiniProgram) {
    return Taro.getStorageSync(key) || null;
  }
  return localStorage.getItem(key);
};

/**
 * 设置存储值
 */
export const setItem = (key: string, value: string): void => {
  if (isMiniProgram) {
    Taro.setStorageSync(key, value);
  } else {
    localStorage.setItem(key, value);
  }
};

/**
 * 移除存储值
 */
export const removeItem = (key: string): void => {
  if (isMiniProgram) {
    Taro.removeStorage({ key });
  } else {
    localStorage.removeItem(key);
  }
};

/**
 * 清空所有存储
 */
export const clear = (): void => {
  if (isMiniProgram) {
    Taro.clearStorageSync();
  } else {
    localStorage.clear();
  }
};

/**
 * 获取存储键列表
 */
export const getAllKeys = (): string[] => {
  if (isMiniProgram) {
    const keys: string[] = [];
    const info = Taro.getStorageInfoSync();
    return info.keys;
  }
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
};

/**
 * 异步获取存储值
 */
export const getItemAsync = async (key: string): Promise<string | null> => {
  if (isMiniProgram) {
    try {
      const result = await Taro.getStorage({ key });
      return result.data as string || null;
    } catch {
      return null;
    }
  }
  return getItem(key);
};

/**
 * 异步设置存储值
 */
export const setItemAsync = async (key: string, value: string): Promise<void> => {
  if (isMiniProgram) {
    await Taro.setStorage({ key, data: value });
  } else {
    setItem(key, value);
  }
};

/**
 * 异步移除存储值
 */
export const removeItemAsync = async (key: string): Promise<void> => {
  if (isMiniProgram) {
    await Taro.removeStorage({ key });
  } else {
    removeItem(key);
  }
};

/**
 * 获取存储信息
 */
export const getStorageInfo = (): {
  keys: string[];
  currentSize: number;
  keysSize: number;
  limit: number;
} | null => {
  if (isMiniProgram) {
    return Taro.getStorageInfoSync();
  }
  let total = 0;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keys.push(key);
      total += localStorage.getItem(key)?.length || 0;
    }
  }
  return {
    keys,
    currentSize: total,
    keysSize: keys.length,
    limit: 5 * 1024 * 1024, // 5MB estimate for web
  };
};

export default {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
  getItemAsync,
  setItemAsync,
  removeItemAsync,
  getStorageInfo,
};