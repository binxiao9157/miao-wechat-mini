const { contentStore } = require('../../services/content-store');
const { safeBack, navigateTo } = require('../../utils/nav');

Page({
  data: {
    items: [],
    unreadCount: 0
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
    const items = contentStore.buildNotificationItems();
    this.setData({ items, unreadCount: items.filter((item) => !item.read).length });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  async openItem(event) {
    const { id, source, target } = event.currentTarget.dataset;
    await contentStore.markNotificationRead(id, source);
    this.refresh();
    navigateTo(target);
  },

  async markAllRead() {
    const ids = this.data.items.map((item) => item.id);
    contentStore.saveReadNotificationIds([...contentStore.getReadNotificationIds(), ...ids]);
    await contentStore.markAllNotificationsRead();
    this.refresh();
  }
});
