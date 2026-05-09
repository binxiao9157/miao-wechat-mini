const { API_BASE_URL, CLIENT_TYPE, CLIENT_VERSION } = require('../config/env');
const { getItem, removeItem } = require('./storage');
const { events } = require('./event-bus');

function buildUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url}`;
}

function parseResponse(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function uploadFile(options) {
  const token = getItem('miao_auth_token');
  if (!token) {
    return Promise.reject(new Error('请先登录后再上传'));
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: buildUrl(options.url),
      filePath: options.filePath,
      name: options.name || 'file',
      formData: options.formData || {},
      timeout: options.timeout || 120000,
      header: {
        'X-Client-Type': CLIENT_TYPE,
        'X-Client-Version': CLIENT_VERSION,
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      success(res) {
        const data = parseResponse(res.data);
        if (res.statusCode === 401 && data.code === 'UNAUTHORIZED') {
          removeItem('miao_auth_token');
          removeItem('miao_current_user');
          events.emit('auth:unauthorized');
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(data.message || data.error || `上传失败: HTTP ${res.statusCode}`);
          error.statusCode = res.statusCode;
          reject(error);
          return;
        }

        resolve(data);
      },
      fail(error) {
        reject(new Error(error.errMsg || '文件上传失败'));
      }
    });
  });
}

module.exports = {
  uploadFile
};
