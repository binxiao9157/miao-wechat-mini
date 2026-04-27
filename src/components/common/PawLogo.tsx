import { View, Text } from '@tarojs/components';
import './index.less';

interface PawLogoProps {
  className?: string;
  size?: number;
}

export default function PawLogo({ className = '', size = 48 }: PawLogoProps) {
  return (
    <View className={`paw-logo ${className}`} style={{ width: size, height: size }}>
      <Text style={{ fontSize: size * 0.8 }}>🐾</Text>
    </View>
  );
}