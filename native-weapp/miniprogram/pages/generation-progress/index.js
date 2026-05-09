const { dataStore } = require('../../services/data-store');
const { contentStore } = require('../../services/content-store');
const { ACTION_PROMPTS, submitVideoTask, pollVideoResult, persistVideo } = require('../../services/volcano');
const { generationTasks } = require('../../services/generation-tasks');
const { reLaunch } = require('../../utils/nav');

const ACTIONS = [
  { key: 'idle', label: '苏醒' },
  { key: 'tail', label: '摸头' },
  { key: 'rubbing', label: '踩奶' },
  { key: 'blink', label: '逗猫' }
];

Page({
  data: {
    phase: 'generating',
    progress: 5,
    statusText: '正在准备生成...',
    error: '',
    videoUrl: '',
    actionLabel: '苏醒',
    currentIndex: 1,
    totalCount: 1
  },

  onLoad(options = {}) {
    this.started = false;
    this.redemptionAmount = Number(options.redemptionAmount || 0);
    this.pointsSpent = false;
    this.options = options;
    this.start();
  },

  getActionQueue(cat) {
    const requestedAction = this.options.action || 'idle';
    const shouldGenerateAll = this.options.all === '1' || requestedAction === 'all';
    const existingPaths = cat.videoPaths || {};
    if (shouldGenerateAll) {
      return ACTIONS.filter((action) => !existingPaths[action.key]);
    }
    if (requestedAction !== 'idle' && !existingPaths.idle && !cat.videoPath) {
      return ACTIONS.filter((action) => action.key === 'idle' || action.key === requestedAction);
    }
    return ACTIONS.filter((action) => action.key === requestedAction);
  },

  async start() {
    if (this.started) return;
    this.started = true;

    const cat = dataStore.getActiveCat();
    if (!cat) {
      reLaunch('/pages/empty-cat/index');
      return;
    }

    const queue = this.getActionQueue(cat);
    if (queue.length === 0) {
      const videoUrl = cat.videoPaths?.idle || cat.videoPath || '';
      this.setData({ phase: 'success', progress: 100, statusText: '动作已生成', videoUrl });
      return;
    }

    try {
      if (this.redemptionAmount > 0 && !this.pointsSpent) {
        await contentStore.spendPoints(this.redemptionAmount, '解锁新伙伴');
        this.pointsSpent = true;
      }

      await dataStore.updateCatAndSync(cat.id, {
        generationStatus: 'pending',
        generationError: '',
        generationUpdatedAt: Date.now()
      });

      let latestCat = cat;
      let latestVideoUrl = '';
      for (let index = 0; index < queue.length; index += 1) {
        const action = queue[index];
        latestVideoUrl = await this.generateAction(latestCat, action, index, queue.length);
        latestCat = dataStore.getCatById(cat.id) || latestCat;
      }

      const finishedCat = dataStore.getCatById(cat.id) || latestCat;
      const hasIdleVideo = !!(finishedCat.videoPaths && finishedCat.videoPaths.idle) || !!finishedCat.videoPath;
      await dataStore.updateCatAndSync(cat.id, {
        generationStatus: hasIdleVideo ? 'ready' : 'pending',
        generationError: '',
        generationUpdatedAt: Date.now()
      });

      this.setData({ phase: 'success', progress: 100, statusText: '生成成功', videoUrl: latestVideoUrl });
    } catch (error) {
      if (this.pointsSpent) {
        await contentStore.refundPoints(this.redemptionAmount, '生成失败退还').catch(() => undefined);
        this.pointsSpent = false;
      }
      const latestCat = dataStore.getCatById(cat.id) || cat;
      const hasPlayableVideo = !!(latestCat.videoPaths && latestCat.videoPaths.idle) || !!latestCat.videoPath;
      await dataStore.updateCatAndSync(cat.id, {
        generationStatus: hasPlayableVideo ? 'ready' : 'failed',
        generationError: error.message || '生成失败',
        generationUpdatedAt: Date.now()
      }).catch(() => {});
      this.setData({ phase: 'error', error: error.message || '生成失败，请重试' });
    }
  },

  async generateAction(cat, action, index, total) {
    const existingUrl = cat.videoPaths && cat.videoPaths[action.key];
    if (existingUrl) return existingUrl;

    this.setData({
      phase: 'generating',
      progress: Math.round((index / total) * 100) + 5,
      actionLabel: action.label,
      currentIndex: index + 1,
      totalCount: total,
      statusText: `正在生成${action.label}动作...`
    });

    let taskRecord = generationTasks.get(cat.id, action.key);
    if (!taskRecord || !taskRecord.taskId || taskRecord.status === 'failed') {
      this.setData({ statusText: `正在提交${action.label}任务...` });
      const sourceImage = cat.anchorFrame || cat.avatar;
      const task = await submitVideoTask(sourceImage, ACTION_PROMPTS[action.key]);
      taskRecord = generationTasks.upsert({
        catId: cat.id,
        action: action.key,
        taskId: task.id,
        status: task.status || 'submitted'
      });
    }

    try {
      const rawVideoUrl = await pollVideoResult(taskRecord.taskId, (status) => {
        taskRecord = generationTasks.upsert({ ...taskRecord, status }) || taskRecord;
        const base = Math.round((index / total) * 100);
        const span = Math.floor(78 / total);
        const next = Math.min(base + Math.round(span * 0.7), 88);
        this.setData({
          progress: Math.max(this.data.progress, next),
          statusText: status === 'queued' ? `${action.label}动作排队中...` : `正在生成${action.label}动作...`
        });
      });

      this.setData({ statusText: `正在保存${action.label}视频...`, progress: Math.min(92, 90 + index) });
      const permanentUrl = await persistVideo(rawVideoUrl, cat.id, action.key);
      const currentCat = dataStore.getCatById(cat.id) || cat;
      await dataStore.updateCatAndSync(cat.id, {
        generationStatus: action.key === 'idle' ? 'ready' : currentCat.generationStatus,
        generationError: '',
        generationUpdatedAt: Date.now(),
        videoPath: action.key === 'idle' ? permanentUrl : currentCat.videoPath,
        videoPaths: {
          ...(currentCat.videoPaths || {}),
          [action.key]: permanentUrl
        }
      });
      generationTasks.upsert({ ...taskRecord, status: 'succeeded', videoUrl: permanentUrl });
      generationTasks.clear(cat.id, action.key);
      return permanentUrl;
    } catch (error) {
      generationTasks.upsert({ ...taskRecord, status: 'failed', error: error.message || '生成失败' });
      throw error;
    }
  },

  retry() {
    this.started = false;
    this.setData({ phase: 'generating', progress: 5, error: '', statusText: '正在准备生成...' });
    this.start();
  },

  goHome() {
    reLaunch('/pages/home/index');
  }
});
