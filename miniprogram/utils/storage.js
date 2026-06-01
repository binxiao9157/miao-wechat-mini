function getItem(key) {
  try {
    const value = wx.getStorageSync(key);
    if (value === '' || value === undefined || value === null) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return null;
  }
}

function setItem(key, value) {
  wx.setStorageSync(key, value);
}

function removeItem(key) {
  try {
    wx.removeStorageSync(key);
  } catch {}
}

function clear() {
  try {
    wx.clearStorageSync();
  } catch {}
}

function getAllKeys() {
  try {
    return wx.getStorageInfoSync().keys || [];
  } catch {
    return [];
  }
}

module.exports = {
  getItem,
  setItem,
  removeItem,
  clear,
  getAllKeys
};
