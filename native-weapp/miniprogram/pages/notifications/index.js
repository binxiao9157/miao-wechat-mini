const { contentStore } = require('../../services/content-store');
const { safeBack } = require('../../utils/nav');

const SETTINGS = [
  {
    key: 'pushNotifications',
    title: '推送通知',
    desc: '接收好友互动、系统消息等推送提醒'
  },
  {
    key: 'greetingsEnabled',
    title: '每日问候',
    desc: '每天早上和晚上收到猫咪的温暖问候'
  },
  {
    key: 'timeLetterReminder',
    title: '时光信件提醒',
    desc: '有新的时光信件到达时提醒你'
  }
];

Page({
  data: {
    settings: contentStore.getSettings(),
    items: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const settings = contentStore.getSettings();
    this.setData({
      settings,
      items: SETTINGS.map((item) => ({
        ...item,
        checked: !!settings[item.key]
      }))
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  async setSwitch(event) {
    const { key } = event.currentTarget.dataset;
    const value = !!event.detail.value;
    const settings = {
      ...this.data.settings,
      [key]: value
    };
    this.setData({
      settings,
      items: this.data.items.map((item) => (item.key === key ? { ...item, checked: value } : item))
    });
    await contentStore.updateSettings({ [key]: value });
    wx.showToast({ title: value ? '已开启' : '已关闭', icon: 'none', duration: 1000 });
  }
});
