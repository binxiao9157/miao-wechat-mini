import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import { navigateTo, reLaunch } from '@tarojs/taro';
import { Sparkles, ArrowLeft, PawPrint } from '../../components/common/Icons';
import { useAuthContext } from '../../context/AuthContext';
import './index.less';

export default function EmptyCatPage() {
  const { logout } = useAuthContext();

  const handleLogout = () => {
    logout();
    reLaunch({ url: '/pages/login/index' });
  };

  const handleStart = () => {
    navigateTo({ url: '/pages/create-companion/index' });
  };

  return (
    <View className="empty-cat-page">
      {/* Logout Button */}
      <View className="logout-btn" onClick={handleLogout}>
        <ArrowLeft size={20} />
      </View>

      {/* Background Decorative */}
      <View className="bg-decoration bg-decoration-1"></View>
      <View className="bg-decoration bg-decoration-2"></View>

      <View className="content">
        {/* Illustration Container */}
        <View className="illustration-container">
          <View className="glow-bg"></View>
          <View className="icon-wrapper">
            <PawPrint size={80} className="paw-icon paw-icon-1" />
            <View className="paw-float">
              <PawPrint size={80} className="paw-icon paw-icon-2" />
            </View>
          </View>
          <View className="sparkles">
            <Sparkles size={24} />
          </View>
        </View>

        <Text className="title">还没有猫咪伙伴</Text>
        <Text className="description">
          每一个温暖的灵魂都在等待相遇。开启一段专属缘分，领养你的第一只数字猫咪吧！
        </Text>

        <Button className="start-btn" onClick={handleStart}>
          <Text className="btn-text">开启缘分</Text>
          <Text className="btn-arrow">→</Text>
        </Button>
      </View>

      <View className="footer">
        <Text className="footer-text">Miao Sanctuary · Pure Companionship</Text>
      </View>
    </View>
  );
}