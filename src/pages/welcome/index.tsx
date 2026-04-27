import { useEffect } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import { reLaunch } from '@tarojs/taro';
import './index.less';

export default function Welcome() {
  useEffect(() => {
    // 欢迎页展示2秒后跳转
    const timer = setTimeout(() => {
      reLaunch({ url: '/pages/login/index' });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="welcome-page">
      <View className="logo">
        <Text className="logo-emoji">🐱</Text>
        <Text className="logo-text">Miao</Text>
      </View>
      <Text className="slogan">以喵星之名，守护你的温暖</Text>
    </View>
  );
}