const { get, post, del, put } = require('../utils/request');
const { getItem, setItem } = require('../utils/storage');
const { authService } = require('./auth');
const { dataStore } = require('./data-store');
const { userScopedKey } = require('../types/models');

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
  history: []
};

const contentStore = {
  getDiaries() {
    return parseJson(getItem(scopedKey('miao_diaries')), []);
  },

  saveDiaries(diaries) {
    setItem(scopedKey('miao_diaries'), JSON.stringify(Array.isArray(diaries) ? diaries : []));
  },

  async syncDiariesFromServer() {
    const res = await get('/api/v1/diaries', { timeout: 15000 });
    const diaries = Array.isArray(res.data) ? res.data : [];
    this.saveDiaries(diaries);
    return diaries;
  },

  async addDiary(content) {
    const cat = dataStore.getActiveCat();
    const text = String(content || '').trim();
    if (!text) throw new Error('日记内容不能为空');
    const diary = {
      id: nowId('diary'),
      catId: cat && cat.id,
      catName: cat && cat.name,
      catAvatar: cat && cat.avatar,
      content: text,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const diaries = this.getDiaries();
    diaries.unshift(diary);
    this.saveDiaries(diaries);
    try {
      await post('/api/v1/diaries', { diary }, { timeout: 15000 });
    } catch (error) {
      console.warn('[native] sync diary failed:', error);
    }
    return diary;
  },

  async deleteDiary(id) {
    this.saveDiaries(this.getDiaries().filter((item) => item.id !== id));
    try {
      await del(`/api/v1/diaries/${encodeURIComponent(id)}`, { timeout: 15000 });
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

  async addLetter(content, unlockAt) {
    const text = String(content || '').trim();
    if (!text) throw new Error('信件内容不能为空');
    const letter = {
      id: nowId('letter'),
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
  },

  getPoints() {
    return parseJson(getItem(scopedKey('miao_points')), DEFAULT_POINTS);
  },

  savePoints(points) {
    const next = { ...DEFAULT_POINTS, ...(points || {}), updatedAt: Date.now() };
    setItem(scopedKey('miao_points'), JSON.stringify(next));
    return next;
  },

  async syncPointsFromServer() {
    const res = await get('/api/v1/points', { timeout: 15000 });
    if (res.data) this.savePoints(res.data);
    return this.getPoints();
  },

  async grantDailyLogin() {
    const points = this.getPoints();
    const date = today();
    if (points.lastLoginDate === date) return points;
    const next = {
      ...points,
      total: (points.total || 0) + 10,
      lastLoginDate: date,
      history: [
        { id: nowId('points'), type: 'earn', amount: 10, reason: '每日登录奖励', createdAt: Date.now() },
        ...(points.history || [])
      ].slice(0, 50)
    };
    this.savePoints(next);
    try {
      await post('/api/v1/points', { data: next }, { timeout: 15000 });
    } catch (error) {
      console.warn('[native] sync points failed:', error);
    }
    return next;
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
    try {
      await put('/api/v1/notifications/read-all', {}, { timeout: 15000 });
    } catch (error) {
      console.warn('[native] mark notifications read failed:', error);
    }
  }
};

module.exports = {
  contentStore
};
