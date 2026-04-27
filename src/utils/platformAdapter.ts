/**
 * 平台检测适配器
 * 检测当前运行环境
 */

import Taro from '@tarojs/taro';

/**
 * 是否为微信小程序环境
 */
export const isWeApp = (): boolean => {
  return process.env.TARO_ENV === 'weapp';
};

/**
 * 是否为 H5/Web 环境
 */
export const isH5 = (): boolean => {
  return process.env.TARO_ENV === 'h5';
};

/**
 * 是否为 React Native 环境
 */
export const isRN = (): boolean => {
  return process.env.TARO_ENV === 'rn';
};

/**
 * 获取当前平台
 */
export const getPlatform = (): 'weapp' | 'h5' | 'rn' | 'quickapp' => {
  return process.env.TARO_ENV as any || 'h5';
};

/**
 * 是否在微信环境中（小程序或微信浏览器）
 */
export const isWeChat = (): boolean => {
  if (isWeApp()) {
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
  if (isWeApp()) {
    return Taro.getSystemInfoSync();
  }
  // Web 环境
  return {
    platform: typeof navigator !== 'undefined' ? navigator.platform : '',
    system: typeof navigator !== 'undefined' ? navigator.appVersion : '',
    brand: '',
    model: '',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    statusBarHeight: 0,
    navigationBarHeight: 44,
  };
};

/**
 * 获取网络状态
 */
export const getNetworkType = async (): Promise<string> => {
  if (isWeApp()) {
    const res = await Taro.getNetworkType();
    return res.networkType;
  }
  // Web 环境假设一直在线
  return 'wifi';
};

/**
 * 设置剪贴板
 */
export const setClipboard = async (text: string): Promise<boolean> => {
  if (isWeApp()) {
    try {
      await Taro.setClipboardData({ data: text });
      return true;
    } catch {
      return false;
    }
  }
  // Web 环境
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // 降级方案
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  return success;
};

/**
 * 复制到剪贴板
 */
export const copyToClipboard = setClipboard;

/**
 * 震动反馈
 */
export const vibrate = (type: 'short' | 'long' = 'short'): void => {
  if (isWeApp()) {
    if (type === 'short') {
      Taro.vibrateShort();
    } else {
      Taro.vibrateLong();
    }
  } else if (navigator.vibrate) {
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
  if (isWeApp()) {
    Taro.showToast({
      title: options.title,
      icon: options.icon || 'none',
      duration: options.duration || 2000,
    });
  } else {
    // Web 环境可以使用简单的 alert 或自定义 toast
    console.log('[Toast]', options.title);
  }
};

/**
 * 显示加载中
 */
export const showLoading = (title: string = '加载中') => {
  if (isWeApp()) {
    Taro.showLoading({ title });
  }
};

/**
 * 隐藏加载中
 */
export const hideLoading = () => {
  if (isWeApp()) {
    Taro.hideLoading();
  }
};

/**
 * 预览图片
 */
export const previewImage = (urls: string[], current?: string) => {
  if (isWeApp()) {
    Taro.previewImage({
      urls,
      current: current || urls[0],
    });
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