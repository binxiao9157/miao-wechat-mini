/**
 * HTTP 请求适配器
 * 统一 fetch（Web）和 Taro.request（小程序）的调用
 */

import Taro from '@tarojs/taro';
import { getItem, removeItem } from './storageAdapter';

/**
 * 检测是否在小程序环境
 */
const isMiniProgram = (): boolean => {
  try {
    const env = Taro.getEnv();
    return env === Taro.ENV_TYPE.WEAPP;
  } catch {
    return typeof Taro !== 'undefined' && typeof Taro.request === 'function';
  }
};

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

interface RequestResult {
  data: any;
  status: number;
  headers: Record<string, string>;
}

/**
 * 发送 HTTP 请求
 */
export const request = async (options: RequestOptions): Promise<RequestResult> => {
  const {
    url,
    method = 'GET',
    data,
    headers = {},
    timeout = 10000, // 小程序环境缩短超时时间
  } = options;

  const isMini = isMiniProgram();
  // 小程序环境需要完整域名，Web/H5 环境保留调用方传入的 /api 路径。
  const baseURL = isMini 
    ? (process.env.TARO_APP_API_BASE_URL || 'https://your-server.com') 
    : '';
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
  const token = getItem('miao_auth_token');
  const requestHeaders = {
    'Content-Type': 'application/json',
    'X-Client-Type': isMini ? 'wechat-miniprogram' : 'pwa',
    'X-Client-Version': '1.0.0',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  if (isMini) {
    try {
      const res = await Taro.request({
        url: fullUrl,
        method,
        data,
        header: requestHeaders,
        timeout,
      });

      if (res.statusCode < 200 || res.statusCode >= 300) {
        const errData = res.data as any;
        const msg = errData?.message || errData?.error || `HTTP ${res.statusCode}`;
        if (res.statusCode === 401 && errData?.code === 'UNAUTHORIZED') {
          removeItem('miao_auth_token');
          removeItem('miao_current_user');
          Taro.eventCenter.trigger('auth:unauthorized');
        }
        const err: any = new Error(msg);
        err.response = { status: res.statusCode, data: errData };
        throw err;
      }

      return {
        data: res.data,
        status: res.statusCode,
        headers: res.header || {},
      };
    } catch (error: any) {
      if (error.response) throw error;
      const errMsg: string = error.errMsg || error.message || '';
      console.error('[httpAdapter] Taro request failed:', JSON.stringify({ url: fullUrl, errMsg }));
      if (errMsg.includes('url not in domain list')) {
        throw new Error('域名未加白名单，请在开发者工具中勾选「不校验合法域名」');
      }
      if (errMsg.includes('abort') || errMsg.includes('timeout')) {
        throw new Error('请求超时，请检查网络或服务器是否启动');
      }
      if (errMsg.includes('fail')) {
        throw new Error(`网络请求失败，请确认服务器已启动且手机与电脑在同一网络 (${errMsg.trim()})`);
      }
      throw new Error(`网络请求失败: ${errMsg || '未知错误'}`);
    }
  }

  // Web 环境使用 fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(fullUrl, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      responseData = {};
    }

    if (response.status === 401 && responseData?.code === 'UNAUTHORIZED') {
      removeItem('miao_auth_token');
      removeItem('miao_current_user');
      Taro.eventCenter.trigger('auth:unauthorized');
    }

    if (response.status < 200 || response.status >= 300) {
      const msg = responseData?.message || responseData?.error || `HTTP ${response.status}`;
      const err: any = new Error(msg);
      err.response = { status: response.status,  responseData };
      throw err;
    }

    return {
       responseData,
      status: response.status,
      headers: {},
    };
  } catch (error: any) {
    if (error.response) throw error;
    if (error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw new Error(`网络请求失败: ${error.message}`);
  }
};

/**
 * GET 请求
 */
export const get = (url: string, options: Omit<RequestOptions, 'url' | 'method'> = {}) => {
  return request({ url, method: 'GET', ...options });
};

/**
 * POST 请求
 */
export const post = (url: string, data?: any, options: Omit<RequestOptions, 'url' | 'method' | 'data'> = {}) => {
  return request({ url, method: 'POST', data, ...options });
};

/**
 * PUT 请求
 */
export const put = (url: string, data?: any, options: Omit<RequestOptions, 'url' | 'method' | 'data'> = {}) => {
  return request({ url, method: 'PUT', data, ...options });
};

/**
 * DELETE 请求
 */
export const del = (url: string, options: Omit<RequestOptions, 'url' | 'method'> = {}) => {
  return request({ url, method: 'DELETE', ...options });
};

/**
 * PATCH 请求
 */
export const patch = (url: string, data?: any, options: Omit<RequestOptions, 'url' | 'method' | 'data'> = {}) => {
  return request({ url, method: 'PATCH', data, ...options });
};

export default {
  request,
  get,
  post,
  put,
  delete: del,
  patch,
};
