import { View, Text, Image } from '@tarojs/components';
import './SplashScreen.less';

interface SplashScreenProps {
  visible: boolean;
}

export default function SplashScreen({ visible }: SplashScreenProps) {
  if (!visible) return null;

  return (
    <View className="splash-screen">
      <View className="logo">
        <Image
          className="logo-image"
          src={require('../../assets/logo.png')}
          mode="aspectFit"
        />
        <Text className="logo-text">Miao</Text>
      </View>
      <Text className="slogan">以喵星之名</Text>
    </View>
  );
}