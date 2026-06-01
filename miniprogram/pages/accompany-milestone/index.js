const { dataStore } = require('../../services/data-store');
const { safeBack } = require('../../utils/nav');

const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

function buildCalendar(days) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const accompaniedDays = {};

  for (let i = 0; i < days; i += 1) {
    const date = new Date(year, month, today - i);
    if (date.getFullYear() === year && date.getMonth() === month) {
      accompaniedDays[date.getDate()] = true;
    }
  }

  return {
    calendarTitle: `${year}年 ${MONTH_NAMES[month]}`,
    calendarBlanks: Array.from({ length: firstDayOfWeek }, (_, index) => ({ id: `empty-${index}` })),
    calendarDays: Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        day,
        isToday: day === today,
        isAccompanied: !!accompaniedDays[day]
      };
    })
  };
}

Page({
  data: {
    catName: '小猫',
    days: 1,
    weekDays: WEEK_DAYS,
    calendarTitle: '',
    calendarBlanks: [],
    calendarDays: []
  },

  onLoad(options = {}) {
    this.routeOptions = options;
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const cat = dataStore.getActiveCat();
    const stats = dataStore.getCatStats(cat);
    const routeDays = Number(this.routeOptions && this.routeOptions.days);
    const days = Math.max(0, routeDays || stats.days || 1);
    const routeCatName = this.routeOptions && this.routeOptions.catName;

    this.setData({
      catName: routeCatName || (cat && cat.name) || '小猫',
      days,
      ...buildCalendar(days)
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  }
});
