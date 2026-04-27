import { getItem, setItem, removeItem, getAllKeys } from '../utils/storageAdapter';
import { trigger } from '../utils/eventAdapter';

const DB_NAME = 'miao_media_db';
const STORE_NAME = 'media';
const DB_VERSION = 1;

export const mediaStorage = {
  db: null as any,

  async init(): Promise<any> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = (window as any).indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onerror = (event: any) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  async saveMedia(id: string, data: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getMedia(id: string): Promise<string | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteMedia(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export interface UserInfo {
  username: string;
  nickname: string;
  avatar: string;
  password?: string;
}

export interface CatInfo {
  id: string;
  name: string;
  breed: string;
  color: string;
  avatar: string;
  source: 'created' | 'uploaded';
  createdAt?: number;
  videoPath?: string;
  videoPaths?: {
    idle?: string;
    tail?: string;
    rubbing?: string;
    blink?: string;
    petting?: string;
    feeding?: string;
    teasing?: string;
  };
  remoteVideoUrl?: string;
  placeholderImage?: string;
  anchorFrame?: string;
  isUnlocking?: boolean;
}

export interface AppSettings {
  greetingsEnabled: boolean;
  pushNotifications: boolean;
  timeLetterReminder: boolean;
}

export interface Comment {
  id: string;
  content: string;
}

export interface DiaryEntry {
  id: string;
  catId: string;
  content: string;
  media?: string;
  mediaType?: 'image' | 'video';
  createdAt: number;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
}

export interface FriendDiaryEntry extends DiaryEntry {
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  catName: string;
}

export interface TimeLetter {
  id: string;
  catId: string;
  catAvatar: string;
  title?: string;
  content: string;
  unlockAt: number;
  createdAt: number;
}

export interface PointTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  reason: string;
  timestamp: number;
}

export interface FriendInfo {
  id: string;
  nickname: string;
  avatar: string;
  catName: string;
  catAvatar: string;
  addedAt: number;
}

export interface PointsInfo {
  total: number;
  lastLoginDate: string | null;
  dailyInteractionPoints: number;
  lastInteractionDate: string | null;
  onlineMinutes: number;
  lastOnlineUpdate: number;
  history: PointTransaction[];
}

export interface PresetCat {
  id: string;
  name: string;
  imageUrl: string;
}

const STORAGE_KEYS = {
  USERS: 'miao_users',
  CURRENT_USER: 'miao_current_user',
  TOKEN: 'miao_auth_token',
  USER_AVATAR: 'user_avatar_key',
  LAST_CAT_IMAGE: 'miao_last_cat_image',
  LAST_CAT_BREED: 'miao_last_cat_breed',
  LAST_USERNAME: 'miao_last_username',
  APP_PRESET_CATS: 'app_preset_cats',
  LAST_READ_NOTIFICATION_TIME: 'miao_last_read_notifications',
  READ_NOTIFICATION_IDS: 'miao_read_notification_ids',
};

const DEFAULT_PRESET_CATS: PresetCat[] = [
  { id: 'british_shorthair', name: '英国短毛猫', imageUrl: 'https://picsum.photos/seed/british_shorthair/800/800' },
  { id: 'ragdoll', name: '布偶猫', imageUrl: 'https://picsum.photos/seed/ragdoll/800/800' },
  { id: 'persian', name: '波斯猫', imageUrl: 'https://picsum.photos/seed/persian/800/800' },
  { id: 'maine_coon', name: '缅因猫', imageUrl: 'https://picsum.photos/seed/maine_coon/800/800' },
  { id: 'siamese', name: '暹罗猫', imageUrl: 'https://picsum.photos/seed/siamese/800/800' },
];

const USER_DATA_KEYS = {
  CAT_LIST: 'miao_cat_list',
  ACTIVE_CAT_ID: 'miao_active_cat_id',
  SETTINGS: 'miao_settings',
  DIARIES: 'miao_diaries',
  TIME_LETTERS: 'miao_time_letters',
  POINTS: 'miao_points',
  FRIENDS: 'miao_friends',
  FRIEND_DIARIES: 'miao_friend_diaries',
  HAS_SUBMITTED_SURVEY: 'miao_has_submitted_survey',
  IS_FAST_FORWARD: 'miao_debug_fast_forward',
};

function getCurrentUsername(): string | null {
  try {
    const raw = getItem('miao_current_user');
    if (!raw) return null;
    return JSON.parse(raw).username || null;
  } catch { return null; }
}

function syncCatToServer(userId: string, cat: CatInfo) {
  request('/api/cats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, cat: { ...cat, placeholderImage: undefined, anchorFrame: undefined } }),
  }).catch(() => {});
}

function deleteCatFromServer(userId: string, catId: string) {
  request(`/api/cats/${encodeURIComponent(userId)}/${encodeURIComponent(catId)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

function deleteAllCatsFromServer(userId: string) {
  request(`/api/cats/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
}

async function request(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function syncDiaryToServer(userId: string, diary: DiaryEntry) {
  const { media, ...rest } = diary;
  const payload = media?.startsWith('indexeddb:') ? rest : diary;
  request('/api/diaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, diary: payload }),
  }).catch(() => {});
}

function deleteDiaryFromServer(userId: string, diaryId: string) {
  request(`/api/diaries/${encodeURIComponent(userId)}/${encodeURIComponent(diaryId)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

function syncLetterToServer(userId: string, letter: TimeLetter) {
  request('/api/letters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, letter }),
  }).catch(() => {});
}

function deleteLetterFromServer(userId: string, letterId: string) {
  request(`/api/letters/${encodeURIComponent(userId)}/${encodeURIComponent(letterId)}`, {
    method: 'DELETE',
  }).catch(() => {});
}

function syncPointsToServer(userId: string, data: PointsInfo) {
  request('/api/points', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, data }),
  }).catch(() => {});
}

const MAX_DIARIES = 200;
const MAX_FRIEND_DIARIES = 100;
const MAX_TIME_LETTERS = 100;

let cachedUserPrefix: string = 'guest';
let cachedCurrentUserRaw: string | null = null;
const memCache = new Map<string, { raw: string | null; parsed: unknown }>();

function safeClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function cachedRead<T>(storageKey: string, defaultValue: T): T {
  const raw = getItem(storageKey);
  const entry = memCache.get(storageKey);
  if (entry && entry.raw === raw) {
    return safeClone(entry.parsed as T);
  }
  if (raw === null) {
    memCache.set(storageKey, { raw: null, parsed: defaultValue });
    return safeClone(defaultValue);
  }
  try {
    const parsed = JSON.parse(raw) as T;
    memCache.set(storageKey, { raw, parsed });
    return parsed ?? safeClone(defaultValue);
  } catch {
    memCache.set(storageKey, { raw, parsed: defaultValue });
    return safeClone(defaultValue);
  }
}

function invalidateCache(storageKey: string) {
  memCache.delete(storageKey);
}

const refreshUserPrefix = () => {
  const currentUserRaw = getItem(STORAGE_KEYS.CURRENT_USER);
  if (currentUserRaw === cachedCurrentUserRaw) return;
  cachedCurrentUserRaw = currentUserRaw;

  if (!currentUserRaw) {
    cachedUserPrefix = 'guest';
    return;
  }

  try {
    const user = JSON.parse(currentUserRaw) as UserInfo;
    cachedUserPrefix = `u_${user.username}`;
  } catch (e) {
    console.error("Error parsing current user in refreshUserPrefix:", e);
    cachedUserPrefix = 'guest';
  }
};

const getUserKey = (key: string) => {
  if (cachedCurrentUserRaw === null) {
    refreshUserPrefix();
  }
  return `${cachedUserPrefix}_${key}`;
};

export const storage = {
  setItem: (key: string, value: string): boolean => {
    try {
      setItem(key, value);
      return true;
    } catch (e) {
      console.error(`Error setting storage key "${key}":`, e);
      return false;
    }
  },

  pruneStorage: () => {
    try {
      const allKeys = getAllKeys();
      for (const key of allKeys) {
        if (key.endsWith(USER_DATA_KEYS.DIARIES)) {
          try {
            const data = getItem(key);
            if (data) {
              const diaries = JSON.parse(data) as DiaryEntry[];
              if (diaries.length > 200) {
                const old = diaries.slice(0, -200);
                const recent = diaries.slice(-200);
                for (const d of old) {
                  delete (d as any).media;
                  delete (d as any).mediaData;
                }
                setItem(key, JSON.stringify([...old, ...recent]));
              }
            }
          } catch (e) {}
        }
      }

      const cats = storage.getCatList();
      if (cats.length > 5) {
        const activeId = storage.getActiveCatId();
        const sorted = [...cats].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const keep = new Set<string>();
        if (activeId) keep.add(activeId);
        for (const c of sorted) {
          if (keep.size >= 5) break;
          keep.add(c.id);
        }
        let freed = false;
        for (const c of cats) {
          if (!keep.has(c.id)) {
            delete c.placeholderImage;
            delete c.anchorFrame;
            freed = true;
          }
        }
        if (freed) {
          setItem(getUserKey(USER_DATA_KEYS.CAT_LIST), JSON.stringify(cats));
        }
      }
    } catch (e) {
      console.error("Error during storage pruning:", e);
    }
  },

  removeItem: (key: string) => {
    try {
      removeItem(key);
    } catch (e) {
      console.error(`Error removing storage key "${key}":`, e);
    }
  },

  safeParse: <T>(key: string, defaultValue: T): T => {
    try {
      const data = getItem(key);
      if (!data) return defaultValue;
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : (parsed as T);
    } catch (e) {
      console.error(`Error parsing storage key "${key}":`, e);
      return defaultValue;
    }
  },

  saveUserInfo: (info: UserInfo) => {
    storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(info));
    invalidateCache(STORAGE_KEYS.CURRENT_USER);
    storage.setItem(STORAGE_KEYS.LAST_USERNAME, info.username);
    refreshUserPrefix();

    const users = storage.safeParse<UserInfo[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.username === info.username);
    if (index >= 0) {
      users[index] = info;
    } else {
      users.push(info);
    }
    storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    if (info.avatar) {
      storage.setItem(getUserKey(STORAGE_KEYS.USER_AVATAR), info.avatar);
    }
  },

  getUserInfo: (): UserInfo | null => {
    const info = cachedRead<UserInfo | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (info) {
      const savedAvatar = getItem(getUserKey(STORAGE_KEYS.USER_AVATAR));
      if (savedAvatar) {
        info.avatar = savedAvatar;
      }
    }
    return info;
  },

  getAllUsers: (): UserInfo[] => {
    return storage.safeParse<UserInfo[]>(STORAGE_KEYS.USERS, []);
  },

  findUser: (username: string): UserInfo | null => {
    const users = storage.getAllUsers();
    return users.find(u => u.username === username) || null;
  },

  updatePassword: (username: string, newPassword: string): boolean => {
    const users = storage.getAllUsers();
    const index = users.findIndex(u => u.username === username);
    if (index >= 0) {
      users[index].password = newPassword;
      storage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      const currentUser = storage.getUserInfo();
      if (currentUser && currentUser.username === username) {
        currentUser.password = newPassword;
        storage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      }
      return true;
    }
    return false;
  },

  saveToken: (token: string) => {
    storage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  getToken: () => {
    try {
      return getItem(STORAGE_KEYS.TOKEN);
    } catch (e) {
      return null;
    }
  },

  removeToken: () => {
    storage.removeItem(STORAGE_KEYS.TOKEN);
  },

  saveLoginTime: (time: number) => {
    storage.setItem('miao_login_time', time.toString());
  },

  getLoginTime: () => {
    const time = getItem('miao_login_time');
    return time ? parseInt(time, 10) : null;
  },

  saveLastActiveTime: (time: number) => {
    storage.setItem('miao_last_active_time', time.toString());
  },

  getLastActiveTime: () => {
    const time = getItem('miao_last_active_time');
    return time ? parseInt(time, 10) : null;
  },

  clearCurrentUser: () => {
    storage.removeItem(STORAGE_KEYS.CURRENT_USER);
    invalidateCache(STORAGE_KEYS.CURRENT_USER);
    storage.removeItem(STORAGE_KEYS.TOKEN);
    removeItem('miao_login_time');
    removeItem('miao_last_active_time');
    refreshUserPrefix();
  },

  clearAll: () => {
    const user = storage.getUserInfo();
    if (user) {
      const prefix = `u_${user.username}_`;
      const allKeys = getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith(prefix)) {
          removeItem(key);
        }
      }
      const users = storage.getAllUsers().filter(u => u.username !== user.username);
      setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    storage.clearCurrentUser();
  },

  getLastUsername: (): string => {
    try {
      return getItem(STORAGE_KEYS.LAST_USERNAME) || "";
    } catch (e) {
      return "";
    }
  },

  getCatList: (): CatInfo[] => {
    return cachedRead<CatInfo[]>(getUserKey(USER_DATA_KEYS.CAT_LIST), []);
  },

  getCatById: (id: string): CatInfo | null => {
    const list = storage.getCatList();
    return list.find(c => c.id === id) || null;
  },

  saveCatList: (list: CatInfo[]) => {
    const key = getUserKey(USER_DATA_KEYS.CAT_LIST);
    storage.setItem(key, JSON.stringify(list));
    invalidateCache(key);
  },

  syncFromServer: async (username: string): Promise<void> => {
    const enc = encodeURIComponent(username);
    try {
      const catResp = await fetch(`/api/cats/${enc}`);
      if (catResp.ok) {
        const serverCats: CatInfo[] = await catResp.json();
        if (!serverCats.length) {
          const local = storage.getCatList();
          for (const cat of local) syncCatToServer(username, cat);
        } else {
          const localCats = storage.getCatList();
          const localMap = new Map(localCats.map(c => [c.id, c]));
          const serverMap = new Map(serverCats.map(c => [c.id, c]));
          const merged: CatInfo[] = [];
          const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);
          for (const id of allIds) {
            const l = localMap.get(id);
            const s = serverMap.get(id);
            if (l && s) merged.push((l.createdAt || 0) >= (s.createdAt || 0) ? l : s);
            else if (l) { merged.push(l); syncCatToServer(username, l); }
            else if (s) merged.push(s);
          }
          storage.saveCatList(merged);
          if (merged.length > 0 && !storage.getActiveCatId()) storage.setActiveCatId(merged[0].id);
        }
      }
    } catch {}

    try {
      const resp = await fetch(`/api/diaries/${enc}`);
      if (resp.ok) {
        const serverDiaries: DiaryEntry[] = await resp.json();
        const localDiaries = storage.getDiaries();
        const localMap = new Map(localDiaries.map(d => [d.id, d]));
        const serverMap = new Map(serverDiaries.map(d => [d.id, d]));
        const merged: DiaryEntry[] = [];
        const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);
        for (const id of allIds) {
          const l = localMap.get(id);
          const s = serverMap.get(id);
          if (l && s) merged.push((l.createdAt || 0) >= (s.createdAt || 0) ? l : s);
          else if (l) { merged.push(l); syncDiaryToServer(username, l); }
          else if (s) merged.push(s);
        }
        merged.sort((a, b) => b.createdAt - a.createdAt);
        const key = getUserKey(USER_DATA_KEYS.DIARIES);
        storage.setItem(key, JSON.stringify(merged.slice(0, MAX_DIARIES)));
        invalidateCache(key);
      }
    } catch {}

    try {
      const resp = await fetch(`/api/letters/${enc}`);
      if (resp.ok) {
        const serverLetters: TimeLetter[] = await resp.json();
        const localLetters = storage.getTimeLetters();
        const localMap = new Map(localLetters.map(l => [l.id, l]));
        const serverMap = new Map(serverLetters.map(l => [l.id, l]));
        const merged: TimeLetter[] = [];
        const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);
        for (const id of allIds) {
          const l = localMap.get(id);
          const s = serverMap.get(id);
          if (l && s) merged.push((l.createdAt || 0) >= (s.createdAt || 0) ? l : s);
          else if (l) { merged.push(l); syncLetterToServer(username, l); }
          else if (s) merged.push(s);
        }
        merged.sort((a, b) => b.createdAt - a.createdAt);
        const key = getUserKey(USER_DATA_KEYS.TIME_LETTERS);
        storage.setItem(key, JSON.stringify(merged.slice(0, MAX_TIME_LETTERS)));
        invalidateCache(key);
      }
    } catch {}

    try {
      const resp = await fetch(`/api/points/${enc}`);
      if (resp.ok) {
        const serverPoints = await resp.json();
        if (serverPoints) {
          const localPoints = storage.getPoints();
          if ((serverPoints.total || 0) > (localPoints.total || 0)) {
            const key = getUserKey(USER_DATA_KEYS.POINTS);
            storage.setItem(key, JSON.stringify(serverPoints));
            invalidateCache(key);
          } else {
            syncPointsToServer(username, localPoints);
          }
        } else {
          syncPointsToServer(username, storage.getPoints());
        }
      }
    } catch {}
  },

  saveCatInfo: (cat: CatInfo) => {
    const list = storage.getCatList();
    const index = list.findIndex(c => c.id === cat.id);
    if (index >= 0) {
      list[index] = cat;
    } else {
      list.push(cat);
    }
    storage.saveCatList(list);
    storage.setActiveCatId(cat.id);
    const userId = getCurrentUsername();
    if (userId) syncCatToServer(userId, cat);
  },

  getActiveCatId: (): string | null => {
    try {
      return getItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
    } catch (e) {
      return null;
    }
  },

  setActiveCatId: (id: string) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID), id);
    trigger('active-cat-changed', { catId: id });
  },

  getActiveCat: (): CatInfo | null => {
    const list = storage.getCatList();
    const activeId = storage.getActiveCatId();
    const active = list.find(c => c.id === activeId) || list[0] || null;
    return active;
  },

  getCatInfo: (): CatInfo | null => {
    return storage.getActiveCat();
  },

  getLastCatImage: (): string | null => {
    try {
      const lastUsername = storage.getLastUsername();
      if (lastUsername) {
        const listKey = `u_${lastUsername}_${USER_DATA_KEYS.CAT_LIST}`;
        const activeIdKey = `u_${lastUsername}_${USER_DATA_KEYS.ACTIVE_CAT_ID}`;
        const listData = getItem(listKey);
        const activeId = getItem(activeIdKey);
        if (listData) {
          const list = JSON.parse(listData) as CatInfo[];
          const active = list.find(c => c.id === activeId) || list[0];
          if (active) {
            return active.avatar;
          }
        }
      }
      return getItem(STORAGE_KEYS.LAST_CAT_IMAGE);
    } catch (e) {
      return null;
    }
  },

  syncLastCat: () => {
    return true;
  },

  getPoints: (): PointsInfo => {
    const p = cachedRead<PointsInfo>(getUserKey(USER_DATA_KEYS.POINTS), {
      total: 0,
      lastLoginDate: null,
      dailyInteractionPoints: 0,
      lastInteractionDate: null,
      onlineMinutes: 0,
      lastOnlineUpdate: Date.now(),
      history: []
    });

    if (!p.history) p.history = [];

    const today = new Date().toISOString().slice(0, 10);
    let expectedMinimum = 0;
    if (p.lastLoginDate === today) expectedMinimum += 10;
    if (p.lastInteractionDate === today) expectedMinimum += p.dailyInteractionPoints;
    if (p.onlineMinutes >= 10) expectedMinimum += 10;

    if (p.total < expectedMinimum) {
      p.total = expectedMinimum;
      storage.setItem(getUserKey(USER_DATA_KEYS.POINTS), JSON.stringify(p));
    }

    return p;
  },

  savePoints: (points: PointsInfo) => {
    const key = getUserKey(USER_DATA_KEYS.POINTS);
    storage.setItem(key, JSON.stringify(points));
    invalidateCache(key);
    const userId = getCurrentUsername();
    if (userId) syncPointsToServer(userId, points);
  },

  addPoints: (amount: number, reason: string = '系统奖励') => {
    const points = storage.getPoints();
    points.total += amount;
    points.history.unshift({
      id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
      type: 'earn',
      amount,
      reason,
      timestamp: Date.now()
    });
    if (points.history.length > 50) points.history.pop();
    storage.savePoints(points);
    return points.total;
  },

  getUnlockThreshold: (): number => {
    const cats = storage.getCatList();
    return cats.length * 200;
  },

  deductPoints: (amount: number, reason: string = '积分消耗') => {
    const points = storage.getPoints();
    if (points.total >= amount) {
      points.total -= amount;
      points.history.unshift({
        id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
        type: 'spend',
        amount,
        reason,
        timestamp: Date.now()
      });
      if (points.history.length > 50) points.history.pop();
      storage.savePoints(points);
      return true;
    }
    return false;
  },

  saveSettings: (settings: AppSettings) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.SETTINGS), JSON.stringify(settings));
  },

  getSettings: (): AppSettings => {
    return storage.safeParse<AppSettings>(getUserKey(USER_DATA_KEYS.SETTINGS), {
      greetingsEnabled: true,
      pushNotifications: true,
      timeLetterReminder: true
    });
  },

  getDiaries: (): DiaryEntry[] => {
    return storage.safeParse<DiaryEntry[]>(getUserKey(USER_DATA_KEYS.DIARIES), []);
  },

  saveDiaries: (diaries: DiaryEntry[]): boolean => {
    const trimmed = diaries.length > MAX_DIARIES ? diaries.slice(0, MAX_DIARIES) : diaries;
    const success = storage.setItem(getUserKey(USER_DATA_KEYS.DIARIES), JSON.stringify(trimmed));

    if (success) {
      trigger('diary-updated');
    }

    const userId = getCurrentUsername();
    if (userId) {
      for (const d of trimmed) syncDiaryToServer(userId, d);
    }

    return success;
  },

  deleteDiary: (id: string) => {
    const diaries = storage.getDiaries();
    const diary = diaries.find(d => d.id === id);
    if (diary?.media?.startsWith('indexeddb:')) {
      mediaStorage.deleteMedia(id);
    }
    const updated = diaries.filter(d => d.id !== id);
    storage.saveDiaries(updated);
    const userId = getCurrentUsername();
    if (userId) deleteDiaryFromServer(userId, id);
    return updated;
  },

  deleteComment: (diaryId: string, commentId: string) => {
    const diaries = storage.getDiaries();
    const diary = diaries.find(d => d.id === diaryId);
    if (diary) {
      diary.comments = diary.comments.filter(c => c.id !== commentId);
      return storage.saveDiaries(diaries);
    }
    return diaries;
  },

  getTimeLetters: (): TimeLetter[] => {
    return storage.safeParse<TimeLetter[]>(getUserKey(USER_DATA_KEYS.TIME_LETTERS), []);
  },

  saveTimeLetters: (letters: TimeLetter[]) => {
    const trimmed = letters.length > MAX_TIME_LETTERS ? letters.slice(0, MAX_TIME_LETTERS) : letters;
    storage.setItem(getUserKey(USER_DATA_KEYS.TIME_LETTERS), JSON.stringify(trimmed));
    const userId = getCurrentUsername();
    if (userId) {
      for (const l of trimmed) syncLetterToServer(userId, l);
    }
  },

  deleteTimeLetter: (id: string): TimeLetter[] => {
    const letters = storage.getTimeLetters();
    const updated = letters.filter(l => l.id !== id);
    storage.saveTimeLetters(updated);
    const userId = getCurrentUsername();
    if (userId) deleteLetterFromServer(userId, id);
    return updated;
  },

  clearMediaCache: () => {
    const diaries = storage.getDiaries();
    const cleaned = diaries.map(d => ({ ...d, media: undefined }));
    storage.saveDiaries(cleaned);
  },

  deleteCatById: (id: string) => {
    const list = storage.getCatList();
    const updated = list.filter(c => c.id !== id);
    storage.saveCatList(updated);

    const activeId = storage.getActiveCatId();
    if (activeId === id) {
      if (updated.length > 0) {
        storage.setActiveCatId(updated[0].id);
      } else {
        storage.removeItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
      }
    }
    const userId = getCurrentUsername();
    if (userId) deleteCatFromServer(userId, id);
    return updated;
  },

  deleteCat: () => {
    storage.removeItem(getUserKey(USER_DATA_KEYS.CAT_LIST));
    storage.removeItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
    const userId = getCurrentUsername();
    if (userId) deleteAllCatsFromServer(userId);
  },

  getFriends: (): FriendInfo[] => {
    return storage.safeParse<FriendInfo[]>(getUserKey(USER_DATA_KEYS.FRIENDS), []);
  },

  addFriend: (friend: FriendInfo) => {
    const friends = storage.getFriends();
    if (!friends.find(f => f.id === friend.id)) {
      friends.push(friend);
      storage.setItem(getUserKey(USER_DATA_KEYS.FRIENDS), JSON.stringify(friends));

      const mockDiaries: FriendDiaryEntry[] = [
        {
          id: `fdiary_${friend.id}_1`,
          catId: `cat_${friend.id}`,
          authorId: friend.id,
          authorNickname: friend.nickname,
          authorAvatar: friend.avatar,
          catName: friend.catName,
          content: `今天和 ${friend.catName} 一起晒了太阳，它睡得好香呀～`,
          media: `https://picsum.photos/seed/${friend.id}_1/800/600`,
          mediaType: 'image',
          createdAt: Date.now() - 3600000,
          likes: 5,
          isLiked: false,
          comments: []
        },
        {
          id: `fdiary_${friend.id}_2`,
          catId: `cat_${friend.id}`,
          authorId: friend.id,
          authorNickname: friend.nickname,
          authorAvatar: friend.avatar,
          catName: friend.catName,
          content: `${friend.catName} 好像又胖了一点点，是不是该减肥了？`,
          media: `https://picsum.photos/seed/${friend.id}_2/800/600`,
          mediaType: 'image',
          createdAt: Date.now() - 86400000,
          likes: 12,
          isLiked: true,
          comments: [{ id: 'c1', content: '好可爱的猫咪！' }]
        },
        {
          id: `fdiary_${friend.id}_3`,
          catId: `cat_${friend.id}`,
          authorId: friend.id,
          authorNickname: friend.nickname,
          authorAvatar: friend.avatar,
          catName: friend.catName,
          content: `新买的逗猫棒，${friend.catName} 玩疯了哈哈。`,
          media: `https://picsum.photos/seed/${friend.id}_3/800/600`,
          mediaType: 'image',
          createdAt: Date.now() - 172800000,
          likes: 8,
          isLiked: false,
          comments: []
        }
      ];
      const existingFriendDiaries = storage.getFriendDiaries();
      storage.saveFriendDiaries([...mockDiaries, ...existingFriendDiaries]);

      return true;
    }
    return false;
  },

  getFriendDiaries: (): FriendDiaryEntry[] => {
    return storage.safeParse<FriendDiaryEntry[]>(getUserKey(USER_DATA_KEYS.FRIEND_DIARIES), []);
  },

  saveFriendDiaries: (diaries: FriendDiaryEntry[]) => {
    const trimmed = diaries.length > MAX_FRIEND_DIARIES ? diaries.slice(0, MAX_FRIEND_DIARIES) : diaries;
    storage.setItem(getUserKey(USER_DATA_KEYS.FRIEND_DIARIES), JSON.stringify(trimmed));
  },

  getPresetCats: (): PresetCat[] => {
    return storage.safeParse<PresetCat[]>(STORAGE_KEYS.APP_PRESET_CATS, DEFAULT_PRESET_CATS);
  },

  savePresetCats: (presets: PresetCat[]) => {
    storage.setItem(STORAGE_KEYS.APP_PRESET_CATS, JSON.stringify(presets));
  },

  setHasSubmittedSurvey: (hasSubmitted: boolean) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.HAS_SUBMITTED_SURVEY), hasSubmitted.toString());
  },

  getHasSubmittedSurvey: (): boolean => {
    return getItem(getUserKey(USER_DATA_KEYS.HAS_SUBMITTED_SURVEY)) === 'true';
  },

  setIsFastForward: (enabled: boolean) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.IS_FAST_FORWARD), enabled.toString());
    trigger('fast-forward-changed', { enabled });
  },

  getIsFastForward: (): boolean => {
    return getItem(getUserKey(USER_DATA_KEYS.IS_FAST_FORWARD)) === 'true';
  },

  getLastReadNotificationTime: (): number => {
    const val = getItem(getUserKey(STORAGE_KEYS.LAST_READ_NOTIFICATION_TIME));
    return val ? parseInt(val, 10) : 0;
  },

  markNotificationsAsRead: () => {
    storage.setItem(getUserKey(STORAGE_KEYS.LAST_READ_NOTIFICATION_TIME), Date.now().toString());
    trigger('notifications-read');
  },

  getReadNotificationIds: (): string[] => {
    return storage.safeParse<string[]>(getUserKey(STORAGE_KEYS.READ_NOTIFICATION_IDS), []);
  },

  markNotificationAsRead: (id: string) => {
    const ids = storage.getReadNotificationIds();
    if (!ids.includes(id)) {
      ids.push(id);
      storage.setItem(getUserKey(STORAGE_KEYS.READ_NOTIFICATION_IDS), JSON.stringify(ids));
      trigger('notifications-read', { id });
    }
  },
};