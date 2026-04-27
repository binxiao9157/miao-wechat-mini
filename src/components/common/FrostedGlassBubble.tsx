import { View, Text } from '@tarojs/components';
import './index.less';

interface FrostedGlassBubbleProps {
  text: string;
  visible: boolean;
  duration?: number;
}

export default function FrostedGlassBubble({ text, visible, duration = 3000 }: FrostedGlassBubbleProps) {
  if (!visible) return null;

  return (
    <View className="frosted-glass-bubble">
      <Text className="bubble-text">{text}</Text>
    </View>
  );
}