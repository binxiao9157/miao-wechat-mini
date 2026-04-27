/**
 * HTTP 请求适配器
 * 统一 axios（Web）和 Taro.request（小程序）的调用
 */

import Taro from '@tarojs/taro';

const isMiniProgram = process.env.TARO_ENV === 'weapp';
const baseURL = process.env.TARO_ENV === 'weapp' ? '' : '/api';

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
    timeout = 30000,
  } = options;

  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;

  if (isMiniProgram) {
    try {
      const res = await Taro.request({
        url: fullUrl,
        method,
        data,
        header: headers,
        timeout,
      });

      return {
        data: res.data,
        status: res.statusCode,
        headers: res.header || {},
      };
    } catch (error: any) {
      throw new Error(`Request failed: ${error.message}`);
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
    throw new Error(`Request failed: ${error.message}`);
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