const { dataStore } = require('../../services/data-store');
const { contentStore } = require('../../services/content-store');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    catName: '小猫',
    days: 1,
    diaryCount: 0,
    videoCount: 0,
    milestones: []
  },

  onShow() {
    const cat = dataStore.getActiveCat();
    const stats = dataStore.getCatStats(cat);
    const diaries = contentStore.getDiaries().filter((item) => !cat || item.catId === cat.id);
    const days = stats.days || 1;
    this.setData({
      catName: (cat && cat.name) || '小猫',
      days,
      diaryCount: diaries.length,
      videoCount: stats.videoCount,
      milestones: [
        { label: '初次相遇', done: true },
        { label: '陪伴 7 天', done: days >= 7 },
        { label: '陪伴 30 天', done: days >= 30 },
        { label: '记录 10 篇日记', done: diaries.length >= 10 }
      ]
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  }
});
