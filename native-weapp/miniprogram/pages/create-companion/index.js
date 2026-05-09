const { dataStore } = require('../../services/data-store');
const { reLaunch, safeBack } = require('../../utils/nav');

Page({
  data: {
    name: '',
    breed: '中华田园猫',
    color: '',
    saving: false,
    error: '',
    breeds: [
      { label: '田园猫', value: '中华田园猫' },
      { label: '英短', value: '英国短毛猫' },
      { label: '布偶', value: '布偶猫' },
      { label: '暹罗', value: '暹罗猫' },
      { label: '缅因', value: '缅因猫' },
      { label: '未知', value: '未知' }
    ]
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onColorInput(event) {
    this.setData({ color: event.detail.value });
  },

  selectBreed(event) {
    this.setData({ breed: event.currentTarget.dataset.value });
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

    this.setData({ saving: true, error: '' });
    try {
      await dataStore.createDraftCat({
        name,
        breed: this.data.breed,
        color,
        avatar: '/assets/logo.png'
      });
      wx.showToast({ title: '已创建草稿', icon: 'success' });
      reLaunch('/pages/home/index');
    } catch (error) {
      this.setData({ error: error.message || '创建失败，请稍后重试' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
