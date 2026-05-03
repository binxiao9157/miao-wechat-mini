import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { navigateTo, reLaunch } from '@tarojs/taro';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const CAMERA_PRIMARY = require('../../assets/profile-icons/camera-primary.png');
import PawLogo from '../../components/common/PawLogo';
import './index.less';

export default function EmptyCatPage() {
  const router = Taro.getCurrentInstance().router;
  const isRedemption = router?.params?.isRedemption === '1';
  const redemptionAmount = Number(router?.params?.redemptionAmount) || 0;
  const redemptionParams = isRedemption ? `&isRedemption=1&redemptionAmount=${redemptionAmount}` : '';

  const handleBack = () => {
    reLaunch({ url: '/pages/cat-start/index' });
  };

  const handleUpload = () => {
    navigateTo({ url: `/pages/upload-material/index?${redemptionParams.slice(1)}` });
  };

  const handleCreate = () => {
    navigateTo({ url: `/pages/create-companion/index?${redemptionParams.slice(1)}` });
  };

  return (
    <View className="welcome-page">
      {/* Header - Back Button */}
      <View className="back-btn" onClick={handleBack}>
        <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
      </View>

      {/* Logo */}
      <View className="logo-section">
        <View className="logo-icon-wrapper">
          <PawLogo size={44} className="logo-icon" />
        </View>
        <Text className="logo-text">Miao</Text>
      </View>

      {/* Title */}
      <Text className="main-title">遇见你的{'\n'}数字猫咪</Text>
      <Text className="main-desc">开启一段温暖的治愈旅程，记录你与毛{'\n'}孩子的每一个瞬间。</Text>

      {/* Option Cards */}
      <View className="option-cards">
        {/* 我有猫咪 - Upload */}
        <View className="option-card" onClick={handleUpload}>
          <View className="card-header">
            <View className="card-icon-box">
              <Image className="icon-img card-icon" src={CAMERA_PRIMARY} mode="aspectFit" style={{ width: 28, height: 28 }} />
            </View>
            <Text className="card-arrow">›</Text>
          </View>
          <Text className="card-title">我有猫咪</Text>
          <Text className="card-desc">上传照片，由 AI 为你的真实猫咪生成专属数字形象。</Text>
          <View className="upload-hint">
            <Text className="upload-hint-text">点击上传照片或视频</Text>
          </View>
        </View>

        {/* 我想养猫 - Create */}
        <View className="option-card" onClick={handleCreate}>
          <View className="card-header">
            <View className="card-icon-box">
              <PawLogo size={28} className="card-icon" />
            </View>
            <Text className="card-arrow">›</Text>
          </View>
          <Text className="card-title">我想养猫</Text>
          <Text className="card-desc">选择你心仪的品种，在数字世界领养你的第一只猫咪。</Text>
        </View>
      </View>

      {/* Footer */}
      <View className="footer">
        <Text className="footer-text">© 2026 MIAO · 纯粹的猫咪生活</Text>
      </View>
    </View>
  );
}