const { contentStore } = require('../../services/content-store');
const { dataStore } = require('../../services/data-store');
const { safeBack } = require('../../utils/nav');
const { getItem } = require('../../utils/storage');
const { getHeaderSafeTop } = require('../../utils/layout');

function formatDate(timestamp) {
  const date = new Date(timestamp || Date.now());
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysUntil(timestamp) {
  const diff = Number(timestamp || 0) - Date.now();
  return Math.max(1, Math.ceil(diff / 86400000));
}

function viewModel(letter, cats) {
  const unlocked = getItem('miao_debug_fast_forward') === '1' || Date.now() >= (letter.unlockAt || 0);
  const cat = (cats || []).find((item) => item.id === letter.catId) || {};
  const catName = letter.catName || cat.name || '已离开的小猫';
  const catAvatar = letter.catAvatar || cat.avatar || cat.imageUrl || '/assets/logo.png';
  const createdLabel = formatDate(letter.createdAt);
  const unlockLabel = formatDate(letter.unlockAt);
  return {
    ...letter,
    title: letter.title || '时光回响',
    catName,
    catAvatar,
    unlocked,
    unlockLabel,
    createdLabel,
    countdownLabel: unlocked ? '已解锁' : `${daysUntil(letter.unlockAt)}D`,
    displayContent: unlocked ? letter.content : '时光正在酿造这封信',
    statusText: unlocked ? (letter.read ? '已读' : '可查看') : '未开启'
  };
}

Page({
  data: {
    letters: [],
    filteredLetters: [],
    cats: [],
    selectedCatId: 'all',
    activeCatId: '',
    view: 'list',
    selectedLetter: null,
    deletingLetter: null,
    toastText: '',
    title: '',
    draft: '',
    days: 1,
    dayOptions: [1, 3, 7, 30, 100],
    saving: false,
    headerSafeTop: ''
  },

  onLoad() {
    this.setData({ headerSafeTop: getHeaderSafeTop() });
  },

  onShow() {
    this.setData({ headerSafeTop: getHeaderSafeTop() });
    this.refresh();
    contentStore.syncLettersFromServer().catch((error) => {
      console.warn('[native] sync letters failed:', error);
    }).finally(() => this.refresh());
  },

  onResize() {
    this.setData({ headerSafeTop: getHeaderSafeTop() });
  },

  refresh() {
    const cats = dataStore.getCats();
    const activeCat = dataStore.getActiveCat();
    const letters = contentStore.getLetters().map((letter) => viewModel(letter, cats));
    const activeCatId = this.data.activeCatId || (activeCat && activeCat.id) || (cats[0] && cats[0].id) || '';
    this.setData({
      cats,
      letters,
      activeCatId
    }, () => this.applyFilter());
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  applyFilter() {
    const selectedCatId = this.data.selectedCatId;
    const filteredLetters = selectedCatId === 'all'
      ? this.data.letters
      : this.data.letters.filter((item) => item.catId === selectedCatId);
    this.setData({ filteredLetters });
  },

  showToastText(title) {
    this.setData({ toastText: title });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.setData({ toastText: '' });
    }, 2600);
  },

  openWrite() {
    const cats = dataStore.getCats();
    const activeCat = dataStore.getActiveCat();
    this.setData({
      cats,
      activeCatId: this.data.activeCatId || (activeCat && activeCat.id) || (cats[0] && cats[0].id) || '',
      view: 'write'
    });
  },

  closeWrite() {
    this.setData({ view: 'list' });
  },

  selectCat(event) {
    const { id } = event.currentTarget.dataset;
    this.setData({ selectedCatId: id || 'all' }, () => this.applyFilter());
  },

  selectWriteCat(event) {
    const { id } = event.currentTarget.dataset;
    if (id) this.setData({ activeCatId: id });
  },

  onTitleInput(event) {
    this.setData({ title: event.detail.value });
  },

  onInput(event) {
    this.setData({ draft: event.detail.value });
  },

  selectDays(event) {
    const days = Number(event.currentTarget.dataset.days || 1);
    this.setData({ days });
  },

  async submit() {
    const title = this.data.title.trim();
    const content = this.data.draft.trim();
    const cat = dataStore.getCatById(this.data.activeCatId) || dataStore.getActiveCat() || {};
    if (!cat.id && this.data.cats.length) {
      wx.showToast({ title: '请先选择收信喵', icon: 'none' });
      return;
    }
    if (!title) {
      wx.showToast({ title: '先写信件标题吧', icon: 'none' });
      return;
    }
    if (!content) {
      wx.showToast({ title: '先写一封信吧', icon: 'none' });
      return;
    }
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    const unlockAt = targetDate.getTime() + (Number(this.data.days || 1) * 86400000);
    this.setData({ saving: true });
    try {
      await contentStore.addLetter(content, unlockAt, {
        title,
        catId: cat.id || '',
        catName: cat.name || '',
        catAvatar: cat.avatar || cat.imageUrl || ''
      });
      this.setData({ title: '', draft: '', days: 1, view: 'list' });
      this.refresh();
      this.showToastText('封存成功！信件已存入本地时光机');
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  markRead(event) {
    const { id } = event.currentTarget.dataset;
    const letter = this.data.letters.find((item) => item.id === id);
    if (!letter) return;
    if (!letter.unlocked) {
      this.showToastText(`时光正在酿造这封信，请在 ${letter.unlockLabel} 后再来开启吧～`);
      return;
    }
    contentStore.markLetterRead(id);
    this.setData({ selectedLetter: { ...letter, read: true }, view: 'detail' });
    this.refresh();
  },

  closeDetail() {
    this.setData({ selectedLetter: null, view: 'list' });
  },

  noop() {},

  promptDelete(event) {
    const { id } = event.currentTarget.dataset;
    const deletingLetter = this.data.letters.find((item) => item.id === id) || null;
    this.setData({ deletingLetter });
  },

  cancelDelete() {
    this.setData({ deletingLetter: null });
  },

  async confirmDelete() {
    const deletingLetter = this.data.deletingLetter;
    if (!deletingLetter) return;
    this.setData({ deletingLetter: null });
    try {
      const result = await contentStore.deleteLetter(deletingLetter.id);
      if (this.data.selectedLetter && this.data.selectedLetter.id === deletingLetter.id) {
        this.setData({ selectedLetter: null, view: 'list' });
      }
      this.refresh();
      this.showToastText(result && result.synced ? '信件已永久删除' : '信件已删除，稍后同步');
    } catch (error) {
      this.refresh();
      wx.showToast({ title: error.message || '删除失败', icon: 'none' });
    }
  }
});
