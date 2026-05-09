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
    notifications: []
  },

  onShow() {
    this.refresh();
    contentStore.syncNotificationsFromServer().catch((error) => {
      console.warn('[native] sync notifications failed:', error);
    }).finally(() => this.refresh());
  },

  refresh() {
    this.setData({
      notifications: contentStore.getNotifications().map((item) => ({
        ...item,
        timeLabel: formatTime(item.createdAt || item.time)
      }))
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  async markAllRead() {
    await contentStore.markAllNotificationsRead();
    this.refresh();
  }
});
