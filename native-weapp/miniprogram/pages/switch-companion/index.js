const { dataStore } = require('../../services/data-store');
const { safeBack, navigateTo, reLaunch } = require('../../utils/nav');

Page({
  data: {
    cats: [],
    activeId: ''
  },

  onShow() {
    this.refresh();
    dataStore.syncCatsFromServer().catch((error) => {
      console.warn('[native] sync cats in switch page failed:', error);
    }).finally(() => this.refresh());
  },

  refresh() {
    this.setData({
      cats: dataStore.getCats(),
      activeId: dataStore.getActiveCatId()
    });
  },

  goBack() {
    safeBack('/pages/home/index');
  },

  addCat() {
    navigateTo('/pages/upload-material/index');
  },

  switchCat(event) {
    const { id } = event.currentTarget.dataset;
    dataStore.saveActiveCatId(id);
    this.refresh();
    wx.showToast({ title: '已切换', icon: 'success' });
  },

  deleteCat(event) {
    const { id, name } = event.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定删除 ${name || '这只猫咪'} 吗？此操作不可撤销。`,
      confirmText: '删除',
      confirmColor: '#D64B4B',
      success: async (res) => {
        if (!res.confirm) return;
        const remaining = await dataStore.deleteCatById(id);
        this.refresh();
        if (remaining.length === 0) {
          reLaunch('/pages/empty-cat/index');
        }
      }
    });
  }
});
