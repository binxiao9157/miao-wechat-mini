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
    return env === Taro.ENV_TYPE.WEAPP;
  } catch {
    return typeof Taro !== 'undefined' && typeof Taro.getStorageSync === 'function';
  }
};

/**
 * 获取存储值
 * 微信小程序的 getStorageSync 可能返回对象而非字符串，
 * 因此需要判断返回值类型，对象类型直接 JSON.stringify 转为字符串
 */
export const getItem = (key: string): string | null => {
  if (isMiniProgram()) {
    try {
      const value = Taro.getStorageSync(key);
      if (value === '' || value === undefined || value === null) return null;
      if (typeof value === 'string') return value;
      // 小程序可能返回已反序列化的对象，转为 JSON 字符串
      return JSON.stringify(value);
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
 * 确保小程序中存储的值始终为字符串，避免 getStorageSync 返回对象
 */
export const setItem = (key: string, value: string): void => {
  if (isMiniProgram()) {
    try {
      // value 已经是字符串，直接存储
      // 不做额外 JSON.stringify，避免双重编码
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