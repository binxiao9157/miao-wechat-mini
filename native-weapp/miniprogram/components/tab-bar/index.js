const { events } = require('../../utils/event-bus');

const TABS = [
  {
    key: 'diary',
    label: '日志',
    url: '/pages/diary/index',
    activeIcon: '/assets/profile-icons/bookopen-active.png',
    inactiveIcon: '/assets/profile-icons/bookopen-inactive.png'
  },
  {
    key: 'letters',
    label: '时光',
    url: '/pages/time-letters/index',
    activeIcon: '/assets/profile-icons/mail-active.png',
    inactiveIcon: '/assets/profile-icons/mail-inactive.png'
  },
  {
    key: 'home',
    label: '首页',
    url: '/pages/home/index',
    center: true,
    activeIcon: '/assets/profile-icons/home-white.png',
    inactiveIcon: '/assets/profile-icons/home-white.png'
  },
  {
    key: 'points',
    label: '积分',
    url: '/pages/points/index',
    activeIcon: '/assets/profile-icons/star-active.png',
    inactiveIcon: '/assets/profile-icons/star-inactive.png'
  },
  {
    key: 'profile',
    label: 'MIAO',
    url: '/pages/profile/index',
    activeIcon: '/assets/profile-icons/user-active.png',
    inactiveIcon: '/assets/profile-icons/user-inactive.png'
  }
];

Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    }
  },

  data: {
    tabs: [],
    hidden: false
  },

  observers: {
    active() {
      this.syncTabs();
    }
  },

  lifetimes: {
    attached() {
      this.onHideTabbar = () => this.setData({ hidden: true });
      this.onShowTabbar = () => this.setData({ hidden: false });
      events.on('tabbar:hide', this.onHideTabbar);
      events.on('tabbar:show', this.onShowTabbar);
      this.syncTabs();
    },

    detached() {
      events.off('tabbar:hide', this.onHideTabbar);
      events.off('tabbar:show', this.onShowTabbar);
    }
  },

  methods: {
    syncTabs() {
      this.setData({
        tabs: TABS.map((item) => ({
          ...item,
          active: item.key === this.properties.active,
          iconSrc: item.key === this.properties.active ? item.activeIcon : item.inactiveIcon
        }))
      });
    },

    go(event) {
      const { url, key } = event.currentTarget.dataset;
      if (key === this.properties.active) return;
      wx.switchTab({
        url,
        fail: () => wx.redirectTo({
          url,
          fail: () => wx.reLaunch({ url })
        })
      });
    }
  }
});
