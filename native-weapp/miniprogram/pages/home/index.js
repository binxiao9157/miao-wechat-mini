const { dataStore } = require('../../services/data-store');
const { navigateTo } = require('../../utils/nav');

const ACTIONS = [
  { key: 'idle', label: '蹭蹭', hint: '轻点播放' },
  { key: 'tail', label: '摸头', hint: '双击触发' },
  { key: 'rubbing', label: '踩奶', hint: '滑动触发' },
  { key: 'blink', label: '逗猫', hint: '长按触发' }
];

const BUBBLES = {
  idle: '蹭蹭你~',
  tail: '摸摸头，真乖~',
  rubbing: '踩奶中，好舒服~',
  blink: '小羽毛，抓不到~'
};

Page({
  data: {
    cat: null,
    currentAction: 'idle',
    currentVideo: '',
    poster: '',
    actionItems: [],
    bubbleText: '',
    videoError: false,
    videoRetryKey: 0,
    statusText: '已进入原生首页。',
    canContinueGeneration: false
  },

  onShow() {
    this.touchStart = null;
    this.longPressFired = false;
    const cat = dataStore.getActiveCat();
    this.applyCat(cat, 'idle');
    dataStore.syncCatsFromServer().catch((error) => {
      console.warn('[native] sync cats in home failed:', error);
    }).finally(() => {
      this.applyCat(dataStore.getActiveCat(), this.data.currentAction);
    });
  },

  onUnload() {
    clearTimeout(this.longPressTimer);
  },

  applyCat(cat, preferredAction) {
    const paths = (cat && cat.videoPaths) || {};
    const idleVideo = paths.idle || (cat && cat.videoPath) || '';
    const currentAction = paths[preferredAction] ? preferredAction : 'idle';
    const currentVideo = paths[currentAction] || idleVideo;
    const ready = !!idleVideo || (cat && cat.generationStatus === 'ready');
    const missingCount = ACTIONS.filter((action) => !paths[action.key]).length;
    this.setData({
      cat,
      currentAction,
      currentVideo,
      poster: (cat && cat.avatar) || '',
      actionItems: ACTIONS.map((action) => ({
        ...action,
        active: action.key === currentAction,
        generated: !!paths[action.key] || (action.key === 'idle' && !!idleVideo)
      })),
      videoError: false,
      statusText: ready ? (missingCount > 0 ? `还有 ${missingCount} 个互动动作待生成` : '你的小猫已经苏醒。') : '猫咪已创建，等待生成视频。',
      canContinueGeneration: !!cat && (!ready || missingCount > 0)
    });
  },

  continueGeneration() {
    navigateTo('/pages/generation-progress/index?action=all');
  },

  goSwitch() {
    navigateTo('/pages/switch-companion/index');
  },

  goHistory() {
    navigateTo('/pages/cat-history/index');
  },

  goProfile() {
    navigateTo('/pages/profile/index');
  },

  createCat() {
    navigateTo('/pages/upload-material/index');
  },

  selectAction(event) {
    const { action } = event.currentTarget.dataset;
    const cat = this.data.cat;
    if (!cat) return;
    const paths = cat.videoPaths || {};
    if (!paths[action] && !(action === 'idle' && (paths.idle || cat.videoPath))) {
      navigateTo(`/pages/generation-progress/index?action=${action}`);
      return;
    }
    const video = paths[action] || cat.videoPath || '';
    this.setData({
      currentAction: action,
      currentVideo: video,
      actionItems: this.data.actionItems.map((item) => ({ ...item, active: item.key === action })),
      bubbleText: BUBBLES[action] || '',
      videoError: false
    });
  },

  onTouchStart(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    this.touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    this.longPressFired = false;
    clearTimeout(this.longPressTimer);
    this.longPressTimer = setTimeout(() => {
      this.longPressFired = true;
      this.triggerAction('blink');
    }, 650);
  },

  onTouchMove() {
    clearTimeout(this.longPressTimer);
  },

  onTouchEnd(event) {
    clearTimeout(this.longPressTimer);
    if (!this.touchStart || this.longPressFired) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - this.touchStart.x;
    const dy = touch.clientY - this.touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const now = Date.now();
    if (dist > 48) {
      this.triggerAction('rubbing');
    } else if (now - (this.lastTapAt || 0) < 320) {
      this.lastTapAt = 0;
      this.triggerAction('tail');
    } else {
      this.lastTapAt = now;
      this.triggerAction('idle');
    }
  },

  triggerAction(action) {
    const item = this.data.actionItems.find((entry) => entry.key === action);
    if (!item) return;
    if (!item.generated) {
      wx.showToast({ title: '该动作还未生成', icon: 'none' });
      return;
    }
    this.selectAction({ currentTarget: { dataset: { action } } });
  },

  handleVideoError() {
    this.setData({ videoError: true, statusText: '视频暂时无法播放，请稍后重试。' });
  },

  retryVideo() {
    this.setData({
      videoError: false,
      videoRetryKey: this.data.videoRetryKey + 1,
      statusText: '正在重新加载视频...'
    });
  }
});
