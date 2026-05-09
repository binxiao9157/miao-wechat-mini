const { dataStore } = require('../../services/data-store');
const { navigateTo, safeBack } = require('../../utils/nav');

Page({
  data: {
    name: '',
    breed: '',
    color: '',
    selectedPresetId: '',
    selectedPresetImage: '',
    saving: false,
    error: '',
    presets: []
  },

  onShow() {
    const presets = dataStore.getPresetCats();
    const selected = presets.find((item) => item.id === this.data.selectedPresetId) || presets[0] || null;
    this.setData({
      presets,
      selectedPresetId: selected ? selected.id : '',
      selectedPresetImage: selected ? selected.imageUrl : '',
      breed: selected ? selected.name : '未知'
    });
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onColorInput(event) {
    this.setData({ color: event.detail.value });
  },

  selectPreset(event) {
    const { id } = event.currentTarget.dataset;
    const preset = this.data.presets.find((item) => item.id === id);
    if (!preset) return;
    this.setData({
      selectedPresetId: preset.id,
      selectedPresetImage: preset.imageUrl,
      breed: preset.name
    });
  },

  goBack() {
    safeBack('/pages/empty-cat/index');
  },

  async handleCreate() {
    const name = this.data.name.trim();
    const color = this.data.color.trim();
    if (!name) {
      this.setData({ error: '请先给猫咪取个名字' });
      return;
    }
    if (!this.data.selectedPresetId) {
      this.setData({ error: '请选择猫咪品种预设' });
      return;
    }

    this.setData({ saving: true, error: '' });
    try {
      await dataStore.createDraftCat({
        name,
        breed: this.data.breed,
        color,
        avatar: this.data.selectedPresetImage || '/assets/logo.png',
        placeholderImage: this.data.selectedPresetImage || '/assets/logo.png',
        anchorFrame: this.data.selectedPresetImage || '/assets/logo.png'
      });
      wx.showToast({ title: '已创建草稿', icon: 'success' });
      navigateTo('/pages/generation-progress/index');
    } catch (error) {
      this.setData({ error: error.message || '创建失败，请稍后重试' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
