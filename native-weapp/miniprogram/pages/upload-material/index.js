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
    error: '',
    isRedemption: false,
    redemptionText: ''
  },

  onLoad(options = {}) {
    this.redemptionAmount = Number(options.redemptionAmount || 0);
    this.setData({
      isRedemption: this.redemptionAmount > 0,
      redemptionText: this.redemptionAmount > 0 ? `${this.redemptionAmount} 积分兑换` : ''
    });
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
    if (this.redemptionAmount > 0 && contentStore.getEffectivePoints(this.redemptionAmount) < this.redemptionAmount) {
      this.setData({ error: '积分不足，无法兑换新猫咪' });
      return;
    }

    this.setData({ generating: true, error: '' });
    let pointsSpent = false;
    try {
      const prompt = IMAGE_PROMPTS.anchor('未知', '上传照片');
      const task = await submitImageTask(prompt, this.data.imagePath);
      const imageUrl = await pollImageResult(task.id, task.image_url);
      if (this.redemptionAmount > 0) {
        await contentStore.spendPoints(this.redemptionAmount, '兑换新猫咪');
        pointsSpent = true;
      }
      await dataStore.createDraftCat({
        name,
        breed: 'AI 生成',
        color: '上传照片',
        avatar: imageUrl,
        source: 'uploaded',
        placeholderImage: this.data.imagePath,
        anchorFrame: imageUrl
      });
      navigateTo('/pages/generation-progress/index');
    } catch (error) {
      if (pointsSpent) {
        await contentStore.refundPoints(this.redemptionAmount, '兑换失败返还').catch(() => undefined);
      }
      this.setData({ error: error.message || '形象生成失败，请重试' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
