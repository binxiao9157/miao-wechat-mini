import Taro from '@tarojs/taro';
import { View, Text, Image } from '@tarojs/components';
import './index.less';

interface CommentItemProps {
  avatar: string;
  nickname: string;
  content: string;
  time: string;
  onDelete?: () => void;
}

export default function CommentItem({ avatar, nickname, content, time, onDelete }: CommentItemProps) {
  const handleLongPress = () => {
    if (!onDelete) return;
    Taro.vibrateShort({ type: 'light' }).catch(() => {});
    Taro.showModal({
      title: '删除评论',
      content: '确定要删除这条评论吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          onDelete();
        }
      },
    });
  };

  return (
    <View className="comment-item" onLongPress={handleLongPress}>
      <Image className="avatar" src={avatar} mode="aspectFill" />
      <View className="content">
        <Text className="nickname">{nickname}</Text>
        <Text className="text">{content}</Text>
        <Text className="time">{time}</Text>
      </View>
    </View>
  );
}