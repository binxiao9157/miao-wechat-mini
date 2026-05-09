const { get, post, del } = require('../utils/request');
const { getItem, setItem, removeItem } = require('../utils/storage');
const { authService } = require('./auth');
const { userScopedKey } = require('../types/models');
const { events } = require('../utils/event-bus');
const { generationTasks } = require('./generation-tasks');

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

const DEFAULT_PRESET_CATS = [
  { id: 'british_shorthair', name: '英国短毛猫', imageUrl: 'https://fastly.picsum.photos/id/534/800/800.jpg?hmac=DijMB8QbxnoQc_h2Sol9Uh3CypfI5ml6agCoUj8-cEY' },
  { id: 'ragdoll', name: '布偶猫', imageUrl: 'https://fastly.picsum.photos/id/366/800/800.jpg?hmac=R8t4TxfCjjhVEcB-QZq9c2mTa8YufuOVZV0_pgABCBQ' },
  { id: 'persian', name: '波斯猫', imageUrl: 'https://fastly.picsum.photos/id/219/800/800.jpg?hmac=jtAqs0bVp0OWaGB1TzTJ4pgcnTAvAw3GL7X3liCjhXQ' },
  { id: 'maine_coon', name: '缅因猫', imageUrl: 'https://fastly.picsum.photos/id/293/800/800.jpg?hmac=AcdZBXya3-oW-8OFNZnNQmWD1rUESR9TagsKbEyf8NU' },
  { id: 'siamese', name: '暹罗猫', imageUrl: 'https://fastly.picsum.photos/id/164/800/800.jpg?hmac=-vrHqnVZ5JXaSiIV-qbYsO6fUd1_YjwsX82JGuoMk6g' }
];

const dataStore = {
  getPresetCats() {
    return parseJson(getItem('app_preset_cats'), DEFAULT_PRESET_CATS);
  },

  savePresetCats(presets) {
    const next = Array.isArray(presets)
      ? presets
        .filter((item) => item && item.id && item.name && item.imageUrl)
        .map((item) => ({ id: item.id, name: item.name, imageUrl: item.imageUrl }))
      : DEFAULT_PRESET_CATS;
    setItem('app_preset_cats', JSON.stringify(next));
    return next;
  },

  resetPresetCats() {
    removeItem('app_preset_cats');
    return DEFAULT_PRESET_CATS;
  },

  getCats() {
    return parseJson(getItem(scopedKey('miao_cat_list')), []);
  },

  saveCats(cats) {
    const nextCats = Array.isArray(cats) ? cats : [];
    setItem(scopedKey('miao_cat_list'), JSON.stringify(nextCats));
    const activeId = getItem(scopedKey('miao_active_cat_id'));
    if (activeId && !nextCats.some((cat) => cat.id === activeId)) {
      this.saveActiveCatId(nextCats[0] ? nextCats[0].id : '');
    }
    events.emit('cats:updated', { cats: this.getCats() });
  },

  getActiveCat() {
    const cats = this.getCats();
    const activeId = getItem(scopedKey('miao_active_cat_id'));
    return cats.find((cat) => cat.id === activeId) || cats[0] || null;
  },

  getActiveCatId() {
    return getItem(scopedKey('miao_active_cat_id')) || '';
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
    events.emit('active-cat:updated', { catId });
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
    const res = await post('/api/v1/cats', { cat }, { timeout: 15000 });
    return res.data;
  },

  async createDraftCat({ name, breed, color, avatar, source, placeholderImage, anchorFrame }) {
    const now = Date.now();
    const cat = {
      id: `cat_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name: name || '小猫',
      breed: breed || '未知',
      color: color || '温暖色',
      avatar: avatar || '/assets/logo.png',
      source: source || 'created',
      placeholderImage: placeholderImage || avatar || '/assets/logo.png',
      anchorFrame: anchorFrame || avatar || '/assets/logo.png',
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

  deleteCatLocal(catId) {
    const remaining = this.getCats().filter((cat) => cat.id !== catId);
    this.saveCats(remaining);
    const activeId = this.getActiveCatId();
    if (activeId === catId) {
      this.saveActiveCatId(remaining[0] ? remaining[0].id : '');
    }
    generationTasks.clearCat(catId);
    return remaining;
  },

  async deleteCatById(catId) {
    const remaining = this.deleteCatLocal(catId);
    try {
      await this.deleteCatFromServer(catId);
    } catch (error) {
      console.warn('[native] delete cat from server failed:', error);
    }
    return remaining;
  },

  getCatStats(cat) {
    if (!cat) return { days: 0, videoCount: 0 };
    const start = cat.createdAt || Date.now();
    const days = Math.max(1, Math.ceil((Date.now() - start) / 86400000));
    const videoCount = Object.values(cat.videoPaths || {}).filter(Boolean).length;
    return { days, videoCount };
  },

  clearUserCache() {
    const username = currentUsername();
    if (!username) return;
    removeItem(userScopedKey(username, 'miao_cat_list'));
    removeItem(userScopedKey(username, 'miao_active_cat_id'));
    generationTasks.clearUserCache();
  }
};

module.exports = {
  dataStore
};
