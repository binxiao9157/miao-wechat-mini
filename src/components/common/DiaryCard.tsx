import { View, Text, Image } from '@tarojs/components';
const HEART_PNG = require('../../assets/profile-icons/heart-gray.png');
const MESSAGECIRCLE_PNG = require('../../assets/profile-icons/message-gray.png');
const SHARE2_PNG = require('../../assets/profile-icons/share-gray.png');
import { DiaryEntry, storage } from '../../services/storage';
import './index.less';

interface DiaryCardProps {
  diary: DiaryEntry;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
}

export default function DiaryCard({ diary, onLike, onComment, onShare }: DiaryCardProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const user = storage.getUserInfo();

  return (
    <View className="diary-card">
      <View className="card-header">
        <Image
          className="avatar"
          src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
          mode="aspectFill"
        />
        <View className="user-info">
          <Text className="username">{user?.nickname || '喵友'}</Text>
          <Text className="time">{formatTime(diary.createdAt)}</Text>
        </View>
      </View>

      <Text className="content">{diary.content}</Text>

      {diary.media && (
        <Image className="media" src={diary.media} mode="aspectFill" />
      )}

      <View className="card-actions">
        <View className={`action-btn ${diary.isLiked ? 'liked' : ''}`} onClick={() => onLike?.(diary.id)}>
          <Image className="icon-img" src={HEART_PNG} mode="aspectFit" style={{ width: 24, height: 24 }} />
          <Text>{diary.likes}</Text>
        </View>
        <View className="action-btn" onClick={() => onComment?.(diary.id)}>
          <Image className="icon-img" src={MESSAGECIRCLE_PNG} mode="aspectFit" style={{ width: 24, height: 24 }} />
          <Text>{diary.comments.length}</Text>
        </View>
        <View className="action-btn" onClick={() => onShare?.(diary.id)}>
          <Image className="icon-img" src={SHARE2_PNG} mode="aspectFit" style={{ width: 24, height: 24 }} />
        </View>
      </View>
    </View>
  );
}