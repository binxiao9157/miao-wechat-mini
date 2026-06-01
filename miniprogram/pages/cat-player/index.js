const { dataStore } = require('../../services/data-store');
const { authService } = require('../../services/auth');
const { getItem, setItem } = require('../../utils/storage');
const { safeBack, navigateTo, reLaunch } = require('../../utils/nav');
const { userScopedKey } = require('../../types/models');
const { getCatVideoUrl, normalizeVideoPaths } = require('../../utils/media-url');

const ACTIONS = [
  { key: 'idle', label: '苏醒' },
  { key: 'tail', label: '摸头' },
  { key: 'rubbing', label: '踩奶' },
  { key: 'blink', label: '逗猫' }
];

function likeKey(catId) {
  const user = authService.getCachedUser();
  const key = `cat_liked_${catId}`;
  return user && user.username ? userScopedKey(user.username, key) : key;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

Page({
  data: {
    cat: null,
    currentAction: 'idle',
    videoUrl: '',
    actions: [],
    liked: false,
    loading: true,
    error: '',
    createdDate: ''
  },

  onLoad(options = {}) {
    this.catId = options.id || '';
  },

  onShow() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    const cat = this.catId ? dataStore.getCatById(this.catId) : dataStore.getActiveCat();
    if (!cat) {
      safeBack('/pages/cat-history/index');
      return;
    }
    this.applyCat(cat, 'idle');
  },

  applyCat(cat, action) {
    const paths = normalizeVideoPaths(cat.videoPaths);
    const fallback = getCatVideoUrl(cat, 'idle');
    const videoUrl = action === 'idle' ? fallback : paths[action];
    this.setData({
      cat,
      currentAction: action,
      videoUrl,
      loading: !!videoUrl,
      error: '',
      liked: getItem(likeKey(cat.id)) === '1',
      createdDate: formatDate(cat.createdAt || Number(String(cat.id || '').split('_')[1])),
      actions: ACTIONS.map((item) => ({
        ...item,
        active: item.key === action,
        generated: item.key === 'idle' ? !!fallback : !!paths[item.key]
      }))
    });
  },

  goBack() {
    safeBack('/pages/cat-history/index');
  },

  selectAction(event) {
    const action = event.currentTarget.dataset.action;
    const target = this.data.actions.find((item) => item.key === action);
    if (!target || !target.generated) {
      navigateTo(`/pages/generation-progress/index?action=${action}`);
      return;
    }
    this.applyCat(this.data.cat, action);
  },

  onVideoReady() {
    this.setData({ loading: false, error: '' });
  },

  onVideoError() {
    this.setData({ loading: false, error: '视频格式不支持或链接失效，请重试。' });
  },

  retryVideo() {
    this.setData({ loading: !!this.data.videoUrl, error: '' });
  },

  toggleLike() {
    const cat = this.data.cat;
    if (!cat) return;
    const next = !this.data.liked;
    setItem(likeKey(cat.id), next ? '1' : '0');
    this.setData({ liked: next });
  },

  shareHint() {
    wx.showToast({ title: '点击右上角菜单分享', icon: 'none' });
  },

  saveVideo() {
    const videoUrl = this.data.videoUrl;
    if (!videoUrl) {
      wx.showToast({ title: '暂无可保存的视频', icon: 'none' });
      return;
    }
    const save = (filePath) => {
      wx.saveVideoToPhotosAlbum({
        filePath,
        success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: () => this.handleAlbumSaveFail()
      });
    };
    if (/^https?:\/\//i.test(videoUrl)) {
      wx.showLoading({ title: '下载视频' });
      wx.downloadFile({
        url: videoUrl,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) save(res.tempFilePath);
          else wx.showToast({ title: '下载视频失败', icon: 'none' });
        },
        fail: () => wx.showToast({ title: '下载视频失败', icon: 'none' }),
        complete: () => wx.hideLoading()
      });
      return;
    }
    save(videoUrl);
  },

  handleAlbumSaveFail() {
    wx.showModal({
      title: '保存失败',
      content: '请确认已允许保存到相册权限。',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) wx.openSetting();
      }
    });
  },

  deleteCat() {
    const cat = this.data.cat;
    if (!cat) return;
    wx.showModal({
      title: '删除记录',
      content: `确定删除 ${cat.name || '这只猫咪'} 的记录吗？`,
      confirmText: '删除',
      confirmColor: '#D64B4B',
      success: async (res) => {
        if (!res.confirm) return;
        const remaining = await dataStore.deleteCatById(cat.id);
        if (remaining.length === 0) reLaunch('/pages/empty-cat/index');
        else safeBack('/pages/cat-history/index');
      }
    });
  },

  onShareAppMessage() {
    const cat = this.data.cat;
    return {
      title: cat ? `来看看${cat.name}的 AI 猫咪视频` : 'Miao - AI 猫咪视频',
      path: cat ? `/pages/cat-player/index?id=${encodeURIComponent(cat.id)}` : '/pages/home/index',
      imageUrl: cat && cat.avatar ? cat.avatar : '/assets/logo.png'
    };
  },

  onShareTimeline() {
    const cat = this.data.cat;
    return {
      title: cat ? `${cat.name}的 AI 猫咪视频` : 'Miao - AI 猫咪视频',
      query: cat ? `id=${encodeURIComponent(cat.id)}` : ''
    };
  }
});
