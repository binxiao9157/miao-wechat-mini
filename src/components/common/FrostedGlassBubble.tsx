import { View, Text } from '@tarojs/components';
import './FrostedGlassBubble.less';

interface FrostedGlassBubbleProps {
  text: string;
  bubbleId: number;
  visible: boolean;
  exiting?: boolean;
}

export default function FrostedGlassBubble({ text, visible, exiting }: FrostedGlassBubbleProps) {
  if (!visible) return null;

  return (
    <View className={`frosted-glass-bubble ${exiting ? 'bubble-exit' : 'bubble-enter'}`}>
      <View className="bubble-glow" />
      <View className="bubble-body">
        <Text className="bubble-text">{text}</Text>
      </View>
      <View className="bubble-border-overlay" />
    </View>
  );
}