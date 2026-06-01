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
    cats: [],
    deleteTarget: null
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
    this.setData({ deleteTarget: { id, name } });
  },

  cancelDelete() {
    this.setData({ deleteTarget: null });
  },

  noop() {},

  async confirmDelete() {
    const target = this.data.deleteTarget;
    if (!target) return;
    const remaining = await dataStore.deleteCatById(target.id);
    this.setData({ deleteTarget: null });
    if (remaining.length === 0) {
      reLaunch('/pages/empty-cat/index');
    } else {
      this.refresh();
    }
  }
});
