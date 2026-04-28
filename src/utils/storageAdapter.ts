/**
 * 存储适配器
 * 统一 localStorage（Web）和 Taro.getStorage（小程序）的调用
 */

import Taro from '@tarojs/taro';

/**
 * 检测是否在小程序环境
 */
const isMiniProgram = (): boolean => {
  try {
    const env = Taro.getEnv();
    return env === Taro.ENV_TYPE.WEBVIEW || env === Taro.ENV_TYPE.WEB || env === Taro.ENV_TYPE.WEAPP;
  } catch {
    return typeof wx !== 'undefined' && typeof wx.getStorageSync === 'function';
  }
};

/**
 * 获取存储值
 */
export const getItem = (key: string): string | null => {
  if (isMiniProgram()) {
    try {
      return Taro.getStorageSync(key) || null;
    } catch {
      return null;
    }
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

/**
 * 设置存储值
 */
export const setItem = (key: string, value: string): void => {
  if (isMiniProgram()) {
    try {
      Taro.setStorageSync(key, value);
    } catch (e) {
      console.error('setStorageSync error:', e);
    }
  } else {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage setItem error:', e);
    }
  }
};

/**
 * 移除存储值
 */
export const removeItem = (key: string): void => {
  if (isMiniProgram()) {
    try {
      Taro.removeStorageSync(key);
    } catch {}
  } else {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
};

/**
 * 清空所有存储
 */
export const clear = (): void => {
  if (isMiniProgram()) {
    try {
      Taro.clearStorageSync();
    } catch {}
  } else {
    try {
      localStorage.clear();
    } catch {}
  }
};

/**
 * 获取存储键列表
 */
export const getAllKeys = (): string[] => {
  if (isMiniProgram()) {
    try {
      const info = Taro.getStorageInfoSync();
      return info.keys || [];
    } catch {
      return [];
    }
  }
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
};

export default {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys,
};