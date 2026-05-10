const { contentStore } = require('../../services/content-store');
const { dataStore } = require('../../services/data-store');
const { aiConfig, DEFAULT_AI_PROFILES } = require('../../services/ai-config');
const { safeBack } = require('../../utils/nav');
const { getItem, setItem } = require('../../utils/storage');
const { chooseImage, saveMediaFile } = require('../../utils/media');

Page({
  data: {
    pointsCheat: false,
    fastForward: false,
    profile: DEFAULT_AI_PROFILES.volcengine,
    providerOptions: [
      { key: 'dashscope', label: '阿里百炼' },
      { key: 'volcengine', label: '火山引擎' }
    ],
    presets: [],
    newPresetName: '',
    newPresetImage: '',
    uploadingPreset: false
  },

  onShow() {
    this.setData({
      pointsCheat: contentStore.getIsPointsCheat(),
      fastForward: getItem('miao_debug_fast_forward') === '1',
      profile: aiConfig.getProfile(),
      presets: dataStore.getPresetCats()
    });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  togglePointsCheat(event) {
    const enabled = !!event.detail.value;
    contentStore.setIsPointsCheat(enabled);
    this.setData({ pointsCheat: enabled });
  },

  toggleFastForward(event) {
    const enabled = !!event.detail.value;
    setItem('miao_debug_fast_forward', enabled ? '1' : '0');
    this.setData({ fastForward: enabled });
  },

  selectProvider(event) {
    const provider = event.currentTarget.dataset.provider;
    const defaults = DEFAULT_AI_PROFILES[provider] || DEFAULT_AI_PROFILES.volcengine;
    const current = this.data.profile;
    this.setData({
      profile: {
        ...defaults,
        mockMode: current.mockMode,
        promptExtend: current.promptExtend,
        resolution: current.resolution || defaults.resolution,
        duration: current.duration || defaults.duration,
        seed: current.seed || defaults.seed
      }
    });
  },

  onProfileInput(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    const numericFields = ['duration', 'seed'];
    this.setData({
      profile: {
        ...this.data.profile,
        [field]: numericFields.includes(field) ? Number(value || 0) : value
      }
    });
  },

  toggleProfileBool(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({
      profile: {
        ...this.data.profile,
        [field]: !!event.detail.value
      }
    });
  },

  saveConfig() {
    aiConfig.saveProfile(this.data.profile);
    dataStore.savePresetCats(this.data.presets);
    wx.showToast({ title: '配置已保存', icon: 'success' });
  },

  resetConfig() {
    aiConfig.reset();
    this.setData({ profile: aiConfig.getProfile() });
    wx.showToast({ title: '已恢复默认', icon: 'success' });
  },

  onPresetNameInput(event) {
    this.setData({ newPresetName: event.detail.value });
  },

  async choosePresetImage() {
    try {
      this.setData({ uploadingPreset: true });
      const image = await chooseImage();
      const saved = await saveMediaFile(image);
      this.setData({ newPresetImage: saved });
    } catch (error) {
      wx.showToast({ title: error.message || '选择图片失败', icon: 'none' });
    } finally {
      this.setData({ uploadingPreset: false });
    }
  },

  addPreset() {
    const name = this.data.newPresetName.trim();
    if (!name) {
      wx.showToast({ title: '请填写品种名称', icon: 'none' });
      return;
    }
    if (!this.data.newPresetImage) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    this.setData({
      presets: [
        ...this.data.presets,
        {
          id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name,
          imageUrl: this.data.newPresetImage
        }
      ],
      newPresetName: '',
      newPresetImage: ''
    });
  },

  removePreset(event) {
    const { id } = event.currentTarget.dataset;
    this.setData({
      presets: this.data.presets.filter((item) => item.id !== id)
    });
  },

  resetPresets() {
    this.setData({ presets: dataStore.resetPresetCats() });
    wx.showToast({ title: '预设已恢复', icon: 'success' });
  }
});
