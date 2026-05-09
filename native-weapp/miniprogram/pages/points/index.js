const { contentStore } = require('../../services/content-store');
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
    }
  },

  onShow() {
    this.refresh();
    contentStore.syncPointsFromServer().catch(() => undefined).finally(() => {
      contentStore.grantDailyLogin().finally(() => this.refresh());
    });
  },

  refresh() {
    const points = contentStore.getPoints();
    this.setData({
      points: {
        ...points,
        history: (points.history || []).map((item) => ({
          ...item,
          timeLabel: formatTime(item.createdAt || item.timestamp)
        }))
      }
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  redeemCat() {
    if ((this.data.points.total || 0) < 100) {
      wx.showToast({ title: '积分不足', icon: 'none' });
      return;
    }
    navigateTo('/pages/upload-material/index?isRedemption=1&redemptionAmount=100');
  }
});
