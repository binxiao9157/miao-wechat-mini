const { dataStore } = require('../../services/data-store');
const { safeBack, navigateTo } = require('../../utils/nav');

const ACTIONS = [
  { key: 'idle', label: '苏醒' },
  { key: 'tail', label: '摸头' },
  { key: 'rubbing', label: '踩奶' },
  { key: 'blink', label: '逗猫' }
];

Page({
  data: {
    cat: null,
    currentAction: 'idle',
    videoUrl: '',
    actions: []
  },

  onLoad(options = {}) {
    this.catId = options.id || '';
  },

  onShow() {
    const cat = this.catId ? dataStore.getCatById(this.catId) : dataStore.getActiveCat();
    if (!cat) {
      safeBack('/pages/cat-history/index');
      return;
    }
    this.applyCat(cat, 'idle');
  },

  applyCat(cat, action) {
    const paths = cat.videoPaths || {};
    const fallback = paths.idle || cat.videoPath || '';
    const videoUrl = paths[action] || fallback;
    this.setData({
      cat,
      currentAction: action,
      videoUrl,
      actions: ACTIONS.map((item) => ({
        ...item,
        active: item.key === action,
        generated: !!paths[item.key] || (item.key === 'idle' && !!fallback)
      }))
    });
  },

  goBack() {
    safeBack('/pages/cat-history/index');
  },

  selectAction(event) {
    const action = event.currentTarget.dataset.action;
    const target = this.data.actions.find((item) => item.key === action);
    if (!target || !target.generated) {
      navigateTo(`/pages/generation-progress/index?action=${action}`);
      return;
    }
    this.applyCat(this.data.cat, action);
  }
});
