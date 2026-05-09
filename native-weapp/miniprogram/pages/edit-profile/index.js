const { authService } = require('../../services/auth');
const { chooseImage, compressImage, saveMediaFile } = require('../../utils/media');
const { uploadFile } = require('../../utils/upload');
const { API_BASE_URL } = require('../../config/env');
const { safeBack, navigateTo } = require('../../utils/nav');

function absoluteUrl(url) {
  if (!url || /^https?:\/\//i.test(url)) return url || '';
  return `${API_BASE_URL}${url}`;
}

Page({
  data: {
    nickname: '',
    avatar: '',
    saving: false
  },

  onShow() {
    const user = authService.getCachedUser() || {};
    this.setData({
      nickname: user.nickname || user.username || '',
      avatar: user.avatar || ''
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onNicknameInput(event) {
    this.setData({ nickname: event.detail.value });
  },

  onAvatarInput(event) {
    this.setData({ avatar: event.detail.value });
  },

  async chooseAvatar() {
    try {
      const src = await chooseImage();
      const compressed = await compressImage(src);
      const saved = await saveMediaFile(compressed);
      wx.showLoading({ title: '上传头像...' });
      const res = await uploadFile({ url: '/api/v1/upload', filePath: saved, name: 'file', timeout: 120000 });
      this.setData({ avatar: absoluteUrl(res.url || (res.data && res.data.url) || saved) });
    } catch (error) {
      wx.showToast({ title: error.message || '选择头像失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async save() {
    const nickname = this.data.nickname.trim();
    if (nickname.length < 2 || nickname.length > 12) {
      wx.showToast({ title: '昵称需为 2-12 个字符', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await authService.updateProfile({ nickname, avatar: this.data.avatar.trim() });
      wx.showToast({ title: '已保存', icon: 'success' });
      safeBack('/pages/profile/index');
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  changePassword() {
    navigateTo('/pages/change-password/index');
  }
});
