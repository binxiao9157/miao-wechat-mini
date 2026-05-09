const { dataStore } = require('../../services/data-store');
const { contentStore } = require('../../services/content-store');
const { navigateTo } = require('../../utils/nav');
const { getCatVideoUrl, normalizeVideoPaths, normalizeMediaUrl } = require('../../utils/media-url');

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
    pointsToast: '',
    videoError: false,
    videoErrorDesc: '网络波动，请稍后重试',
    videoReady: false,
    videoRetryKey: 0,
    statusText: '已进入原生首页。',
    canContinueGeneration: false
  },

  onShow() {
    this.touchStart = null;
    this.longPressFired = false;
    this.startOnlineTimer();
    contentStore.grantDailyLogin().then((points) => {
      this.lastPointsTotal = points.total;
    }).catch(() => undefined);
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
    clearTimeout(this.pointsToastTimer);
    clearInterval(this.onlineTimer);
  },

  onHide() {
    clearTimeout(this.longPressTimer);
    clearTimeout(this.pointsToastTimer);
    clearInterval(this.onlineTimer);
  },

  startOnlineTimer() {
    clearInterval(this.onlineTimer);
    this.onlineTimer = setInterval(() => {
      contentStore.updateOnlineMinutes().then((result) => {
        if (result && result.granted) this.showPointsToast(result.granted, '在线时长奖励');
      }).catch(() => undefined);
    }, 60000);
  },

  applyCat(cat, preferredAction) {
    const paths = normalizeVideoPaths(cat && cat.videoPaths);
    const idleVideo = getCatVideoUrl(cat, 'idle');
    const currentAction = paths[preferredAction] ? preferredAction : 'idle';
    const currentVideo = getCatVideoUrl(cat, currentAction);
    const ready = !!idleVideo;
    const missingCount = ACTIONS.filter((action) => !paths[action.key]).length;
    const keepCurrentVideo = currentVideo && currentVideo === this.data.currentVideo && currentAction === this.data.currentAction;
    const nextData = {
      cat,
      currentAction,
      currentVideo,
      poster: normalizeMediaUrl((cat && (cat.avatar || cat.imageUrl || cat.placeholderImage || cat.anchorFrame)) || ''),
      actionItems: ACTIONS.map((action) => ({
        ...action,
        active: action.key === currentAction,
        generated: !!paths[action.key] || (action.key === 'idle' && !!idleVideo)
      })),
      videoError: false,
      videoErrorDesc: currentVideo ? '网络波动，请稍后重试' : '当前猫咪还没有可播放的视频',
      videoReady: keepCurrentVideo ? this.data.videoReady : false,
      statusText: ready ? (missingCount > 0 ? `还有 ${missingCount} 个互动动作待生成` : '你的小猫已经苏醒。') : '猫咪已创建，等待生成视频。',
      canContinueGeneration: !!cat && (!ready || missingCount > 0)
    };
    if (keepCurrentVideo) {
      delete nextData.currentAction;
      delete nextData.currentVideo;
      delete nextData.videoError;
      delete nextData.videoErrorDesc;
      delete nextData.videoReady;
    }
    this.setData(nextData);
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
    navigateTo('/pages/empty-cat/index');
  },

  selectAction(event) {
    const { action } = event.currentTarget.dataset;
    const cat = this.data.cat;
    if (!cat) return;
    const paths = normalizeVideoPaths(cat.videoPaths);
    const idleVideo = getCatVideoUrl(cat, 'idle');
    if (!idleVideo && action !== 'idle') {
      navigateTo('/pages/generation-progress/index?action=all');
      return;
    }
    if (!paths[action] && !(action === 'idle' && idleVideo)) {
      navigateTo(`/pages/generation-progress/index?action=${action}`);
      return;
    }
    const video = getCatVideoUrl(cat, action);
    this.setData({
      currentAction: action,
      currentVideo: video,
      actionItems: this.data.actionItems.map((item) => ({ ...item, active: item.key === action })),
      bubbleText: BUBBLES[action] || '',
      videoError: false,
      videoErrorDesc: '网络波动，请稍后重试',
      videoReady: false,
      videoRetryKey: this.data.videoRetryKey + 1
    });
    this.grantInteractionReward();
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

  handleVideoLoaded() {
    this.setData({ videoError: false, videoErrorDesc: '网络波动，请稍后重试', videoReady: true });
  },

  handleVideoError(event) {
    const errMsg = event && event.detail && event.detail.errMsg;
    console.warn('[native] home video failed:', {
      currentVideo: this.data.currentVideo,
      errMsg
    });
    const videoErrorDesc = errMsg && /domain|url|src|invalid|fail/i.test(errMsg)
      ? '视频地址或业务域名可能不可用'
      : '网络波动，请稍后重试';
    this.setData({
      videoError: true,
      videoErrorDesc,
      videoReady: false,
      statusText: '视频暂时无法播放，请稍后重试。'
    });
  },

  retryVideo() {
    this.setData({
      videoError: false,
      videoReady: false,
      videoRetryKey: this.data.videoRetryKey + 1,
      statusText: '正在重新加载视频...'
    }, () => {
      const ctx = wx.createVideoContext && wx.createVideoContext(`catVideo-${this.data.videoRetryKey}`, this);
      if (ctx && ctx.play) ctx.play();
    });
  },

  grantInteractionReward() {
    contentStore.grantInteractionPoints().then((result) => {
      if (result && result.granted) this.showPointsToast(result.granted, '互动奖励');
    }).catch(() => undefined);
  },

  showPointsToast(amount, reason) {
    this.setData({ pointsToast: `+${amount} ${reason}` });
    clearTimeout(this.pointsToastTimer);
    this.pointsToastTimer = setTimeout(() => {
      this.setData({ pointsToast: '' });
    }, 1800);
  }
});
