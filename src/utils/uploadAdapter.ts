import Taro from '@tarojs/taro';
import { getItem, removeItem } from './storageAdapter';

interface UploadOptions {
  url: string;
  filePath: string;
  name?: string;
  formData?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

const getBaseURL = () => process.env.TARO_APP_API_BASE_URL || 'https://www.mmdd10.tech';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRetryableUploadError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('interrupted') ||
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('network') ||
    normalized.includes('fail socket') ||
    normalized.includes('fail connection') ||
    normalized.includes('fail abort')
  );
}

function normalizeUploadError(message: string): string {
  if (message.includes('interrupted')) {
    return '图片上传被中断，请保持页面打开并重试';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return '图片上传超时，请检查网络后重试';
  }
  return message || '文件上传失败';
}

function handleUnauthorizedUpload() {
  removeItem('miao_auth_token');
  removeItem('miao_current_user');
  Taro.eventCenter.trigger('auth:unauthorized');
}

function uploadFileOnce(options: UploadOptions, fullUrl: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    Taro.uploadFile({
      url: fullUrl,
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData || {},
      timeout: options.timeout || 120000,
      header: {
        'X-Client-Type': 'wechat-miniprogram',
        'X-Client-Version': '1.0.0',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let message = `上传失败: HTTP ${res.statusCode}`;
          try {
            const data = JSON.parse(res.data || '{}');
            message = data.message || data.error || message;
          } catch (error) {
            console.warn('[uploadAdapter] upload error response parse failed:', error);
          }
          if (res.statusCode === 401) {
            handleUnauthorizedUpload();
            return reject(new Error('登录已过期，请重新登录'));
          }
          const error: any = new Error(message);
          error.statusCode = res.statusCode;
          return reject(error);
        }
        try {
          resolve(JSON.parse(res.data));
        } catch {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: (err) => {
        const error: any = new Error(err.errMsg || '文件上传失败');
        error.errMsg = err.errMsg;
        reject(error);
      },
    });
  });
}

export async function uploadFile(options: UploadOptions): Promise<any> {
  const token = getItem('miao_auth_token');
  const fullUrl = options.url.startsWith('http') ? options.url : `${getBaseURL()}${options.url}`;

  if (!token) {
    return Promise.reject(new Error('请先登录后再上传'));
  }

  const retries = options.retries ?? 2;
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await uploadFileOnce(options, fullUrl, token);
    } catch (error: any) {
      lastError = error;
      const message = error?.errMsg || error?.message || '';
      const retryableStatus = error?.statusCode >= 500;
      const retryable = retryableStatus || isRetryableUploadError(message);
      if (!retryable || attempt >= retries) break;
      await delay(1000 * (attempt + 1));
    }
  }

  throw new Error(normalizeUploadError(lastError?.errMsg || lastError?.message || '文件上传失败'));
}

export default { uploadFile };
