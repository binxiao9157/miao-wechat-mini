import { get, post } from '../utils/httpAdapter';
import { FriendDiaryEntry, FriendInfo, storage } from './storage';

export interface FriendInvite {
  code: string;
  ownerId: string;
  catId?: string;
  catName?: string;
  catAvatar?: string;
  createdAt: number;
  expiresAt: number;
  inviter?: {
    username: string;
    nickname: string;
    avatar: string;
  };
}

function extractInviteCode(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.searchParams.get('invite') || url.searchParams.get('code') || '';
  } catch {
    const match = value.match(/(?:invite|code)=([A-Za-z0-9_-]+)/);
    if (match?.[1]) return match[1];
    if (/^[A-Za-z0-9_-]{8,}$/.test(value)) return value;
    return '';
  }
}

export const friendService = {
  extractInviteCode,

  buildInvitePayload(code: string) {
    return `miao://friend?invite=${encodeURIComponent(code)}`;
  },

  async createInvite(cat: { id?: string; name?: string; avatar?: string }): Promise<FriendInvite> {
    const res = await post('/api/v1/friend-invites', {
      catId: cat.id || '',
      catName: cat.name || '',
      catAvatar: cat.avatar || '',
    });
    const invite = res.data?.invite;
    if (!invite?.code) throw new Error('创建邀请码失败');
    return invite;
  },

  async getInvite(code: string): Promise<FriendInvite> {
    const res = await get(`/api/v1/friend-invites/${encodeURIComponent(code)}`);
    const invite = res.data?.invite;
    if (!invite?.code) throw new Error('邀请码无效或已过期');
    return invite;
  },

  async acceptInvite(code: string): Promise<FriendInfo> {
    const res = await post('/api/v1/friends/accept', { code });
    const friend = res.data?.friend;
    if (!friend?.id) throw new Error('添加好友失败');
    storage.addFriend(friend);
    return friend;
  },

  async syncFriends(): Promise<FriendInfo[]> {
    const res = await get('/api/v1/friends');
    const friends: FriendInfo[] = Array.isArray(res.data) ? res.data : [];
    storage.saveFriends(friends);
    return friends;
  },

  async syncFriendDiaries(): Promise<FriendDiaryEntry[]> {
    const res = await get('/api/v1/friends/diaries');
    const diaries: FriendDiaryEntry[] = Array.isArray(res.data) ? res.data : [];
    storage.saveFriendDiaries(diaries);
    return diaries;
  },
};

export default friendService;
