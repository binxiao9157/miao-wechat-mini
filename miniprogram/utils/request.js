const { API_BASE_URL, CLIENT_TYPE, CLIENT_VERSION } = require('../config/env');
const { getItem, removeItem } = require('./storage');
const { events } = require('./event-bus');

function buildUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url}`;
}

function request(options) {
  const token = getItem('miao_auth_token');
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Type': CLIENT_TYPE,
    'X-Client-Version': CLIENT_VERSION,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(options.url),
      method,
      data: options.data,
      header: headers,
      timeout: options.timeout || 10000,
      success(res) {
        const data = res.data || {};
        if (res.statusCode === 401 && data.code === 'UNAUTHORIZED') {
          removeItem('miao_auth_token');
          removeItem('miao_current_user');
          events.emit('auth:unauthorized');
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error(data.message || data.error || `HTTP ${res.statusCode}`);
          error.response = { status: res.statusCode, data };
          reject(error);
          return;
        }

        resolve({
          data,
          status: res.statusCode,
          headers: res.header || {}
        });
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败'));
      }
    });
  });
}

function get(url, options = {}) {
  return request({ ...options, url, method: 'GET' });
}

function post(url, data, options = {}) {
  return request({ ...options, url, data, method: 'POST' });
}

function put(url, data, options = {}) {
  return request({ ...options, url, data, method: 'PUT' });
}

function del(url, options = {}) {
  return request({ ...options, url, method: 'DELETE' });
}

function patch(url, data, options = {}) {
  return request({ ...options, url, data, method: 'PATCH' });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  patch
};
