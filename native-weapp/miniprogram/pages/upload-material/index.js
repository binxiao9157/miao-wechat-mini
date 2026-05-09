const { chooseImage, compressImage } = require('../../utils/media');
const { safeBack, navigateTo } = require('../../utils/nav');
const { dataStore } = require('../../services/data-store');
const { contentStore } = require('../../services/content-store');
const { IMAGE_PROMPTS, submitImageTask, pollImageResult } = require('../../services/volcano');

Page({
  data: {
    imagePath: '',
    name: '',
    generating: false,
    error: ''
  },

  onLoad(options = {}) {
    this.redemptionAmount = Number(options.redemptionAmount || 0);
  },

  async choosePhoto() {
    try {
      const selected = await chooseImage();
      const compressed = await compressImage(selected);
      this.setData({ imagePath: compressed, error: '' });
    } catch {
      this.setData({ error: '选择图片失败，请重试' });
    }
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  goBack() {
    safeBack('/pages/empty-cat/index');
  },

  async handleGenerateAnchor() {
    const name = this.data.name.trim();
    if (!name || !this.data.imagePath) {
      this.setData({ error: '请输入猫咪名字并上传照片' });
      return;
    }

    this.setData({ generating: true, error: '' });
    try {
      const prompt = IMAGE_PROMPTS.anchor('未知', '上传照片');
      const task = await submitImageTask(prompt, this.data.imagePath);
      const imageUrl = await pollImageResult(task.id, task.image_url);
      await dataStore.createDraftCat({
        name,
        breed: 'AI 生成',
        color: '上传照片',
        avatar: imageUrl
      });
      if (this.redemptionAmount > 0) {
        await contentStore.spendPoints(this.redemptionAmount, '兑换新猫咪');
      }
      navigateTo('/pages/generation-progress/index');
    } catch (error) {
      this.setData({ error: error.message || '形象生成失败，请重试' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
