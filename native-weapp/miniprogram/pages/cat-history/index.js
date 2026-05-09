const { dataStore } = require('../../services/data-store');
const { safeBack, navigateTo, reLaunch } = require('../../utils/nav');

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function viewModel(cat) {
  const stats = dataStore.getCatStats(cat);
  return {
    ...cat,
    createdDate: formatDate(cat.createdAt),
    videoCount: stats.videoCount
  };
}

Page({
  data: {
    cats: []
  },

  onShow() {
    this.refresh();
    dataStore.syncCatsFromServer().catch((error) => {
      console.warn('[native] sync cats in history failed:', error);
    }).finally(() => this.refresh());
  },

  refresh() {
    const cats = dataStore.getCats()
      .slice()
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
      .map(viewModel);
    this.setData({ cats });
  },

  goBack() {
    safeBack('/pages/home/index');
  },

  addCat() {
    navigateTo('/pages/upload-material/index');
  },

  openCat(event) {
    const { id } = event.currentTarget.dataset;
    dataStore.saveActiveCatId(id);
    navigateTo(`/pages/cat-player/index?id=${encodeURIComponent(id)}`);
  },

  deleteCat(event) {
    const { id, name } = event.currentTarget.dataset;
    wx.showModal({
      title: '删除记录',
      content: `确定删除 ${name || '这只猫咪'} 的记录吗？`,
      confirmText: '删除',
      confirmColor: '#D64B4B',
      success: async (res) => {
        if (!res.confirm) return;
        const remaining = await dataStore.deleteCatById(id);
        if (remaining.length === 0) {
          reLaunch('/pages/empty-cat/index');
        } else {
          this.refresh();
        }
      }
    });
  }
});
