const { contentStore } = require('../../services/content-store');
const { socialStore } = require('../../services/social-store');
const { authService } = require('../../services/auth');
const { chooseImage, chooseVideo, compressImage, saveMediaFile } = require('../../utils/media');
const { safeBack, navigateTo } = require('../../utils/nav');
const { generateShareCard } = require('../../utils/share-card');

function formatTime(timestamp) {
  const date = new Date(timestamp || Date.now());
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

Page({
  data: {
    activeTab: 'mine',
    diaries: [],
    friendDiaries: [],
    visibleDiaries: [],
    draft: '',
    selectedMedia: null,
    commentTarget: null,
    commentText: '',
    sharingDiary: null,
    focusDiaryId: '',
    scrollIntoView: '',
    resolvingShared: false,
    sharedError: '',
    shareCardPath: '',
    shareCardDiaryId: '',
    saving: false
  },

  onLoad(options = {}) {
    this.shareCardCache = {};
    this.shareCardPromises = {};
    this.sharedDiaryId = options.id ? decodeURIComponent(options.id) : '';
    if (options.friendDiaryId) {
      this.setData({ activeTab: 'friends' });
    }
    if (this.sharedDiaryId) {
      this.setData({ focusDiaryId: this.sharedDiaryId });
    }
  },

  onShow() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    this.refresh();
    const diarySync = contentStore.syncDiariesFromServer().catch((error) => {
      console.warn('[native] sync diaries failed:', error);
    }).finally(() => this.refresh());
    const friendSync = socialStore.getFriendDiaries().catch((error) => {
      console.warn('[native] sync friend diaries failed:', error);
      return socialStore.getFriendDiariesLocal();
    }).finally(() => this.refresh());
    Promise.allSettled([diarySync, friendSync]).then(() => this.resolveSharedDiary());
  },

  refresh() {
    const diaries = contentStore.getDiaries().map((item) => this.decorateDiary(item, false));
    const friendDiaries = socialStore.getFriendDiariesLocal().map((item) => this.decorateDiary(item, true));
    const focusId = this.data.focusDiaryId || this.sharedDiaryId || '';
    let activeTab = this.data.activeTab;
    if (focusId) {
      if (friendDiaries.some((item) => item.id === focusId)) activeTab = 'friends';
      else if (diaries.some((item) => item.id === focusId)) activeTab = 'mine';
    }
    this.setData({
      activeTab,
      diaries,
      friendDiaries,
      visibleDiaries: activeTab === 'friends' ? friendDiaries : diaries,
      scrollIntoView: focusId ? `diary-${focusId}` : '',
      sharedError: focusId && !this.data.resolvingShared ? this.data.sharedError : ''
    });
  },

  async resolveSharedDiary() {
    const focusId = this.data.focusDiaryId || this.sharedDiaryId || '';
    if (!focusId || this.data.resolvingShared) return;
    const localMatch = [...this.data.diaries, ...this.data.friendDiaries].find((item) => item.id === focusId);
    if (localMatch) {
      this.setData({ sharedError: '' });
      return;
    }

    this.setData({ resolvingShared: true, sharedError: '' });
    try {
      const ownDiary = await contentStore.fetchDiaryById(focusId);
      if (ownDiary) {
        this.setData({ activeTab: 'mine', focusDiaryId: focusId, resolvingShared: false, sharedError: '' }, () => this.refresh());
        return;
      }
      const friendDiary = await socialStore.fetchFriendDiaryById(focusId);
      if (friendDiary) {
        this.setData({ activeTab: 'friends', focusDiaryId: focusId, resolvingShared: false, sharedError: '' }, () => this.refresh());
        return;
      }
      this.setData({
        resolvingShared: false,
        sharedError: '这条日记暂时不可查看，可能需要先添加对方为好友或等待同步完成。'
      });
    } catch (error) {
      this.setData({
        resolvingShared: false,
        sharedError: error.message || '分享日记加载失败，请稍后重试'
      });
    }
  },

  decorateDiary(item, isFriend) {
    const comments = Array.isArray(item.comments) ? item.comments : [];
    const user = authService.getCachedUser() || {};
    const username = user.username || '';
    return {
      ...item,
      isFriend,
      authorName: item.authorNickname || item.authorId || item.catName || (isFriend ? '好友' : '我'),
      timeLabel: formatTime(item.createdAt),
      likesText: Number(item.likes || 0) > 0 ? `${item.likes}` : '赞',
      commentCount: comments.length,
      focused: item.id === (this.data.focusDiaryId || this.sharedDiaryId),
      mediaLoadError: !!item.mediaLoadError,
      syncText: !isFriend && item.syncStatus === 'failed' ? '未同步' : '',
      syncErrorText: !isFriend && item.syncStatus === 'failed' ? (item.syncError || '同步失败，请重试') : '',
      canReplaceMedia: !isFriend && !!item.media && !!item.mediaType && !!item.mediaLoadError,
      comments: comments.map((comment) => ({
        ...comment,
        canDelete: !isFriend || comment.authorId === username
      }))
    };
  },

  switchTab(event) {
    const { tab } = event.currentTarget.dataset;
    this.setData({ activeTab: tab }, () => this.refresh());
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onInput(event) {
    this.setData({ draft: event.detail.value });
  },

  async chooseImage() {
    try {
      const src = await chooseImage();
      const compressed = await compressImage(src);
      const saved = await saveMediaFile(compressed);
      this.setData({ selectedMedia: { url: saved, media: saved, mediaType: 'image' } });
    } catch (error) {
      wx.showToast({ title: error.message || '选择图片失败', icon: 'none' });
    }
  },

  async chooseVideo() {
    try {
      const src = await chooseVideo();
      const saved = await saveMediaFile(src);
      this.setData({ selectedMedia: { url: saved, media: saved, mediaType: 'video' } });
    } catch (error) {
      wx.showToast({ title: error.message || '选择视频失败', icon: 'none' });
    }
  },

  clearMedia() {
    this.setData({ selectedMedia: null });
  },

  async submit() {
    const draft = this.data.draft.trim();
    const selectedMedia = this.data.selectedMedia;
    if (!draft && !selectedMedia) {
      wx.showToast({ title: '写点内容或选择媒体吧', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await contentStore.addDiary(draft, selectedMedia || {});
      this.setData({ draft: '', selectedMedia: null, activeTab: 'mine' });
      this.refresh();
      wx.showToast({ title: '已发布', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  async likeDiary(event) {
    const { id, friend } = event.currentTarget.dataset;
    try {
      if (friend) await socialStore.likeDiary(id);
      else await contentStore.likeDiary(id);
      this.refresh();
    } catch (error) {
      wx.showToast({ title: error.message || '点赞失败', icon: 'none' });
    }
  },

  openComment(event) {
    const { id, friend } = event.currentTarget.dataset;
    this.setData({ commentTarget: { id, friend: !!friend }, commentText: '' });
  },

  closeComment() {
    this.setData({ commentTarget: null, commentText: '' });
  },

  onCommentInput(event) {
    this.setData({ commentText: event.detail.value });
  },

  async submitComment() {
    const target = this.data.commentTarget;
    const text = this.data.commentText.trim();
    if (!target || !text) return;
    try {
      if (target.friend) await socialStore.commentDiary(target.id, text);
      else await contentStore.commentDiary(target.id, text);
      this.closeComment();
      this.refresh();
      wx.showToast({ title: '评论成功', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '评论失败', icon: 'none' });
    }
  },

  async deleteComment(event) {
    const { diaryId, commentId, friend } = event.currentTarget.dataset;
    if (!diaryId || !commentId) return;
    const list = friend ? this.data.friendDiaries : this.data.diaries;
    const diary = list.find((item) => item.id === diaryId);
    const comment = diary && (diary.comments || []).find((item) => item.id === commentId);
    if (comment && !comment.canDelete) {
      wx.showToast({ title: '不能删除这条评论', icon: 'none' });
      return;
    }
    try {
      if (friend) await socialStore.deleteComment(diaryId, commentId);
      else await contentStore.deleteComment(diaryId, commentId);
      this.refresh();
    } catch (error) {
      wx.showToast({ title: error.message || '删除失败', icon: 'none' });
    }
  },

  handleMediaError(event) {
    const { id, friend } = event.currentTarget.dataset;
    const source = friend ? this.data.friendDiaries : this.data.diaries;
    const item = source.find((entry) => entry.id === id);
    if (!item) return;
    const nextItem = item.remoteMedia && item.remoteMedia !== item.media
      ? { ...item, media: item.remoteMedia, mediaLoadError: false }
      : { ...item, mediaLoadError: true };
    const update = (list) => list.map((entry) => (entry.id === id ? nextItem : entry));
    if (friend) {
      const friendDiaries = update(this.data.friendDiaries);
      this.setData({
        friendDiaries,
        visibleDiaries: this.data.activeTab === 'friends' ? friendDiaries : this.data.diaries
      });
    } else {
      const diaries = update(this.data.diaries);
      this.setData({
        diaries,
        visibleDiaries: this.data.activeTab === 'mine' ? diaries : this.data.friendDiaries
      });
    }
  },

  async retrySync(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) return;
    wx.showLoading({ title: '正在同步' });
    try {
      await contentStore.retryDiarySync(id);
      this.refresh();
      wx.showToast({ title: '同步成功', icon: 'success' });
    } catch (error) {
      this.refresh();
      wx.showToast({ title: error.message || '同步失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async replaceDiaryMedia(event) {
    const { id, mediaType } = event.currentTarget.dataset;
    if (!id) return;
    try {
      let src = '';
      let nextType = mediaType || 'image';
      if (nextType === 'video') {
        src = await chooseVideo();
      } else {
        const image = await chooseImage();
        src = await compressImage(image);
        nextType = 'image';
      }
      const saved = await saveMediaFile(src);
      wx.showLoading({ title: '正在同步' });
      await contentStore.replaceDiaryMediaAndSync(id, saved, nextType);
      this.refresh();
      wx.showToast({ title: '已重新同步', icon: 'success' });
    } catch (error) {
      this.refresh();
      wx.showToast({ title: error.message || '处理失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  getShareImageFallback(diary) {
    if (!diary) return '';
    return diary.mediaType === 'image' && diary.media ? diary.media : (diary.catAvatar || diary.authorAvatar || '/assets/logo.png');
  },

  async ensureShareCard(diary) {
    if (!diary || !diary.id) return '';
    if (this.shareCardCache[diary.id]) return this.shareCardCache[diary.id];
    if (this.shareCardPromises[diary.id]) return this.shareCardPromises[diary.id];

    const promise = generateShareCard(this, {
      canvasId: 'shareCardCanvas',
      catName: diary.catName || diary.authorName || '猫咪',
      authorName: diary.authorName || diary.authorNickname || diary.catName || 'Miao',
      catAvatar: diary.catAvatar || diary.authorAvatar || '/assets/logo.png',
      content: diary.content || '分享一条猫咪日记',
      mediaUrl: diary.mediaType === 'image' ? diary.media : '',
      createdAt: diary.createdAt
    }).then((path) => {
      this.shareCardCache[diary.id] = path;
      this.setData({ shareCardPath: path, shareCardDiaryId: diary.id });
      return path;
    }).catch((error) => {
      console.warn('[native] generate share card failed:', error);
      return this.getShareImageFallback(diary);
    }).finally(() => {
      delete this.shareCardPromises[diary.id];
    });

    this.shareCardPromises[diary.id] = promise;
    return promise;
  },

  prepareShare(event) {
    const { id } = event.currentTarget.dataset;
    const diary = [...this.data.diaries, ...this.data.friendDiaries].find((item) => item.id === id);
    if (diary) {
      this.setData({ sharingDiary: diary });
      this.ensureShareCard(diary);
    }
  },

  onShareAppMessage(options = {}) {
    const id = options.target && options.target.dataset && options.target.dataset.id;
    const diary = (id
      ? [...this.data.diaries, ...this.data.friendDiaries].find((item) => item.id === id)
      : this.data.sharingDiary) || null;
    if (!diary) {
      return {
        title: 'Miao - 记录猫咪的美好时光',
        path: '/pages/diary/index'
      };
    }
    const content = diary.content ? (diary.content.length > 30 ? `${diary.content.slice(0, 30)}...` : diary.content) : '分享一条猫咪日记';
    const result = {
      title: `${diary.catName || '猫咪'}的日常：${content}`,
      path: `/pages/diary/index?id=${encodeURIComponent(diary.id)}`
    };
    const imageUrl = this.shareCardCache[diary.id] || this.getShareImageFallback(diary);
    if (imageUrl) result.imageUrl = imageUrl;
    result.promise = this.ensureShareCard(diary).then((path) => ({
      ...result,
      imageUrl: path || result.imageUrl
    }));
    return result;
  },

  onShareTimeline() {
    const diary = this.data.sharingDiary;
    if (!diary) return { title: 'Miao - 记录猫咪的美好时光' };
    const content = diary.content ? (diary.content.length > 20 ? `${diary.content.slice(0, 20)}...` : diary.content) : '猫咪日常';
    const result = {
      title: `${diary.catName || '猫咪'}的日常：${content}`,
      query: `id=${encodeURIComponent(diary.id)}`
    };
    const imageUrl = this.shareCardCache[diary.id] || this.data.shareCardPath || this.getShareImageFallback(diary);
    if (imageUrl) result.imageUrl = imageUrl;
    return result;
  },

  goFriends() {
    navigateTo('/pages/scan-friend/index');
  },

  deleteDiary(event) {
    const { id } = event.currentTarget.dataset;
    wx.showModal({
      title: '删除日记',
      content: '确定删除这条日记吗？',
      confirmText: '删除',
      confirmColor: '#D64B4B',
      success: async (res) => {
        if (!res.confirm) return;
        await contentStore.deleteDiary(id);
        this.refresh();
      }
    });
  }
});
