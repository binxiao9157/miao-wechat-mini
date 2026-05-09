const { dataStore } = require('../../services/data-store');
const { contentStore } = require('../../services/content-store');
const { safeBack, navigateTo, reLaunch } = require('../../utils/nav');

Page({
  data: {
    cats: [],
    activeId: '',
    points: 0,
    effectivePoints: 0,
    redeemThreshold: 0,
    redeemActive: false,
    redeemGap: 0,
    showRedeemGap: false,
    isPointsCheat: false
  },

  onShow() {
    this.refresh();
    contentStore.syncPointsFromServer().catch((error) => {
      console.warn('[native] sync points in switch page failed:', error);
    }).finally(() => this.refresh());
    dataStore.syncCatsFromServer().catch((error) => {
      console.warn('[native] sync cats in switch page failed:', error);
    }).finally(() => this.refresh());
  },

  refresh() {
    const points = contentStore.getPoints();
    const redeemThreshold = contentStore.getUnlockThreshold();
    const effectivePoints = contentStore.getEffectivePoints(redeemThreshold);
    this.setData({
      cats: dataStore.getCats(),
      activeId: dataStore.getActiveCatId(),
      points: points.total || 0,
      effectivePoints,
      redeemThreshold,
      redeemActive: redeemThreshold > 0 && effectivePoints >= redeemThreshold,
      redeemGap: Math.max(0, redeemThreshold - effectivePoints),
      showRedeemGap: redeemThreshold > 0 && effectivePoints < redeemThreshold,
      isPointsCheat: contentStore.getIsPointsCheat()
    });
  },

  goBack() {
    safeBack('/pages/home/index');
  },

  addCat() {
    const threshold = this.data.redeemThreshold;
    if (threshold <= 0) {
      navigateTo('/pages/upload-material/index');
      return;
    }
    if (contentStore.getEffectivePoints(threshold) < threshold) {
      wx.showToast({ title: `还差 ${Math.max(0, threshold - this.data.effectivePoints)} 积分`, icon: 'none' });
      return;
    }
    reLaunch(`/pages/empty-cat/index?isRedemption=1&redemptionAmount=${threshold}`);
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
