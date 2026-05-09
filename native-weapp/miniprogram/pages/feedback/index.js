const { post } = require('../../utils/request');
const { safeBack } = require('../../utils/nav');

Page({
  data: {
    content: '',
    contact: '',
    saving: false
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  onInput(event) {
    const { field } = event.currentTarget.dataset;
    this.setData({ [field]: event.detail.value });
  },

  async submit() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await post('/api/v1/feedback', {
        type: '用户反馈',
        content: `${content}${this.data.contact ? `\n联系方式：${this.data.contact}` : ''}`
      }, { timeout: 15000 });
      wx.showToast({ title: '已提交', icon: 'success' });
      this.setData({ content: '', contact: '' });
    } catch (error) {
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
