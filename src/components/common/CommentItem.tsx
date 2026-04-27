import { View, Text, Image } from '@tarojs/components';
import './index.less';

interface CommentItemProps {
  avatar: string;
  nickname: string;
  content: string;
  time: string;
}

export default function CommentItem({ avatar, nickname, content, time }: CommentItemProps) {
  return (
    <View className="comment-item">
      <Image className="avatar" src={avatar} mode="aspectFill" />
      <View className="content">
        <Text className="nickname">{nickname}</Text>
        <Text className="text">{content}</Text>
        <Text className="time">{time}</Text>
      </View>
    </View>
  );
}