import React from 'react';
import { View, Text, Image, Video } from '@tarojs/components';
import Taro from '@tarojs/taro';

const HEART_GRAY = require('../../assets/profile-icons/heart-gray.png');
const HEART_RED = require('../../assets/profile-icons/heart-red.png');
const MESSAGE_GRAY = require('../../assets/profile-icons/message-gray.png');
const SHARE_GRAY = require('../../assets/profile-icons/share-gray.png');
const TRASH2_GRAY = require('../../assets/profile-icons/trash2-gray.png');

import './DiaryCard.less';

export interface DiaryCardDiary {
  id: string;
  content: string;
  media?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes: number;
  isLiked: boolean;
  comments: { id: string; authorId?: string; authorNickname?: string; content: string; createdAt?: number }[];
  createdAt: number;
  catName?: string;
  authorAvatar?: string;
  authorNickname?: string;
  isFriendDiary?: boolean;
}

interface DiaryCardProps {
  diary: DiaryCardDiary;
  currentUserId?: string;
  activeCatAvatar?: string;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCommentLongPress?: (diaryId: string, commentId: string, commentContent: string, canDelete: boolean, top: number, left: number) => void;
  formatTime?: (timestamp: number) => string;
}

export default function DiaryCard({
  diary,
  currentUserId,
  activeCatAvatar,
  onLike,
  onComment,
  onShare,
  onDelete,
  onCommentLongPress,
  formatTime,
}: DiaryCardProps) {
  const defaultFormatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const timeStr = (formatTime || defaultFormatTime)(diary.createdAt);
  const avatar = diary.authorAvatar || '';
  const nickname = diary.authorNickname || '未知';

  return (
    <View className="diary-item">
      <View className="diary-header">
        <Image className="avatar" src={avatar} mode="aspectFill" />
        <View className="user-info">
          <Text className="username">
            {nickname}
            {diary.isFriendDiary && diary.catName && (
              <Text className="friend-badge">{diary.catName}</Text>
            )}
          </Text>
          <Text className="time">{timeStr}</Text>
        </View>
      </View>

      <Text className="diary-content">{diary.content}</Text>

      {diary.mediaUrl && (
        diary.mediaType === 'video' ? (
          <Video
            className="diary-media"
            src={diary.mediaUrl}
            poster={activeCatAvatar || diary.mediaUrl}
            controls
            showPlayBtn
            objectFit="cover"
          />
        ) : (
          <Image
            className="diary-media"
            src={diary.mediaUrl}
            mode="aspectFill"
          />
        )
      )}

      <View className="diary-actions">
        <View className={`action-btn ${diary.isLiked ? 'liked' : ''}`} onClick={() => onLike?.(diary.id)}>
          <Image className="icon-img" src={diary.isLiked ? HEART_RED : HEART_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
          <Text>{diary.likes}</Text>
        </View>
        <View className="action-btn" onClick={() => onComment?.(diary.id)}>
          <Image className="icon-img" src={MESSAGE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
          <Text>{diary.comments.length}</Text>
        </View>
        <View className="action-btn" onClick={() => onShare?.(diary.id)}>
          <Image className="icon-img" src={SHARE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
        </View>
        {!diary.isFriendDiary && onDelete && (
          <View className="action-btn delete-btn" onClick={() => onDelete(diary.id)}>
            <Image className="icon-img" src={TRASH2_GRAY} mode="aspectFit" style={{ width: 18, height: 18 }} />
          </View>
        )}
      </View>

      {diary.comments.length > 0 && (
        <View className="comments-section">
          {diary.comments.map((comment) => {
            const isOwnComment = comment.authorId === currentUserId;
            return (
              <View
                key={comment.id}
                id={`comment-${comment.id}`}
                className="comment-item"
                onLongPress={() => {
                  if (onCommentLongPress) {
                    const query = Taro.createSelectorQuery();
                    query.select(`#comment-${comment.id}`).boundingClientRect((rect: any) => {
                      onCommentLongPress(
                        diary.id,
                        comment.id,
                        comment.content,
                        isOwnComment || !diary.isFriendDiary,
                        rect.top - 50,
                        rect.left + rect.width / 2,
                      );
                    }).exec();
                  }
                }}
              >
                <Text className="comment-author">{isOwnComment ? '我' : (comment.authorNickname || (diary.isFriendDiary ? diary.authorNickname : '好友') || '好友')}</Text>
                <Text className="comment-content">{comment.content}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}