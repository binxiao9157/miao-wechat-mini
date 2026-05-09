const { dataStore } = require('../../services/data-store');
const { ACTION_PROMPTS, submitVideoTask, pollVideoResult, persistVideo } = require('../../services/volcano');
const { reLaunch } = require('../../utils/nav');

Page({
  data: {
    phase: 'generating',
    progress: 5,
    statusText: '正在准备生成...',
    error: '',
    videoUrl: ''
  },

  onLoad() {
    this.started = false;
    this.start();
  },

  async start() {
    if (this.started) return;
    this.started = true;

    const cat = dataStore.getActiveCat();
    if (!cat) {
      reLaunch('/pages/empty-cat/index');
      return;
    }

    const idleVideo = cat.videoPaths && cat.videoPaths.idle;
    if (idleVideo) {
      this.setData({ phase: 'success', progress: 100, statusText: '生成成功', videoUrl: idleVideo });
      return;
    }

    try {
      await dataStore.updateCatAndSync(cat.id, {
        generationStatus: 'pending',
        generationError: '',
        generationUpdatedAt: Date.now()
      });

      this.setData({ phase: 'generating', progress: 10, statusText: '正在提交视频任务...' });
      const task = await submitVideoTask(cat.avatar, ACTION_PROMPTS.idle);
      this.setData({ progress: 30, statusText: '正在注入生命力...' });

      const rawVideoUrl = await pollVideoResult(task.id, (status) => {
        const next = Math.min(this.data.progress + 5, 88);
        this.setData({ progress: next, statusText: status === 'queued' ? '排队等待中...' : '正在生成动作视频...' });
      });

      this.setData({ progress: 92, statusText: '正在保存视频...' });
      const permanentUrl = await persistVideo(rawVideoUrl, cat.id, 'idle');
      await dataStore.updateCatAndSync(cat.id, {
        generationStatus: 'ready',
        generationError: '',
        generationUpdatedAt: Date.now(),
        videoPath: permanentUrl,
        videoPaths: {
          ...(cat.videoPaths || {}),
          idle: permanentUrl
        }
      });

      this.setData({ phase: 'success', progress: 100, statusText: '生成成功', videoUrl: permanentUrl });
    } catch (error) {
      await dataStore.updateCatAndSync(cat.id, {
        generationStatus: 'failed',
        generationError: error.message || '生成失败',
        generationUpdatedAt: Date.now()
      }).catch(() => {});
      this.setData({ phase: 'error', error: error.message || '生成失败，请重试' });
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
