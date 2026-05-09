const { socialStore } = require('../../services/social-store');
const { safeBack, navigateTo } = require('../../utils/nav');

Page({
  data: {
    friends: [],
    diaries: []
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const friends = await socialStore.syncFriends().catch(() => socialStore.getFriends());
    const diaries = await socialStore.getFriendDiaries().catch(() => socialStore.getFriendDiariesLocal());
    this.setData({
      friends,
      diaries: diaries.map((item) => ({
        ...item,
        likesText: Number(item.likes || 0) > 0 ? `${item.likes}` : '赞',
        comments: Array.isArray(item.comments) ? item.comments : []
      }))
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  invite() {
    navigateTo('/pages/add-friend-qr/index');
  },

  join() {
    navigateTo('/pages/join-friend/index');
  },

  scan() {
    wx.scanCode({
      success: (res) => {
        const code = socialStore.extractInviteCode(res.result);
        if (code) navigateTo(`/pages/join-friend/index?invite=${encodeURIComponent(code)}`);
      }
    });
  },

  async likeDiary(event) {
    const { id } = event.currentTarget.dataset;
    await socialStore.likeDiary(id).catch((error) => {
      wx.showToast({ title: error.message || '点赞失败', icon: 'none' });
    });
    this.refresh();
  },

  openDiary(event) {
    const { id } = event.currentTarget.dataset;
    navigateTo(`/pages/diary/index?friendDiaryId=${encodeURIComponent(id)}`);
  }
});
