import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import { reLaunch } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
import PawLogo from '../../components/common/PawLogo';
import { useAuthContext } from '../../context/AuthContext';
import './index.less';

export default function CatStart() {
  const navSpace = useNavSpace();
  const { logout } = useAuthContext();

  const handleLogout = () => {
    logout();
    reLaunch({ url: '/pages/login/index' });
  };

  const handleStart = () => {
    reLaunch({ url: '/pages/empty-cat/index' });
  };

  return (
    <View className="cat-start-page" style={navSpace as React.CSSProperties}>
      {/* Logout Button */}
      <View className="back-btn" onClick={handleLogout}>
        <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
      </View>

      {/* Background Decorative Elements */}
      <View className="bg-decoration bg-decoration-1"></View>
      <View className="bg-decoration bg-decoration-2"></View>

      <View className="content">
        {/* Illustration Container */}
        <View className="illustration">
          <View className="illustration-bg">
            <View className="paw-layer paw-back">
              <PawLogo size={80} />
            </View>
            <View className="paw-layer paw-front">
              <PawLogo size={80} />
            </View>
            <View className="sparkle sparkle-1">✨</View>
            <View className="sparkle sparkle-2">✨</View>
          </View>
        </View>

        {/* Title */}
        <Text className="main-title">还没有猫咪伙伴</Text>
        <Text className="main-desc">
          每一个温暖的灵魂都在等待相遇。{'\n'}开启一段专属缘分，领养你的第一只数字猫咪吧。
        </Text>

        {/* Start Button */}
        <View className="start-btn" onClick={handleStart}>
          <Text className="start-btn-text">开启缘分</Text>
          <Text className="start-btn-arrow">→</Text>
        </View>
      </View>

      {/* Footer */}
      <View className="footer">
        <Text className="footer-text">MIAO SANCTUARY · PURE COMPANIONSHIP</Text>
      </View>
    </View>
  );
}