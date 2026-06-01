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
    firstFrameUrl: '',
    savingImage: false,
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
      this.setData({ imagePath: compressed, firstFrameUrl: '', error: '' });
    } catch {
      this.setData({ error: '选择图片失败，请重试' });
    }
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  goBack() {
    const redemptionQuery = this.redemptionAmount > 0 ? `?isRedemption=1&redemptionAmount=${this.redemptionAmount}` : '';
    safeBack(`/pages/empty-cat/index${redemptionQuery}`);
  },

  removePhoto(event) {
    if (event && event.stopPropagation) event.stopPropagation();
    this.setData({ imagePath: '', firstFrameUrl: '', error: '' });
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
    try {
      const prompt = IMAGE_PROMPTS.anchor('未知', '上传照片');
      const task = await submitImageTask(prompt, this.data.imagePath);
      const imageUrl = await pollImageResult(task.id, task.image_url);
      this.setData({ firstFrameUrl: imageUrl });
      wx.showToast({ title: '形象已生成', icon: 'success' });
    } catch (error) {
      this.setData({ error: error.message || '形象生成失败，请重试' });
    } finally {
      this.setData({ generating: false });
    }
  },

  regenerateAnchor() {
    this.setData({ firstFrameUrl: '', error: '' });
    this.handleGenerateAnchor();
  },

  saveFirstFrame() {
    const imageUrl = this.data.firstFrameUrl;
    if (!imageUrl) return;
    const save = (filePath) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: () => {
          wx.showModal({
            title: '保存失败',
            content: '请确认已允许保存到相册，也可以长按图片手动保存。',
            confirmText: '去设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) wx.openSetting();
            }
          });
        }
      });
    };

    if (/^https?:\/\//i.test(imageUrl)) {
      this.setData({ savingImage: true });
      wx.downloadFile({
        url: imageUrl,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) save(res.tempFilePath);
          else wx.showToast({ title: '下载图片失败', icon: 'none' });
        },
        fail: () => wx.showToast({ title: '下载图片失败', icon: 'none' }),
        complete: () => this.setData({ savingImage: false })
      });
      return;
    }
    save(imageUrl);
  },

  async confirmAndGenerate() {
    const name = this.data.name.trim();
    const firstFrameUrl = this.data.firstFrameUrl;
    if (!name || !firstFrameUrl) {
      this.setData({ error: '请先生成猫咪形象' });
      return;
    }
    this.setData({ generating: true, error: '' });
    try {
      await dataStore.createDraftCat({
        name,
        breed: 'AI 生成',
        color: '上传照片',
        avatar: firstFrameUrl,
        source: 'uploaded',
        placeholderImage: this.data.imagePath,
        anchorFrame: firstFrameUrl
      });
      const redemptionQuery = this.redemptionAmount > 0 ? `?isRedemption=1&redemptionAmount=${this.redemptionAmount}` : '';
      const separator = redemptionQuery ? '&' : '?';
      navigateTo(`/pages/generation-progress/index${redemptionQuery}${separator}source=uploaded`);
    } catch (error) {
      this.setData({ error: error.message || '进入视频生成失败，请重试' });
    } finally {
      this.setData({ generating: false });
    }
  }
});
