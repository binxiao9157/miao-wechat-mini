const { get, post, del } = require('../utils/request');
const { getItem, setItem } = require('../utils/storage');
const { authService } = require('./auth');
const { dataStore } = require('./data-store');
const { userScopedKey } = require('../types/models');
const { isDataUrl, saveDataUrlToFile } = require('../utils/media');

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
  extractInviteCode(raw) {
    const text = String(raw || '').trim();
    if (!text) return '';

    const inviteMatch = text.match(/[?&]invite=([^&#]+)/);
    if (inviteMatch) return decodeURIComponent(inviteMatch[1]);

    const codeMatch = text.match(/[?&]code=([^&#]+)/);
    if (codeMatch) return decodeURIComponent(codeMatch[1]);

    const pathMatch = text.match(/join-friend\/index[^\s?]*\?([^#\s]+)/);
    if (pathMatch) {
      const params = pathMatch[1];
      const nestedInvite = params.match(/(?:^|&)invite=([^&]+)/);
      if (nestedInvite) return decodeURIComponent(nestedInvite[1]);
    }

    return text;
  },

  getFriends() {
    return parseJson(getItem(scopedKey('miao_friends')), []);
  },

  saveFriends(friends) {
    setItem(scopedKey('miao_friends'), JSON.stringify(Array.isArray(friends) ? friends : []));
  },

  getFriendDiariesLocal() {
    return parseJson(getItem(scopedKey('miao_friend_diaries')), []);
  },

  async normalizeFriendDiary(item = {}) {
    const diary = {
      ...item,
      likes: Number(item.likes || 0),
      isLiked: !!item.isLiked,
      comments: Array.isArray(item.comments) ? item.comments : []
    };
    if (isDataUrl(diary.media)) {
      const savedPath = await saveDataUrlToFile(diary.id, diary.media);
      diary.media = savedPath && !isDataUrl(savedPath) ? savedPath : '';
      diary.mediaCacheFailed = !diary.media;
    }
    delete diary.remoteMedia;
    return diary;
  },

  saveFriendDiaries(diaries) {
    const next = Array.isArray(diaries)
      ? diaries.map((item) => ({
        ...item,
        media: isDataUrl(item.media) ? '' : item.media,
        mediaCacheFailed: !!item.mediaCacheFailed || isDataUrl(item.media),
        remoteMedia: isDataUrl(item.remoteMedia) ? '' : item.remoteMedia,
        likes: Number(item.likes || 0),
        isLiked: !!item.isLiked,
        comments: Array.isArray(item.comments) ? item.comments : []
      })).slice(0, 200)
      : [];
    setItem(scopedKey('miao_friend_diaries'), JSON.stringify(next));
    return next;
  },

  async syncFriends() {
    const res = await get('/api/v1/friends', { timeout: 15000 });
    const friends = Array.isArray(res.data) ? res.data : [];
    this.saveFriends(friends);
    return friends;
  },

  async createInvite(catId) {
    const targetCatId = String(catId || '').trim();
    const cat = targetCatId ? (dataStore.getCatById(targetCatId) || dataStore.getActiveCat()) : dataStore.getActiveCat();
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
    const diaries = await Promise.all((Array.isArray(res.data) ? res.data : []).map((item) => this.normalizeFriendDiary(item)));
    this.saveFriendDiaries(diaries);
    return this.getFriendDiariesLocal();
  },

  async fetchFriendDiaryById(id) {
    if (!id) return null;
    const local = this.getFriendDiariesLocal().find((item) => item.id === id);
    if (local) return local;
    const diaries = await this.getFriendDiaries().catch(() => this.getFriendDiariesLocal());
    return diaries.find((item) => item.id === id) || null;
  },

  updateFriendDiaryLocal(id, updater) {
    const diaries = this.getFriendDiariesLocal();
    const next = diaries.map((item) => {
      if (item.id !== id) return item;
      const patch = typeof updater === 'function' ? updater(item) : updater;
      return {
        ...item,
        ...(patch || {}),
        comments: Array.isArray((patch || {}).comments) ? patch.comments : (item.comments || [])
      };
    });
    this.saveFriendDiaries(next);
    return next.find((item) => item.id === id) || null;
  },

  async likeDiary(diaryId) {
    const optimistic = this.updateFriendDiaryLocal(diaryId, (item) => ({
      isLiked: !item.isLiked,
      likes: Math.max(0, Number(item.likes || 0) + (item.isLiked ? -1 : 1))
    }));
    try {
      const res = await post(`/api/v1/diaries/${encodeURIComponent(diaryId)}/like`, {}, { timeout: 15000 });
      const data = res.data || {};
      return this.updateFriendDiaryLocal(diaryId, {
        isLiked: !!data.liked,
        likes: Number(data.likes || 0)
      });
    } catch (error) {
      console.warn('[native] like friend diary failed:', error);
      return optimistic;
    }
  },

  async commentDiary(diaryId, content) {
    const text = String(content || '').trim();
    if (!text) throw new Error('评论不能为空');
    const fallbackComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: text,
      createdAt: Date.now()
    };
    let comment = fallbackComment;
    try {
      const res = await post(`/api/v1/diaries/${encodeURIComponent(diaryId)}/comments`, { content: text }, { timeout: 15000 });
      comment = (res.data && res.data.comment) || fallbackComment;
    } catch (error) {
      console.warn('[native] comment friend diary failed:', error);
    }
    return this.updateFriendDiaryLocal(diaryId, (item) => ({
      comments: [...(item.comments || []), comment]
    }));
  },

  async deleteComment(diaryId, commentId) {
    try {
      await del(`/api/v1/diaries/${encodeURIComponent(diaryId)}/comments/${encodeURIComponent(commentId)}`, { timeout: 15000 });
    } catch (error) {
      const status = error.response && error.response.status;
      if (!(status === 404 && /^comment_/.test(commentId || ''))) throw error;
      console.warn('[native] delete friend diary comment failed:', error);
    }
    const updated = this.updateFriendDiaryLocal(diaryId, (item) => ({
      comments: (item.comments || []).filter((comment) => comment.id !== commentId)
    }));
    return updated;
  }
};

module.exports = {
  socialStore
};
