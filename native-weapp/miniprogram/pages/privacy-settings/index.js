const { getItem, setItem } = require('../../utils/storage');
const { safeBack } = require('../../utils/nav');

const KEY = 'miao_native_privacy_settings';

function readSettings() {
  try {
    return JSON.parse(getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

Page({
  data: {
    settings: {
      allowShare: true,
      allowFriendView: false,
      localOnlyMedia: true
    }
  },

  onShow() {
    this.setData({
      settings: {
        ...this.data.settings,
        ...readSettings()
      }
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  setSwitch(event) {
    const { key } = event.currentTarget.dataset;
    const settings = {
      ...this.data.settings,
      [key]: event.detail.value
    };
    setItem(KEY, JSON.stringify(settings));
    this.setData({ settings });
  }
});
