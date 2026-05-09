const { contentStore } = require('../../services/content-store');
const { safeBack } = require('../../utils/nav');

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
    diaries: [],
    draft: '',
    saving: false
  },

  onShow() {
    this.refresh();
    contentStore.syncDiariesFromServer().catch((error) => {
      console.warn('[native] sync diaries failed:', error);
    }).finally(() => this.refresh());
  },

  refresh() {
    this.setData({
      diaries: contentStore.getDiaries().map((item) => ({ ...item, timeLabel: formatTime(item.createdAt) }))
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onInput(event) {
    this.setData({ draft: event.detail.value });
  },

  async submit() {
    const draft = this.data.draft.trim();
    if (!draft) {
      wx.showToast({ title: '先写点内容吧', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await contentStore.addDiary(draft);
      this.setData({ draft: '' });
      this.refresh();
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
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
