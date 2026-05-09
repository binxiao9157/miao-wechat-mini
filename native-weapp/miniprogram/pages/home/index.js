const { dataStore } = require('../../services/data-store');
const { authService } = require('../../services/auth');
const { navigateTo, reLaunch } = require('../../utils/nav');

Page({
  data: {
    cat: null,
    idleVideo: '',
    statusText: '已进入原生首页。',
    canContinueGeneration: false
  },

  onShow() {
    const cat = dataStore.getActiveCat();
    const idleVideo = cat && cat.videoPaths && cat.videoPaths.idle ? cat.videoPaths.idle : '';
    const ready = !!idleVideo || (cat && cat.generationStatus === 'ready');
    this.setData({
      cat,
      idleVideo,
      statusText: ready ? '你的小猫已经苏醒。' : '猫咪已创建，等待生成视频。',
      canContinueGeneration: !!cat && !ready
    });
  },

  continueGeneration() {
    navigateTo('/pages/generation-progress/index');
  },

  logout() {
    authService.logout();
    const app = getApp();
    app.globalData.user = null;
    app.globalData.isAuthenticated = false;
    reLaunch('/pages/login/index');
  }
});
