import Taro from '@tarojs/taro';
import { getItem, setItem, removeItem, getAllKeys } from '../utils/storageAdapter';
import { trigger } from '../utils/eventAdapter';
import { request as taroRequest } from '../utils/httpAdapter';

// 小程序环境使用文件系统存储媒体文件

const MEDIA_STORAGE_PREFIX = 'miao_media_';

export const mediaStorage = {
  async saveMedia(id: string, data: string): Promise<void> {
    const isMini = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
    
    if (isMini) {
      return new Promise((resolve, reject) => {
        try {
          const fs = Taro.getFileSystemManager();
          const mimeMatch = data.match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch?.[1] || 'image/jpeg';
          const extension = mimeType.startsWith('video/') ? 'mp4' : 'jpg';
          const filePath = `${Taro.env.USER_DATA_PATH}/media_${id}.${extension}`;
          const base64Data = data.replace(/^data:[^;]+;base64,/, '');

          fs.writeFile({
            filePath,
            data: base64Data,
            encoding: 'base64',
            success: () => {
              setItem(`${MEDIA_STORAGE_PREFIX}${id}`, JSON.stringify({ filePath, mimeType }));
              resolve();
            },
            fail: (err) => {
              console.error('FileSystemManager writeFile error:', err);
              reject(err);
            }
          });
        } catch (err) {
          console.error('FileSystemManager error:', err);
          reject(err);
        }
      });
    } else {
      // Web 环境：使用 localStorage（仅适合小文件）
      try {
        setItem(`${MEDIA_STORAGE_PREFIX}${id}`, data);
      } catch (err) {
        console.error('localStorage saveMedia error:', err);
        throw err;
      }
    }
  },

  async getMedia(id: string): Promise<string | null> {
    const isMini = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
    
    if (isMini) {
      const stored = getItem(`${MEDIA_STORAGE_PREFIX}${id}`);
      if (!stored) return null;
      try {
        const parsed = JSON.parse(stored) as { filePath?: string };
        return parsed.filePath || null;
      } catch {
        return stored;
      }
    } else {
      // Web 环境：从 localStorage 读取
      return Promise.resolve(getItem(`${MEDIA_STORAGE_PREFIX}${id}`));
    }
  },

  async deleteMedia(id: string): Promise<void> {
    const isMini = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
    
    if (isMini) {
      // 小程序环境：删除文件
      return new Promise((resolve, reject) => {
        try {
          const stored = getItem(`${MEDIA_STORAGE_PREFIX}${id}`);
          let filePath = stored;
          if (stored) {
            try {
              filePath = (JSON.parse(stored) as { filePath?: string }).filePath || stored;
            } catch {}
          }
          if (filePath) {
            const fs = Taro.getFileSystemManager();
            fs.unlink({
              filePath,
              success: () => {
                removeItem(`${MEDIA_STORAGE_PREFIX}${id}`);
                resolve();
              },
              fail: (err) => {
                console.error('FileSystemManager unlink error:', err);
                reject(err);
              }
            });
          } else {
            resolve();
          }
        } catch (err) {
          console.error('FileSystemManager error:', err);
          reject(err);
        }
      });
    } else {
      // Web 环境：从 localStorage 删除
      removeItem(`${MEDIA_STORAGE_PREFIX}${id}`);
      Promise.resolve();
    }
  }
};

async function readLocalMediaAsDataUrl(id: string): Promise<string | null> {
  const stored = getItem(`${MEDIA_STORAGE_PREFIX}${id}`);
  if (!stored) return null;

  let filePath = stored;
  let mimeType = stored.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
  try {
    const parsed = JSON.parse(stored) as { filePath?: string; mimeType?: string };
    filePath = parsed.filePath || stored;
    mimeType = parsed.mimeType || mimeType;
  } catch {}

  if (!filePath) return null;

  return new Promise((resolve) => {
    try {
      const fs = Taro.getFileSystemManager();
      fs.readFile({
        filePath,
        encoding: 'base64',
        success: (res) => {
          resolve(`data:${mimeType};base64,${res.data}`);
        },
        fail: (err) => {
          console.warn('[storage] read local diary media failed:', err);
          resolve(null);
        },
      });
    } catch (error) {
      console.warn('[storage] read local diary media failed:', error);
      resolve(null);
    }
  });
}

export interface UserInfo {
  username: string;
  nickname: string;
  avatar: string;
  password?: string;
  passwordSet?: boolean;
  openidBound?: boolean;
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
  videoPaths?: Record<string, string | undefined> & {
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
  updatedAt?: number;
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
  updatedAt?: number;
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

// 复用 httpAdapter（自动注入 auth token、base URL、client-type）
async function request(url: string, options: { method?: string; data?: any; headers?: Record<string, string> } = {}): Promise<any> {
  const res = await taroRequest({
    url,
    method: (options.method as any) || 'GET',
    data: options.data,
    headers: options.headers,
  });
  return res.data;
}

async function syncCatToServer(userId: string, cat: CatInfo): Promise<void> {
  await request('/api/v1/cats', {
    method: 'POST',
    data: { cat: { ...cat, placeholderImage: undefined, anchorFrame: undefined } },
  });
}

async function deleteCatFromServer(userId: string, catId: string): Promise<void> {
  await request(`/api/v1/cats/${encodeURIComponent(catId)}`, {
    method: 'DELETE',
  });
}

async function deleteAllCatsFromServer(userId: string): Promise<void> {
  await request('/api/v1/cats', { method: 'DELETE' });
}

async function resolveServerDiaryPayload(diary: DiaryEntry): Promise<DiaryEntry> {
  const { media, ...rest } = diary;

  if (media?.startsWith('miao_media:')) {
    const mediaId = media.replace('miao_media:', '');
    const mediaData = await readLocalMediaAsDataUrl(mediaId);
    return mediaData ? { ...diary, media: mediaData } : rest;
  }

  return diary;
}

async function syncDiaryToServer(userId: string, diary: DiaryEntry) {
  const payload = await resolveServerDiaryPayload(diary);
  request('/api/v1/diaries', {
    method: 'POST',
    data: { diary: payload },
  }).catch((error) => {
    console.warn('[storage] sync diary failed:', error);
  });
}

function deleteDiaryFromServer(userId: string, diaryId: string) {
  request(`/api/v1/diaries/${encodeURIComponent(diaryId)}`, {
    method: 'DELETE',
  }).catch((error) => {
    console.warn('[storage] delete diary failed:', error);
  });
}

function deleteAllDiariesFromServer(userId: string) {
  // v1 暂未提供批量删除日记，逐条删除由调用方执行。
}

function syncLetterToServer(userId: string, letter: TimeLetter) {
  request('/api/v1/letters', {
    method: 'POST',
    data: { letter },
  }).catch((error) => {
    console.warn('[storage] sync letter failed:', error);
  });
}

function deleteLetterFromServer(userId: string, letterId: string) {
  request(`/api/v1/letters/${encodeURIComponent(letterId)}`, {
    method: 'DELETE',
  }).catch((error) => {
    console.warn('[storage] delete letter failed:', error);
  });
}

function syncPointsToServer(userId: string, data: PointsInfo) {
  request('/api/v1/points', {
    method: 'POST',
    data: { data },
  }).catch((error) => {
    console.warn('[storage] sync points failed:', error);
  });
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
    // raw 可能是 JSON 字符串，做防御性处理
    let parsed: any;
    if (typeof raw === 'string') {
      parsed = JSON.parse(raw);
    } else {
      parsed = raw;
    }
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

function stripServerCat(cat: CatInfo & { userId?: string }): CatInfo {
  const { userId, ...rest } = cat;
  return normalizeCatVideoUrls(rest);
}

function getApiBaseURL(): string {
  return (process.env.TARO_APP_API_BASE_URL || '').replace(/\/$/, '');
}

function normalizePlayableVideoUrl(url?: string): string | undefined {
  if (!url) return url;
  if (url.startsWith('/')) {
    const baseURL = getApiBaseURL();
    return baseURL ? `${baseURL}${url}` : url;
  }
  return url.replace(/^http:\/\/localhost(?::|\/)/, (match) => match.replace('localhost', '127.0.0.1'));
}

function normalizeCatVideoUrls(cat: CatInfo): CatInfo {
  const videoPaths = cat.videoPaths
    ? Object.fromEntries(
        Object.entries(cat.videoPaths).map(([action, url]) => [action, normalizePlayableVideoUrl(url)])
      )
    : cat.videoPaths;

  return {
    ...cat,
    videoPath: normalizePlayableVideoUrl(cat.videoPath),
    videoPaths,
    remoteVideoUrl: normalizePlayableVideoUrl(cat.remoteVideoUrl),
  };
}

function mergeCat(local?: CatInfo, remote?: CatInfo): CatInfo {
  if (!local) return stripServerCat(remote as CatInfo);
  if (!remote) return normalizeCatVideoUrls(local);

  const normalizedLocal = normalizeCatVideoUrls(local);
  const normalizedRemote = stripServerCat(remote);
  const localRevision = normalizedLocal.updatedAt || normalizedLocal.createdAt || 0;
  const remoteRevision = normalizedRemote.updatedAt || normalizedRemote.createdAt || 0;
  const base = localRevision >= remoteRevision ? normalizedLocal : normalizedRemote;
  const other = base === normalizedLocal ? normalizedRemote : normalizedLocal;

  return {
    ...other,
    ...base,
    videoPaths: {
      ...(other.videoPaths || {}),
      ...(base.videoPaths || {}),
    },
    videoPath: base.videoPath || other.videoPath,
    remoteVideoUrl: base.remoteVideoUrl || other.remoteVideoUrl,
    placeholderImage: base.placeholderImage || other.placeholderImage,
    anchorFrame: base.anchorFrame || other.anchorFrame,
    updatedAt: Math.max(localRevision, remoteRevision, normalizedLocal.updatedAt || 0, normalizedRemote.updatedAt || 0),
  };
}

function hasMeaningfulCatDifference(a: CatInfo, b: CatInfo): boolean {
  return JSON.stringify({
    ...a,
    placeholderImage: undefined,
    anchorFrame: undefined,
  }) !== JSON.stringify({
    ...b,
    placeholderImage: undefined,
    anchorFrame: undefined,
  });
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
      // getItem 可能返回 JSON 字符串，也可能已被解析（防御性处理）
      let parsed: any;
      if (typeof data === 'string') {
        parsed = JSON.parse(data);
      } else {
        // data 已经是对象/数组（理论上 getItem 总返回字符串，但做防御）
        parsed = data;
      }
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
    return cachedRead<CatInfo[]>(getUserKey(USER_DATA_KEYS.CAT_LIST), []).map(normalizeCatVideoUrls);
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

  syncCatsFromServer: async (): Promise<CatInfo[]> => {
    const username = getCurrentUsername();
    if (!username) return storage.getCatList();

    const response = await request('/api/v1/cats');
    const serverCats: CatInfo[] = Array.isArray(response)
      ? response.map(stripServerCat)
      : [];
    const localCats = storage.getCatList();

    if (!serverCats.length) {
      await Promise.all(localCats.map(cat => syncCatToServer(username, cat).catch(() => undefined)));
      if (localCats.length > 0 && !storage.getActiveCatId()) {
        storage.setActiveCatId(localCats[0].id);
      }
      trigger('cat-list-synced', { cats: localCats });
      return localCats;
    }

    const localMap = new Map(localCats.map(c => [c.id, c]));
    const serverMap = new Map(serverCats.map(c => [c.id, c]));
    const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);
    const merged: CatInfo[] = [];
    const syncBackTasks: Promise<void>[] = [];

    for (const id of allIds) {
      const local = localMap.get(id);
      const remote = serverMap.get(id);
      const cat = mergeCat(local, remote);
      merged.push(cat);

      if (!remote || hasMeaningfulCatDifference(cat, remote)) {
        syncBackTasks.push(syncCatToServer(username, cat).catch(() => undefined));
      }
    }

    merged.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    storage.saveCatList(merged);

    const activeId = storage.getActiveCatId();
    if (merged.length > 0 && (!activeId || !merged.some(cat => cat.id === activeId))) {
      storage.setActiveCatId(merged[0].id);
    }

    await Promise.all(syncBackTasks);
    trigger('cat-list-synced', { cats: merged });
    return merged;
  },

  syncFromServer: async (username: string): Promise<void> => {
    try {
      await storage.syncCatsFromServer();
    } catch (error) {
      console.warn('[storage] sync cats failed:', error);
    }

    try {
      const resp = await request('/api/v1/diaries');
      if (resp) {
        const serverDiaries: DiaryEntry[] = Array.isArray(resp) ? resp : [];
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
    } catch (error) {
      console.warn('[storage] sync diaries failed:', error);
    }

    try {
      const resp = await request('/api/v1/letters');
      if (resp) {
        const serverLetters: TimeLetter[] = Array.isArray(resp) ? resp : [];
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
    } catch (error) {
      console.warn('[storage] sync letters failed:', error);
    }

    try {
      const resp = await request('/api/v1/points');
      if (resp) {
        const serverPoints = resp as PointsInfo;
        const localPoints = storage.getPoints();
        if ((serverPoints.updatedAt || 0) >= (localPoints.updatedAt || 0)) {
          const key = getUserKey(USER_DATA_KEYS.POINTS);
          storage.setItem(key, JSON.stringify(serverPoints));
          invalidateCache(key);
        } else {
          syncPointsToServer(username, localPoints);
        }
      }
    } catch (error) {
      console.warn('[storage] sync points failed:', error);
    }
  },

  saveCatInfo: (cat: CatInfo) => {
    const nextCat = {
      ...cat,
      updatedAt: Date.now(),
    };
    const list = storage.getCatList();
    const index = list.findIndex(c => c.id === nextCat.id);
    if (index >= 0) {
      list[index] = nextCat;
    } else {
      list.push(nextCat);
    }
    storage.saveCatList(list);
    storage.setActiveCatId(nextCat.id);
    const userId = getCurrentUsername();
    if (userId) syncCatToServer(userId, nextCat).catch((error) => {
      console.warn('[storage] sync cat failed:', error);
    });
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
    const nextPoints = {
      ...points,
      updatedAt: Date.now(),
    };
    const key = getUserKey(USER_DATA_KEYS.POINTS);
    storage.setItem(key, JSON.stringify(nextPoints));
    invalidateCache(key);
    const userId = getCurrentUsername();
    if (userId) syncPointsToServer(userId, nextPoints);
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
    if (diary?.media?.startsWith('miao_media:')) {
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
    if (userId) deleteCatFromServer(userId, id).catch((error) => {
      console.warn('[storage] delete cat failed:', error);
    });
    return updated;
  },

  deleteCat: () => {
    storage.removeItem(getUserKey(USER_DATA_KEYS.CAT_LIST));
    storage.removeItem(getUserKey(USER_DATA_KEYS.ACTIVE_CAT_ID));
    const userId = getCurrentUsername();
    if (userId) deleteAllCatsFromServer(userId).catch((error) => {
      console.warn('[storage] delete all cats failed:', error);
    });
  },

  deleteAllDiaries: () => {
    storage.removeItem(getUserKey(USER_DATA_KEYS.DIARIES));
    const userId = getCurrentUsername();
    if (userId) deleteAllDiariesFromServer(userId);
  },

  getFriends: (): FriendInfo[] => {
    return storage.safeParse<FriendInfo[]>(getUserKey(USER_DATA_KEYS.FRIENDS), []);
  },

  saveFriends: (friends: FriendInfo[]) => {
    storage.setItem(getUserKey(USER_DATA_KEYS.FRIENDS), JSON.stringify(friends));
  },

  addFriend: (friend: FriendInfo) => {
    const friends = storage.getFriends();
    if (!friends.find(f => f.id === friend.id)) {
      friends.push(friend);
      storage.setItem(getUserKey(USER_DATA_KEYS.FRIENDS), JSON.stringify(friends));
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

  // 自定义通知（好友分享等）
  getCustomNotifications: (): Array<{ id: string; type: string; title: string; content: string; time: number; read: boolean; catAvatar?: string }> => {
    return storage.safeParse(getUserKey('miao_custom_notifications'), []);
  },

  addCustomNotification: (notification: { type: string; title: string; content: string; catAvatar?: string }) => {
    const list = storage.getCustomNotifications();
    const id = `${notification.type}_${Date.now()}`;
    list.unshift({ ...notification, id, time: Date.now(), read: false });
    // 最多保留 50 条
    const trimmed = list.slice(0, 50);
    storage.setItem(getUserKey('miao_custom_notifications'), JSON.stringify(trimmed));
    trigger('notifications-read');
    return id;
  },
};
