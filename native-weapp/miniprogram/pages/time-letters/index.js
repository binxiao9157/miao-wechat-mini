const { contentStore } = require('../../services/content-store');
const { safeBack } = require('../../utils/nav');

function formatDate(timestamp) {
  const date = new Date(timestamp || Date.now());
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function viewModel(letter) {
  const unlocked = Date.now() >= (letter.unlockAt || 0);
  return {
    ...letter,
    unlocked,
    unlockLabel: formatDate(letter.unlockAt),
    displayContent: unlocked ? letter.content : '这封信还在时间里。'
  };
}

Page({
  data: {
    letters: [],
    draft: '',
    unlockDate: formatDate(Date.now() + 86400000),
    saving: false
  },

  onShow() {
    this.refresh();
    contentStore.syncLettersFromServer().catch((error) => {
      console.warn('[native] sync letters failed:', error);
    }).finally(() => this.refresh());
  },

  refresh() {
    this.setData({
      letters: contentStore.getLetters().map(viewModel)
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onInput(event) {
    this.setData({ draft: event.detail.value });
  },

  onDateChange(event) {
    this.setData({ unlockDate: event.detail.value });
  },

  async submit() {
    const content = this.data.draft.trim();
    if (!content) {
      wx.showToast({ title: '先写一封信吧', icon: 'none' });
      return;
    }
    const unlockAt = new Date(`${this.data.unlockDate}T00:00:00`).getTime();
    this.setData({ saving: true });
    try {
      await contentStore.addLetter(content, unlockAt);
      this.setData({ draft: '' });
      this.refresh();
      wx.showToast({ title: '已寄出', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  markRead(event) {
    const { id } = event.currentTarget.dataset;
    const letter = this.data.letters.find((item) => item.id === id);
    if (!letter || !letter.unlocked) return;
    contentStore.markLetterRead(id);
    this.refresh();
  }
});
