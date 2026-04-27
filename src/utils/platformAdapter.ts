/**
 * 平台检测适配器
 * 检测当前运行环境
 */

import Taro from '@tarojs/taro';

/**
 * 检测是否在小程序环境
 */
const checkIsMiniProgram = (): boolean => {
  try {
    const env = Taro.getEnv();
    return env === Taro.ENV_TYPE.WEBVIEW || env === Taro.ENV_TYPE.WEB;
  } catch {
    return typeof wx !== 'undefined' && typeof wx.request === 'function';
  }
};

/**
 * 是否为微信小程序环境
 */
export const isWeApp = (): boolean => {
  return checkIsMiniProgram();
};

/**
 * 是否为 H5/Web 环境
 */
export const isH5 = (): boolean => {
  return typeof window !== 'undefined' && !checkIsMiniProgram();
};

/**
 * 是否为 React Native 环境
 */
export const isRN = (): boolean => {
  try {
    return Taro.getEnv() === Taro.ENV_TYPE.RN;
  } catch {
    return false;
  }
};

/**
 * 获取当前平台
 */
export const getPlatform = (): 'weapp' | 'h5' | 'rn' | 'quickapp' => {
  if (checkIsMiniProgram()) return 'weapp';
  if (isRN()) return 'rn';
  return 'h5';
};

/**
 * 是否在微信环境中（小程序或微信浏览器）
 */
export const isWeChat = (): boolean => {
  if (checkIsMiniProgram()) {
    return true;
  }
  // H5 环境检测微信浏览器
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  }
  return false;
};

/**
 * 是否为移动设备
 */
export const isMobile = (): boolean => {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }
  return true;
};

/**
 * 获取系统信息
 */
export const getSystemInfo = async () => {
  if (checkIsMiniProgram()) {
    return Taro.getSystemInfoSync();
  }
  // Web 环境
  if (typeof window !== 'undefined') {
    return {
      platform: navigator.platform || '',
      system: navigator.appVersion || '',
      brand: '',
      model: '',
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      statusBarHeight: 0,
      navigationBarHeight: 44,
    };
  }
  return {};
};

/**
 * 获取网络状态
 */
export const getNetworkType = async (): Promise<string> => {
  if (checkIsMiniProgram()) {
    try {
      const res = await Taro.getNetworkType();
      return res.networkType;
    } catch {
      return 'unknown';
    }
  }
  return 'wifi';
};

/**
 * 设置剪贴板
 */
export const setClipboard = async (text: string): Promise<boolean> => {
  if (checkIsMiniProgram()) {
    try {
      await Taro.setClipboardData({ data: text });
      return true;
    } catch {
      return false;
    }
  }
  // Web 环境
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * 复制到剪贴板
 */
export const copyToClipboard = setClipboard;

/**
 * 震动反馈
 */
export const vibrate = (type: 'short' | 'long' = 'short'): void => {
  if (checkIsMiniProgram()) {
    try {
      if (type === 'short') {
        Taro.vibrateShort();
      } else {
        Taro.vibrateLong();
      }
    } catch {}
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(type === 'short' ? 50 : 200);
  }
};

/**
 * 显示Toast
 */
export const showToast = (options: {
  title: string;
  icon?: 'success' | 'error' | 'loading' | 'none';
  duration?: number;
}) => {
  if (checkIsMiniProgram()) {
    try {
      Taro.showToast({
        title: options.title,
        icon: options.icon || 'none',
        duration: options.duration || 2000,
      });
    } catch {}
  } else {
    console.log('[Toast]', options.title);
  }
};

/**
 * 显示加载中
 */
export const showLoading = (title: string = '加载中') => {
  if (checkIsMiniProgram()) {
    try {
      Taro.showLoading({ title });
    } catch {}
  }
};

/**
 * 隐藏加载中
 */
export const hideLoading = () => {
  if (checkIsMiniProgram()) {
    try {
      Taro.hideLoading();
    } catch {}
  }
};

/**
 * 预览图片
 */
export const previewImage = (urls: string[], current?: string) => {
  if (checkIsMiniProgram()) {
    try {
      Taro.previewImage({
        urls,
        current: current || urls[0],
      });
    } catch {}
  }
};

export default {
  isWeApp,
  isH5,
  isRN,
  getPlatform,
  isWeChat,
  isMobile,
  getSystemInfo,
  getNetworkType,
  setClipboard,
  copyToClipboard,
  vibrate,
  showToast,
  showLoading,
  hideLoading,
  previewImage,
};