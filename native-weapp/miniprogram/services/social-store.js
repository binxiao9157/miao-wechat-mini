const { get, post } = require('../utils/request');
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

const socialStore = {
  getFriends() {
    return parseJson(getItem(scopedKey('miao_friends')), []);
  },

  saveFriends(friends) {
    setItem(scopedKey('miao_friends'), JSON.stringify(Array.isArray(friends) ? friends : []));
  },

  async syncFriends() {
    const res = await get('/api/v1/friends', { timeout: 15000 });
    const friends = Array.isArray(res.data) ? res.data : [];
    this.saveFriends(friends);
    return friends;
  },

  async createInvite() {
    const cat = dataStore.getActiveCat();
    const res = await post('/api/v1/friend-invites', {
      catId: cat && cat.id,
      catName: cat && cat.name,
      catAvatar: cat && cat.avatar
    }, { timeout: 15000 });
    return res.data && res.data.invite;
  },

  async getInvite(code) {
    const res = await get(`/api/v1/friend-invites/${encodeURIComponent(code)}`, { timeout: 15000 });
    return res.data && res.data.invite;
  },

  async acceptInvite(code) {
    const res = await post('/api/v1/friends/accept', { code }, { timeout: 15000 });
    await this.syncFriends().catch(() => undefined);
    return res.data && res.data.friend;
  },

  async getFriendDiaries() {
    const res = await get('/api/v1/friends/diaries', { timeout: 15000 });
    return Array.isArray(res.data) ? res.data : [];
  }
};

module.exports = {
  socialStore
};
