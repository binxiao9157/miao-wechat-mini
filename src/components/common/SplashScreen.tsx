import { View, Text } from '@tarojs/components';
import './index.less';

interface SplashScreenProps {
  visible: boolean;
}

export default function SplashScreen({ visible }: SplashScreenProps) {
  if (!visible) return null;

  return (
    <View className="splash-screen">
      <View className="logo">
        <Text className="logo-emoji">🐱</Text>
        <Text className="logo-text">Miao</Text>
      </View>
      <Text className="slogan">以喵星之名</Text>
    </View>
  );
}