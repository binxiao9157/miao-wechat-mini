import { View, Text, Image } from '@tarojs/components';
import { Heart, MessageCircle, Share2 } from '../../components/common/Icons';
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
    return `${date.getMonth() + 1}æœ?{date.getDate()}æ—?${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
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
          <Text className="username">{user?.nickname || 'æˆ?}</Text>
          <Text className="time">{formatTime(diary.createdAt)}</Text>
        </View>
      </View>

      <Text className="content">{diary.content}</Text>

      {diary.media && (
        <Image className="media" src={diary.media} mode="aspectFill" />
      )}

      <View className="card-actions">
        <View className={`action-btn ${diary.isLiked ? 'liked' : ''}`} onClick={() => onLike?.(diary.id)}>
          <Heart size={18} />
          <Text>{diary.likes}</Text>
        </View>
        <View className="action-btn" onClick={() => onComment?.(diary.id)}>
          <MessageCircle size={18} />
          <Text>{diary.comments.length}</Text>
        </View>
        <View className="action-btn" onClick={() => onShare?.(diary.id)}>
          <Share2 size={18} />
        </View>
      </View>
    </View>
  );
}