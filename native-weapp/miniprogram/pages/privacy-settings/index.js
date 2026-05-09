const { contentStore } = require('../../services/content-store');
const { dataStore } = require('../../services/data-store');
const { socialStore } = require('../../services/social-store');
const { safeBack, navigateTo } = require('../../utils/nav');

function formatSize(sizeKb) {
  const value = Number(sizeKb || 0);
  if (value >= 1024) return `${(value / 1024).toFixed(1)} MB`;
  return `${value} KB`;
}

function listUserFiles() {
  try {
    return wx.getFileSystemManager().readdirSync(wx.env.USER_DATA_PATH) || [];
  } catch {
    return [];
  }
}

function fileNameFromPath(path) {
  const value = String(path || '');
  if (!value) return '';
  const parts = value.split('?')[0].split('/');
  return parts[parts.length - 1] || '';
}

function collectReferencedFiles() {
  const refs = new Set();
  const addPath = (path) => {
    const fileName = fileNameFromPath(path);
    if (fileName) refs.add(fileName);
  };

  contentStore.getDiaries().forEach((item) => addPath(item.media));
  socialStore.getFriendDiariesLocal().forEach((item) => addPath(item.media));
  dataStore.getCats().forEach((cat) => {
    addPath(cat.avatar);
    addPath(cat.placeholderImage);
    addPath(cat.anchorFrame);
    addPath(cat.videoPath);
    Object.values(cat.videoPaths || {}).forEach(addPath);
  });

  return refs;
}

Page({
  data: {
    cacheSize: '0 KB',
    clearing: false
  },

  onShow() {
    this.refreshCacheSize();
  },

  refreshCacheSize() {
    try {
      const info = wx.getStorageInfoSync();
      const referencedFiles = collectReferencedFiles();
      const fileCount = listUserFiles().filter((file) => {
        if (/^tmp_|^upload_/.test(file)) return true;
        return /^media_/.test(file) && !referencedFiles.has(file);
      }).length;
      const suffix = fileCount > 0 ? ` · ${fileCount} 个媒体缓存` : '';
      this.setData({ cacheSize: `${formatSize(info.currentSize)}${suffix}` });
    } catch {
      this.setData({ cacheSize: '未知' });
    }
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  goPolicy() {
    navigateTo('/pages/privacy-policy/index');
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地媒体和临时缓存吗？不会影响账号、猫咪数据和核心记录。',
      confirmText: '清除',
      confirmColor: '#E89F71',
      success: (res) => {
        if (!res.confirm) return;
        this.doClearCache();
      }
    });
  },

  doClearCache() {
    this.setData({ clearing: true });
    let count = 0;
    try {
      const fs = wx.getFileSystemManager();
      const referencedFiles = collectReferencedFiles();
      listUserFiles().forEach((file) => {
        if (!/^tmp_|^upload_/.test(file) && (!/^media_/.test(file) || referencedFiles.has(file))) return;
        try {
          fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${file}`);
          count += 1;
        } catch {}
      });
      wx.showToast({ title: `已清除 ${count} 项`, icon: 'success' });
    } catch {
      wx.showToast({ title: '清除失败', icon: 'none' });
    } finally {
      this.setData({ clearing: false });
      this.refreshCacheSize();
    }
  }
});
