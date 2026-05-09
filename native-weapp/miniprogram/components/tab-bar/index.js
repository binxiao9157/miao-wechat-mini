const TABS = [
  { key: 'home', label: '首页', icon: '⌂', url: '/pages/home/index' },
  { key: 'diary', label: '日记', icon: '✎', url: '/pages/diary/index' },
  { key: 'letters', label: '时光信', icon: '✉', url: '/pages/time-letters/index' },
  { key: 'points', label: '积分', icon: '◆', url: '/pages/points/index' },
  { key: 'profile', label: '我的', icon: '◉', url: '/pages/profile/index' }
];

Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    }
  },

  data: {
    tabs: []
  },

  observers: {
    active() {
      this.syncTabs();
    }
  },

  lifetimes: {
    attached() {
      this.syncTabs();
    }
  },

  methods: {
    syncTabs() {
      this.setData({
        tabs: TABS.map((item) => ({
          ...item,
          active: item.key === this.properties.active
        }))
      });
    },

    go(event) {
      const { url, key } = event.currentTarget.dataset;
      if (key === this.properties.active) return;
      wx.reLaunch({ url });
    }
  }
});
