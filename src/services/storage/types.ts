export interface UserInfo {
  username: string;
  nickname: string;
  avatar: string;
  password?: string;
  passwordSet?: boolean;
  openidBound?: boolean;
  phone?: string;
  isNewUser?: boolean;
  debugAllowed?: boolean;
  debugRole?: 'developer' | 'operator' | 'support' | 'none';
  debugExpiresAt?: number;
}

export interface CatInfo {
  id: string;
  name: string;
  breed: string;
  color: string;
  avatar: string;
  source: 'created' | 'uploaded';
  createdAt?: number;
  generationStatus?: 'pending' | 'failed' | 'ready';
  generationError?: string;
  generationUpdatedAt?: number;
  videoPath?: string;
  videoPaths?: Record<string, string | undefined> & {
    v1_approach?: string;
    v2_wait?: string;
    v3_return?: string;
    v4_fetch?: string;
  };
  remoteVideoUrl?: string;
  placeholderImage?: string;
  anchorFrame?: string;
  actionGenerationError?: string;
  isUnlocking?: boolean;
  unlockProgress?: CatUnlockProgress;
  updatedAt?: number;
}

export interface CatUnlockProgress {
  completed: number;
  total: number;
  currentAction?: string;
  failed?: number;
  updatedAt: number;
}

export interface AppSettings {
  greetingsEnabled: boolean;
  pushNotifications: boolean;
  timeLetterReminder: boolean;
}

export interface Comment {
  id: string;
  content: string;
  authorId?: string;
  authorNickname?: string;
  createdAt?: number;
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
