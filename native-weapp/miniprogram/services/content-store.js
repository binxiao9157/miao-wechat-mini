const { get, post, del, put } = require('../utils/request');
const { getItem, setItem } = require('../utils/storage');
const { authService } = require('./auth');
const { dataStore } = require('./data-store');
const { userScopedKey } = require('../types/models');
const { isDataUrl, readFileAsDataUrl, saveDataUrlToFile } = require('../utils/media');

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function scopedKey(key) {
  const user = authService.getCachedUser();
  return user && user.username ? userScopedKey(user.username, key) : key;
}

function nowId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_POINTS = {
  total: 0,
  lastLoginDate: '',
  dailyInteractionPoints: 0,
  lastInteractionDate: '',
  onlineMinutes: 0,
  lastOnlineUpdate: Date.now(),
  history: []
};

const DEFAULT_SETTINGS = {
  pushNotifications: true,
  greetingsEnabled: true,
  timeLetterReminder: true
};

function normalizeDiary(item = {}) {
  return {
    ...item,
    id: item.id || nowId('diary'),
    content: item.content || '',
    media: item.media || item.mediaUrl || '',
    mediaType: item.mediaType || '',
    likes: Number(item.likes || 0),
    isLiked: !!item.isLiked,
    comments: Array.isArray(item.comments) ? item.comments : [],
    createdAt: item.createdAt || item.timestamp || Date.now()
  };
}

async function normalizeServerDiary(item = {}) {
  const diary = normalizeDiary(item);
  if (isDataUrl(diary.media)) {
    const savedPath = await saveDataUrlToFile(diary.id, diary.media);
    diary.media = savedPath && !isDataUrl(savedPath) ? savedPath : '';
    diary.mediaCacheFailed = !diary.media;
  }
  delete diary.remoteMedia;
  return diary;
}

function sanitizeDiaryForStorage(item = {}) {
  const diary = normalizeDiary(item);
  if (isDataUrl(diary.media)) {
    diary.media = '';
    diary.mediaCacheFailed = true;
  }
  if (isDataUrl(diary.remoteMedia)) delete diary.remoteMedia;
  return diary;
}

function normalizePoints(raw = {}) {
  const merged = {
    ...DEFAULT_POINTS,
    ...raw,
    lastLoginDate: raw.lastLoginDate || '',
    lastInteractionDate: raw.lastInteractionDate || '',
    lastOnlineUpdate: raw.lastOnlineUpdate || Date.now(),
    history: Array.isArray(raw.history) ? raw.history : []
  };
  return merged;
}

const contentStore = {
  formatNotificationTime(timestamp) {
    const diff = Date.now() - Number(timestamp || Date.now());
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    const date = new Date(timestamp || Date.now());
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${`${date.getMinutes()}`.padStart(2, '0')}`;
  },

  getGreetingTitle() {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  },

  getSettings() {
    return {
      ...DEFAULT_SETTINGS,
      ...parseJson(getItem(scopedKey('miao_settings')), DEFAULT_SETTINGS)
    };
  },

  saveSettings(settings) {
    const next = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    setItem(scopedKey('miao_settings'), JSON.stringify(next));
    return next;
  },

  async updateSettings(patch) {
    const next = this.saveSettings({ ...this.getSettings(), ...(patch || {}) });
    try {
      await put('/api/v1/me/settings', next, { timeout: 15000 });
    } catch (error) {
      console.warn('[native] sync notification settings failed:', error);
    }
    return next;
  },

  buildNotificationItems() {
    const readIds = this.getReadNotificationIds();
    const todayText = new Date().toISOString().slice(0, 10);
    const serverNotifications = this.getNotifications().map((item) => ({
      id: item.id,
      type: item.type || 'friend_share',
      title: item.title || '通知',
      content: item.content,
      time: item.createdAt || item.time || Date.now(),
      target: item.type === 'letter' ? '/pages/time-letters/index' : item.type === 'points' ? '/pages/points/index' : '/pages/diary/index',
      read: !!item.read || readIds.includes(item.id),
      source: 'server'
    }));
    const letters = this.getLetters()
      .filter((item) => Date.now() >= (item.unlockAt || 0))
      .map((item) => ({
        id: `letter_${item.id}`,
        type: 'letter',
        title: '时光信件已解锁',
        content: `"${item.title || '一封来自过去的信'}" 可以查看了`,
        time: item.unlockAt || item.createdAt || Date.now(),
        target: '/pages/time-letters/index',
        read: !!item.read || readIds.includes(`letter_${item.id}`),
        source: 'local'
      }));
    const points = (this.getPoints().history || []).slice(0, 5).map((item) => {
      const amount = Number(item.amount || 0);
      return {
        id: `points_${item.id}`,
        type: 'points',
        title: amount >= 0 ? '积分收入' : '积分支出',
        content: `${item.reason || '积分变化'}：${amount >= 0 ? '+' : ''}${amount} 积分`,
        time: item.createdAt || item.timestamp || Date.now(),
        target: '/pages/points/index',
        read: readIds.includes(`points_${item.id}`),
        source: 'local'
      };
    });
    const greetingItem = {
      id: `greeting_${todayText}`,
      type: 'greeting',
      title: `${this.getGreetingTitle()}，喵~`,
      content: '今天也要和猫咪一起度过美好的一天。',
      time: new Date().setHours(8, 0, 0, 0),
      target: '/pages/home/index',
      read: readIds.includes(`greeting_${todayText}`),
      source: 'local'
    };
    return [...serverNotifications, ...letters, ...points, greetingItem]
      .sort((a, b) => (b.time || 0) - (a.time || 0))
      .map((item) => ({ ...item, timeLabel: this.formatNotificationTime(item.time), unread: !item.read }));
  },

  getUnreadNotificationCount() {
    return this.buildNotificationItems().filter((item) => item.unread).length;
  },

  getDeletedDiaryIds() {
    return parseJson(getItem(scopedKey('miao_deleted_diaries')), []);
  },

  saveDeletedDiaryIds(ids) {
    setItem(scopedKey('miao_deleted_diaries'), JSON.stringify(Array.isArray(ids) ? ids.slice(0, 100) : []));
  },

  rememberDeletedDiary(id) {
    if (!id) return;
    const ids = this.getDeletedDiaryIds();
    if (!ids.includes(id)) this.saveDeletedDiaryIds([id, ...ids]);
  },

  forgetDeletedDiary(id) {
    if (!id) return;
    this.saveDeletedDiaryIds(this.getDeletedDiaryIds().filter((item) => item !== id));
  },

  getDiaries() {
    return parseJson(getItem(scopedKey('miao_diaries')), []).map(normalizeDiary);
  },

  saveDiaries(diaries) {
    const next = Array.isArray(diaries) ? diaries.map(sanitizeDiaryForStorage).slice(0, 200) : [];
    setItem(scopedKey('miao_diaries'), JSON.stringify(next));
    return next;
  },

  async syncDiariesFromServer() {
    const res = await get('/api/v1/diaries', { timeout: 15000 });
    const serverDiaries = await Promise.all((Array.isArray(res.data) ? res.data : []).map(normalizeServerDiary));
    const localDiaries = this.getDiaries();
    const localMap = new Map(localDiaries.map((item) => [item.id, item]));
    const serverMap = new Map(serverDiaries.map((item) => [item.id, item]));
    const deleted = new Set(this.getDeletedDiaryIds());
    const merged = [];
    const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);

    for (const id of allIds) {
      const local = localMap.get(id);
      const server = serverMap.get(id);
      if (deleted.has(id)) {
        if (server) this.syncDiaryDelete(id).catch(() => undefined);
        continue;
      }
      if (local && server) {
        merged.push(sanitizeDiaryForStorage({
          ...local,
          media: server.media || local.media,
          likes: server.likes,
          isLiked: server.isLiked,
          comments: server.comments,
          mediaCacheFailed: server.mediaCacheFailed || local.mediaCacheFailed,
          syncStatus: 'synced',
          syncError: ''
        }));
      } else if (local) {
        merged.push(local);
        if (local.syncStatus !== 'syncing') {
          this.syncDiaryToServer(local)
            .then(() => this.markDiarySynced(local.id))
            .catch((error) => {
              this.markDiarySyncFailed(local.id, error);
              console.warn('[native] retry diary sync failed:', error);
            });
        }
      } else if (server) {
        merged.push(server);
      }
    }

    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    this.saveDiaries(merged);
    return merged;
  },

  async resolveDiaryForServer(diary) {
    const payload = { ...normalizeDiary(diary) };
    delete payload.remoteMedia;
    delete payload.mediaCacheFailed;
    delete payload.syncStatus;
    delete payload.syncError;
    if (payload.media && !/^https?:\/\//i.test(payload.media) && !/^data:/i.test(payload.media)) {
      payload.media = await readFileAsDataUrl(payload.media, payload.mediaType);
    }
    return payload;
  },

  async syncDiaryToServer(diary) {
    const payload = await this.resolveDiaryForServer(diary);
    const res = await post('/api/v1/diaries', { diary: payload }, { timeout: 50000 });
    this.forgetDeletedDiary(payload.id);
    return res.data;
  },

  markDiarySynced(id) {
    if (!id) return null;
    return this.updateDiaryLocal(id, { syncStatus: 'synced', syncError: '' });
  },

  markDiarySyncFailed(id, error) {
    if (!id) return null;
    const message = error && error.message ? error.message : '同步失败，稍后自动重试';
    return this.updateDiaryLocal(id, { syncStatus: 'failed', syncError: message });
  },

  async retryDiarySync(id) {
    const diary = this.getDiaries().find((item) => item.id === id);
    if (!diary) throw new Error('未找到日记');
    this.updateDiaryLocal(id, { syncStatus: 'syncing', syncError: '' });
    try {
      await this.syncDiaryToServer({ ...diary, syncStatus: 'syncing', syncError: '' });
      return this.markDiarySynced(id);
    } catch (error) {
      this.markDiarySyncFailed(id, error);
      throw error;
    }
  },

  async replaceDiaryMediaAndSync(id, media, mediaType) {
    const diary = this.updateDiaryLocal(id, {
      media: media || '',
      mediaType: mediaType || '',
      mediaLoadError: false,
      mediaCacheFailed: false,
      syncStatus: 'syncing',
      syncError: ''
    });
    if (!diary) throw new Error('未找到日记');
    return this.retryDiarySync(id);
  },

  async fetchDiaryById(id) {
    if (!id) return null;
    const local = this.getDiaries().find((item) => item.id === id);
    if (local) return local;
    try {
      const res = await get(`/api/v1/diaries/${encodeURIComponent(id)}`, { timeout: 15000 });
      const payload = res.data && (res.data.diary || res.data);
      if (!payload || !payload.id) return null;
      const diary = await normalizeServerDiary(payload);
      const diaries = this.getDiaries();
      if (!diaries.some((item) => item.id === diary.id)) {
        this.saveDiaries([diary, ...diaries]);
      }
      return diary;
    } catch (error) {
      const status = error.response && error.response.status;
      if (status !== 404) console.warn('[native] fetch diary by id failed:', error);
      return null;
    }
  },

  async syncDiaryDelete(id) {
    await del(`/api/v1/diaries/${encodeURIComponent(id)}`, { timeout: 15000 });
    this.forgetDeletedDiary(id);
  },

  async addDiary(content, options = {}) {
    const cat = dataStore.getActiveCat();
    const text = String(content || '').trim();
    if (!text && !options.media) throw new Error('日记内容不能为空');
    const diary = {
      id: nowId('diary'),
      catId: cat && cat.id,
      catName: cat && cat.name,
      catAvatar: cat && cat.avatar,
      content: text,
      media: options.media || '',
      mediaType: options.mediaType || '',
      likes: 0,
      isLiked: false,
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'syncing',
      syncError: ''
    };
    const diaries = this.getDiaries();
    diaries.unshift(diary);
    this.saveDiaries(diaries);
    try {
      await this.syncDiaryToServer(diary);
      this.markDiarySynced(diary.id);
    } catch (error) {
      this.markDiarySyncFailed(diary.id, error);
      console.warn('[native] sync diary failed:', error);
    }
    return diary;
  },

  updateDiaryLocal(id, updater) {
    const diaries = this.getDiaries();
    const next = diaries.map((item) => {
      if (item.id !== id) return item;
      const patch = typeof updater === 'function' ? updater(item) : updater;
      return normalizeDiary({ ...item, ...(patch || {}), updatedAt: Date.now() });
    });
    this.saveDiaries(next);
    return next.find((item) => item.id === id) || null;
  },

  async likeDiary(id) {
    const current = this.getDiaries().find((item) => item.id === id);
    if (!current) throw new Error('未找到日记');
    const optimistic = this.updateDiaryLocal(id, (item) => ({
      isLiked: !item.isLiked,
      likes: Math.max(0, Number(item.likes || 0) + (item.isLiked ? -1 : 1))
    }));
    try {
      const res = await post(`/api/v1/diaries/${encodeURIComponent(id)}/like`, {}, { timeout: 15000 });
      const data = res.data || {};
      return this.updateDiaryLocal(id, {
        isLiked: !!data.liked,
        likes: Number(data.likes || 0)
      });
    } catch (error) {
      console.warn('[native] like diary failed:', error);
      return optimistic;
    }
  },

  async commentDiary(id, content) {
    const text = String(content || '').trim();
    if (!text) throw new Error('评论不能为空');
    const user = authService.getCachedUser() || {};
    const fallbackComment = {
      id: nowId('comment'),
      content: text,
      authorId: user.username || '',
      authorNickname: user.nickname || user.username || '我',
      createdAt: Date.now()
    };
    let comment = fallbackComment;
    try {
      const res = await post(`/api/v1/diaries/${encodeURIComponent(id)}/comments`, { content: text }, { timeout: 15000 });
      comment = (res.data && res.data.comment) || fallbackComment;
    } catch (error) {
      console.warn('[native] comment diary failed:', error);
    }
    return this.updateDiaryLocal(id, (item) => ({
      comments: [...(item.comments || []), comment]
    }));
  },

  async deleteComment(diaryId, commentId) {
    try {
      await del(`/api/v1/diaries/${encodeURIComponent(diaryId)}/comments/${encodeURIComponent(commentId)}`, { timeout: 15000 });
    } catch (error) {
      const status = error.response && error.response.status;
      if (!(status === 404 && /^comment_/.test(commentId || ''))) throw error;
      console.warn('[native] delete diary comment failed:', error);
    }
    const updated = this.updateDiaryLocal(diaryId, (item) => ({
      comments: (item.comments || []).filter((comment) => comment.id !== commentId)
    }));
    return updated;
  },

  async deleteDiary(id) {
    this.rememberDeletedDiary(id);
    this.saveDiaries(this.getDiaries().filter((item) => item.id !== id));
    try {
      await this.syncDiaryDelete(id);
    } catch (error) {
      console.warn('[native] delete diary failed:', error);
    }
  },

  getLetters() {
    return parseJson(getItem(scopedKey('miao_time_letters')), []);
  },

  saveLetters(letters) {
    setItem(scopedKey('miao_time_letters'), JSON.stringify(Array.isArray(letters) ? letters : []));
  },

  async syncLettersFromServer() {
    const res = await get('/api/v1/letters', { timeout: 15000 });
    const letters = Array.isArray(res.data) ? res.data : [];
    this.saveLetters(letters);
    return letters;
  },

  async addLetter(content, unlockAt, meta = {}) {
    const text = String(content || '').trim();
    if (!text) throw new Error('信件内容不能为空');
    const letter = {
      id: nowId('letter'),
      catId: meta.catId || '',
      catAvatar: meta.catAvatar || '',
      catName: meta.catName || '',
      title: String(meta.title || '').trim(),
      content: text,
      createdAt: Date.now(),
      unlockAt: unlockAt || Date.now() + 86400000,
      read: false
    };
    const letters = this.getLetters();
    letters.unshift(letter);
    this.saveLetters(letters);
    try {
      await post('/api/v1/letters', { letter }, { timeout: 15000 });
    } catch (error) {
      console.warn('[native] sync letter failed:', error);
    }
    return letter;
  },

  markLetterRead(id) {
    const letters = this.getLetters().map((letter) => (
      letter.id === id ? { ...letter, read: true } : letter
    ));
    this.saveLetters(letters);
    this.saveReadNotificationIds([...this.getReadNotificationIds(), `letter_${id}`]);
  },

  getPoints() {
    const points = normalizePoints(parseJson(getItem(scopedKey('miao_points')), DEFAULT_POINTS));
    const expectedMinimum = this.getExpectedDailyMinimum(points);
    if ((points.total || 0) < expectedMinimum) {
      points.total = expectedMinimum;
      setItem(scopedKey('miao_points'), JSON.stringify(points));
    }
    return points;
  },

  savePoints(points) {
    const next = { ...normalizePoints(points), updatedAt: Date.now() };
    setItem(scopedKey('miao_points'), JSON.stringify(next));
    return next;
  },

  async syncPointsFromServer() {
    const res = await get('/api/v1/points', { timeout: 15000 });
    if (res.data) this.savePoints(res.data);
    return this.getPoints();
  },

  getExpectedDailyMinimum(points) {
    const p = normalizePoints(points);
    const date = today();
    let expected = 0;
    if (p.lastLoginDate === date) expected += 10;
    if (p.lastInteractionDate === date) expected += Number(p.dailyInteractionPoints || 0);
    if (Number(p.onlineMinutes || 0) >= 10) expected += 10;
    return expected;
  },

  async syncPoints(points) {
    try {
      await post('/api/v1/points', { data: points }, { timeout: 15000 });
    } catch (error) {
      console.warn('[native] sync points failed:', error);
    }
  },

  async addPoints(amount, reason, patch = {}) {
    const value = Number(amount || 0);
    const points = this.getPoints();
    if (value <= 0) return points;
    const next = {
      ...points,
      ...patch,
      total: (points.total || 0) + value,
      history: [
        { id: nowId('points'), type: 'earn', amount: value, reason: reason || '系统奖励', createdAt: Date.now(), timestamp: Date.now() },
        ...(points.history || [])
      ].slice(0, 50)
    };
    const saved = this.savePoints(next);
    await this.syncPoints(saved);
    return saved;
  },

  async grantDailyLogin() {
    const points = this.getPoints();
    const date = today();
    if (points.lastLoginDate === date) return points;
    return this.addPoints(10, '每日登录奖励', {
      lastLoginDate: date,
      dailyInteractionPoints: 0,
      lastInteractionDate: '',
      onlineMinutes: 0,
      lastOnlineUpdate: Date.now()
    });
  },

  async grantInteractionPoints() {
    const points = this.getPoints();
    const date = today();
    const dailyInteractionPoints = points.lastInteractionDate === date ? Number(points.dailyInteractionPoints || 0) : 0;
    if (dailyInteractionPoints >= 20) return { points, granted: 0 };
    const nextValue = dailyInteractionPoints + 5;
    const next = await this.addPoints(5, '互动奖励', {
      lastInteractionDate: date,
      dailyInteractionPoints: nextValue
    });
    return { points: next, granted: 5 };
  },

  async updateOnlineMinutes() {
    const points = this.getPoints();
    const now = Date.now();
    const last = points.lastOnlineUpdate || now;
    if (now - last > 5 * 60000) {
      const saved = this.savePoints({ ...points, lastOnlineUpdate: now });
      await this.syncPoints(saved);
      return { points: saved, granted: 0 };
    }
    const diffMinutes = Math.floor((now - last) / 60000);
    if (diffMinutes < 1) return { points, granted: 0 };
    const previousMinutes = Number(points.onlineMinutes || 0);
    const nextMinutes = previousMinutes + diffMinutes;
    const shouldReward = nextMinutes >= 10 && previousMinutes < 10;
    const patch = {
      onlineMinutes: nextMinutes,
      lastOnlineUpdate: now
    };
    if (shouldReward) {
      const next = await this.addPoints(10, '在线时长奖励', patch);
      return { points: next, granted: 10 };
    }
    const saved = this.savePoints({ ...points, ...patch });
    await this.syncPoints(saved);
    return { points: saved, granted: 0 };
  },

  async spendPoints(amount, reason) {
    const cost = Number(amount || 0);
    let points = this.getPoints();
    if (cost <= 0) return points;
    if (this.getIsPointsCheat() && (points.total || 0) < cost) {
      points = this.savePoints({ ...points, total: cost });
    }
    if ((points.total || 0) < cost) throw new Error('积分不足');
    const next = {
      ...points,
      total: (points.total || 0) - cost,
      history: [
        { id: nowId('points'), type: 'spend', amount: -cost, reason: reason || '积分消耗', createdAt: Date.now() },
        ...(points.history || [])
      ].slice(0, 50)
    };
    this.savePoints(next);
    await this.syncPoints(next);
    return next;
  },

  async refundPoints(amount, reason) {
    const value = Number(amount || 0);
    const points = this.getPoints();
    if (value <= 0) return points;
    const next = {
      ...points,
      total: (points.total || 0) + value,
      history: [
        { id: nowId('points'), type: 'refund', amount: value, reason: reason || '积分返还', createdAt: Date.now() },
        ...(points.history || [])
      ].slice(0, 50)
    };
    this.savePoints(next);
    await this.syncPoints(next);
    return next;
  },

  getUnlockThreshold() {
    const count = dataStore.getCats().length;
    return count * 200;
  },

  getIsPointsCheat() {
    return getItem(scopedKey('miao_debug_points_cheat')) === '1';
  },

  setIsPointsCheat(enabled) {
    setItem(scopedKey('miao_debug_points_cheat'), enabled ? '1' : '0');
  },

  getEffectivePoints(threshold) {
    const total = this.getPoints().total || 0;
    return this.getIsPointsCheat() ? Math.max(total, Number(threshold || 0)) : total;
  },

  getPointTasks() {
    const points = this.getPoints();
    const date = today();
    return [
      {
        id: 'login',
        title: '每日首次登录',
        reward: 10,
        description: '每天第一次打开小程序即可获得',
        completed: points.lastLoginDate === date,
        action: ''
      },
      {
        id: 'interaction',
        title: '完成1次猫咪互动',
        reward: 5,
        description: '在首页轻点、双击或滑动猫咪',
        completed: points.lastInteractionDate === date && Number(points.dailyInteractionPoints || 0) > 0,
        action: 'home'
      },
      {
        id: 'online',
        title: '单日登录时长超10分钟',
        reward: 10,
        description: '累计在线时间达到10分钟',
        completed: Number(points.onlineMinutes || 0) >= 10,
        action: ''
      }
    ];
  },

  getNotifications() {
    return parseJson(getItem(scopedKey('miao_notifications')), []);
  },

  saveNotifications(items) {
    setItem(scopedKey('miao_notifications'), JSON.stringify(Array.isArray(items) ? items : []));
  },

  async syncNotificationsFromServer() {
    const res = await get('/api/v1/notifications', { timeout: 15000 });
    const notifications = Array.isArray(res.data) ? res.data : [];
    this.saveNotifications(notifications);
    return notifications;
  },

  async markAllNotificationsRead() {
    const items = this.getNotifications().map((item) => ({ ...item, read: true }));
    this.saveNotifications(items);
    this.saveReadNotificationIds([
      ...this.getReadNotificationIds(),
      ...items.map((item) => item.id).filter(Boolean)
    ]);
    try {
      await put('/api/v1/notifications/read-all', {}, { timeout: 15000 });
    } catch (error) {
      console.warn('[native] mark notifications read failed:', error);
    }
  },

  getReadNotificationIds() {
    return parseJson(getItem(scopedKey('miao_read_notification_ids')), []);
  },

  saveReadNotificationIds(ids) {
    setItem(scopedKey('miao_read_notification_ids'), JSON.stringify(Array.from(new Set(ids || [])).slice(0, 300)));
  },

  async markNotificationRead(id, source) {
    if (!id) return;
    this.saveReadNotificationIds([...this.getReadNotificationIds(), id]);
    this.saveNotifications(this.getNotifications().map((item) => (
      item.id === id ? { ...item, read: true } : item
    )));
    if (source === 'server') {
      try {
        await put(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {}, { timeout: 15000 });
      } catch (error) {
        console.warn('[native] mark notification read failed:', error);
      }
    }
  }
};

module.exports = {
  contentStore
};
