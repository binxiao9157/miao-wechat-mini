/**
 * HTTP 请求适配器
 * 统一 fetch（Web）和 Taro.request（小程序）的调用
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
  // 小程序环境需要完整域名，Web 环境使用相对路径
  const baseURL = isMini 
    ? (process.env.TARO_APP_API_BASE_URL || 'https://your-server.com') 
    : '/api';
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

  if (isMini) {
    try {
      const res = await Taro.request({
        url: fullUrl,
        method,
        data,
        header: headers,
        timeout,
      });

      if (res.statusCode < 200 || res.statusCode >= 300) {
        const errData = res.data as any;
        const msg = errData?.message || errData?.error || `HTTP ${res.statusCode}`;
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
      console.error('Taro request error:', error);
      throw new Error(`网络请求失败: ${error.message || '未知错误'}`);
    }
  }

  // Web 环境使用 fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseData = await response.json();

    return {
      data: responseData,
      status: response.status,
      headers: {},
    };
  } catch (error: any) {
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