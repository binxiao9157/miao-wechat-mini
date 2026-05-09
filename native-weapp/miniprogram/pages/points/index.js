const { contentStore } = require('../../services/content-store');
const { dataStore } = require('../../services/data-store');
const { safeBack, navigateTo } = require('../../utils/nav');

function formatTime(timestamp) {
  const date = new Date(timestamp || Date.now());
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${month}-${day}`;
}

Page({
  data: {
    points: {
      total: 0,
      history: []
    },
    tasks: [],
    redeemThreshold: 0,
    ownedCatsCount: 0,
    nextCatIndex: 1,
    effectivePoints: 0,
    redeemActive: false,
    redeemButtonText: '积分不足',
    redeemGap: 0,
    showRedeemGap: false,
    isPointsCheat: false,
    showHistory: false
  },

  onShow() {
    this.refresh();
    contentStore.syncPointsFromServer().catch(() => undefined).finally(() => {
      contentStore.grantDailyLogin().finally(() => this.refresh());
    });
  },

  refresh() {
    const points = contentStore.getPoints();
    const redeemThreshold = contentStore.getUnlockThreshold();
    const ownedCatsCount = dataStore.getCats().length;
    const total = points.total || 0;
    const effectivePoints = contentStore.getEffectivePoints(redeemThreshold);
    this.setData({
      tasks: contentStore.getPointTasks(),
      redeemThreshold,
      ownedCatsCount,
      nextCatIndex: ownedCatsCount + 1,
      effectivePoints,
      redeemActive: effectivePoints >= redeemThreshold && redeemThreshold > 0,
      redeemButtonText: effectivePoints >= redeemThreshold && redeemThreshold > 0 ? '前往兑换' : '积分不足',
      redeemGap: Math.max(0, redeemThreshold - effectivePoints),
      showRedeemGap: effectivePoints < redeemThreshold && redeemThreshold > 0,
      isPointsCheat: contentStore.getIsPointsCheat(),
      points: {
        ...points,
        history: (points.history || []).map((item) => ({
          ...item,
          timeLabel: formatTime(item.createdAt || item.timestamp),
          amountText: `${Number(item.amount || 0) >= 0 ? '+' : ''}${item.amount || 0}`,
          kind: Number(item.amount || 0) >= 0 ? 'earn' : 'spend'
        }))
      }
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  redeemCat() {
    const threshold = this.data.redeemThreshold;
    if (threshold <= 0) {
      wx.showToast({ title: '先拥有第一只猫咪吧', icon: 'none' });
      return;
    }
    if (contentStore.getEffectivePoints(threshold) < threshold) {
      wx.showToast({ title: '积分不足', icon: 'none' });
      return;
    }
    navigateTo(`/pages/upload-material/index?isRedemption=1&redemptionAmount=${threshold}`);
  },

  tapTask(event) {
    const { action, completed } = event.currentTarget.dataset;
    if (completed || action !== 'home') return;
    wx.switchTab({
      url: '/pages/home/index',
      fail: () => navigateTo('/pages/home/index')
    });
  },

  openHistory() {
    this.setData({ showHistory: true });
  },

  closeHistory() {
    this.setData({ showHistory: false });
  }
});
