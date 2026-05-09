const { contentStore } = require('../../services/content-store');
const { safeBack, navigateTo } = require('../../utils/nav');

Page({
  data: {
    items: []
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    await Promise.allSettled([
      contentStore.syncNotificationsFromServer(),
      contentStore.syncLettersFromServer(),
      contentStore.syncPointsFromServer()
    ]);
    const notifications = contentStore.getNotifications().map((item) => ({
      id: item.id,
      title: item.title || '通知',
      content: item.content,
      target: '/pages/notifications/index'
    }));
    const letters = contentStore.getLetters()
      .filter((item) => Date.now() >= (item.unlockAt || 0) && !item.read)
      .map((item) => ({
        id: item.id,
        title: '时光信已开启',
        content: item.content,
        target: '/pages/time-letters/index'
      }));
    const points = (contentStore.getPoints().history || []).slice(0, 5).map((item) => ({
      id: item.id,
      title: item.reason || '积分变化',
      content: `+${item.amount || 0} 积分`,
      target: '/pages/points/index'
    }));
    this.setData({ items: [...notifications, ...letters, ...points] });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  openItem(event) {
    navigateTo(event.currentTarget.dataset.target);
  }
});
