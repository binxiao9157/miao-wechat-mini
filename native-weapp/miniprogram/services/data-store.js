const { get, post, del } = require('../utils/request');
const { getItem, setItem, removeItem } = require('../utils/storage');
const { authService } = require('./auth');
const { userScopedKey } = require('../types/models');
const { events } = require('../utils/event-bus');

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function currentUsername() {
  const user = authService.getCachedUser();
  return user && user.username;
}

function scopedKey(key) {
  const username = currentUsername();
  return username ? userScopedKey(username, key) : key;
}

const dataStore = {
  getCats() {
    return parseJson(getItem(scopedKey('miao_cat_list')), []);
  },

  saveCats(cats) {
    setItem(scopedKey('miao_cat_list'), JSON.stringify(Array.isArray(cats) ? cats : []));
    events.emit('cats:updated', { cats: this.getCats() });
  },

  getActiveCat() {
    const cats = this.getCats();
    const activeId = getItem(scopedKey('miao_active_cat_id'));
    return cats.find((cat) => cat.id === activeId) || cats[0] || null;
  },

  getCatById(catId) {
    return this.getCats().find((cat) => cat.id === catId) || null;
  },

  saveCat(cat) {
    if (!cat || !cat.id) return null;
    const cats = this.getCats();
    const idx = cats.findIndex((item) => item.id === cat.id);
    const nextCat = {
      ...cat,
      updatedAt: Date.now()
    };
    if (idx >= 0) cats[idx] = { ...cats[idx], ...nextCat };
    else cats.unshift(nextCat);
    this.saveCats(cats);
    this.saveActiveCatId(nextCat.id);
    return nextCat;
  },

  saveActiveCatId(catId) {
    if (catId) setItem(scopedKey('miao_active_cat_id'), catId);
    else removeItem(scopedKey('miao_active_cat_id'));
  },

  async syncCatsFromServer() {
    const res = await get('/api/v1/cats', { timeout: 15000 });
    const cats = Array.isArray(res.data)
      ? res.data
      : (Array.isArray(res.data && res.data.cats) ? res.data.cats : []);
    this.saveCats(cats);
    if (cats[0] && !getItem(scopedKey('miao_active_cat_id'))) {
      this.saveActiveCatId(cats[0].id);
    }
    return cats;
  },

  async saveCatToServer(cat) {
    const res = await post('/api/v1/cats', cat, { timeout: 15000 });
    return res.data;
  },

  async createDraftCat({ name, breed, color, avatar }) {
    const now = Date.now();
    const cat = {
      id: `cat_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name: name || '小猫',
      breed: breed || '未知',
      color: color || '温暖色',
      avatar: avatar || '/assets/logo.png',
      source: 'created',
      createdAt: now,
      updatedAt: now,
      generationStatus: 'pending',
      videoPaths: {}
    };

    this.saveCat(cat);

    try {
      await this.saveCatToServer(cat);
    } catch (error) {
      console.warn('[native] save draft cat to server failed:', error);
    }

    return cat;
  },

  async updateCatAndSync(catId, updates) {
    const current = this.getCatById(catId);
    if (!current) throw new Error('未找到猫咪数据');
    const updated = this.saveCat({ ...current, ...updates });
    try {
      await this.saveCatToServer(updated);
    } catch (error) {
      console.warn('[native] sync updated cat failed:', error);
    }
    return updated;
  },

  async deleteCatFromServer(catId) {
    const res = await del(`/api/v1/cats/${encodeURIComponent(catId)}`, { timeout: 15000 });
    return res.data;
  },

  clearUserCache() {
    const username = currentUsername();
    if (!username) return;
    removeItem(userScopedKey(username, 'miao_cat_list'));
    removeItem(userScopedKey(username, 'miao_active_cat_id'));
  }
};

module.exports = {
  dataStore
};
