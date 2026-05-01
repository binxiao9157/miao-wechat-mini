import Taro from '@tarojs/taro';
import { getItem, removeItem } from './storageAdapter';

interface UploadOptions {
  url: string;
  filePath: string;
  name?: string;
  formData?: Record<string, string>;
  headers?: Record<string, string>;
}

const getBaseURL = () => process.env.TARO_APP_API_BASE_URL || 'https://your-server.com';

export function uploadFile(options: UploadOptions): Promise<any> {
  const token = getItem('miao_auth_token');
  const fullUrl = options.url.startsWith('http') ? options.url : `${getBaseURL()}${options.url}`;

  if (!token) {
    return Promise.reject(new Error('请先登录后再上传'));
  }

  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      url: fullUrl,
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData || {},
      header: {
        'X-Client-Type': 'wechat-miniprogram',
        'X-Client-Version': '1.0.0',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let message = `上传失败: HTTP ${res.statusCode}`;
          let code = '';
          try {
            const data = JSON.parse(res.data || '{}');
            code = data.code || '';
            message = data.message || data.error || message;
          } catch {}
          if (res.statusCode === 401 && code === 'UNAUTHORIZED') {
            removeItem('miao_auth_token');
            return reject(new Error('登录已过期，请重新登录'));
          }
          return reject(new Error(message));
        }
        try {
          resolve(JSON.parse(res.data));
        } catch {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '文件上传失败')),
    });
  });
}

export default { uploadFile };
