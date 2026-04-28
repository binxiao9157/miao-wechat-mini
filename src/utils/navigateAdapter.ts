/**
 * 导航适配器
 * 统一页面跳转 API
 */

import Taro from '@tarojs/taro';

const isMiniProgram = process.env.TARO_ENV === 'weapp';

/**
 * 跳转到指定页面
 */
export const navigateTo = (url: string): Promise<any> => {
  if (isMiniProgram) {
    return Taro.navigateTo({ url });
  }
  // Web 环境使用 hash 路由
  window.location.hash = url;
  return Promise.resolve();
};

/**
 * 页面返回
 */
export const navigateBack = (delta = 1): Promise<any> => {
  if (isMiniProgram) {
    return Taro.navigateBack({ delta });
  }
  window.history.back();
  return Promise.resolve();
};

/**
 * 替换当前页面
 */
export const redirectTo = (url: string): Promise<any> => {
  if (isMiniProgram) {
    return Taro.redirectTo({ url });
  }
  window.location.replace(url);
  return Promise.resolve();
};

/**
 * 跳转到 tabBar 页面
 */
export const switchTab = (url: string): Promise<any> => {
  if (isMiniProgram) {
    return Taro.switchTab({ url });
  }
  window.location.hash = url;
  return Promise.resolve();
};

/**
 * 重新加载应用
 */
export const reLaunch = (url: string): Promise<any> => {
  if (isMiniProgram) {
    return Taro.reLaunch({ url });
  }
  window.location.reload();
  return Promise.resolve();
};

/**
 * 获取当前页面路径
 */
export const getCurrentPath = (): string => {
  if (isMiniProgram) {
    const instance = Taro.getCurrentInstance();
    const router = instance.router;
    return router?.path || '/';
  }
  return window.location.hash.slice(1) || '/';
};

/**
 * 获取页面参数
 */
export const getParams = (): Record<string, string> => {
  if (isMiniProgram) {
    const instance = Taro.getCurrentInstance();
    const raw = instance.router?.params || {};
    // Filter out undefined values
    const result: Record<string, string> = {};
    for (const key of Object.keys(raw)) {
      if (raw[key] !== undefined) {
        result[key] = raw[key] as string;
      }
    }
    return result;
  }
  // Web 环境从 URL 解析
  const hash = window.location.hash;
  const queryString = hash.split('?')[1] || '';
  const params: Record<string, string> = {};
  queryString.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) params[key] = decodeURIComponent(value || '');
  });
  return params;
};

/**
 * 获取页面实例
 */
export const getCurrentInstance = () => {
  if (isMiniProgram) {
    return Taro.getCurrentInstance();
  }
  return null;
};

export default {
  navigateTo,
  navigateBack,
  redirectTo,
  switchTab,
  reLaunch,
  getCurrentPath,
  getParams,
  getCurrentInstance,
};