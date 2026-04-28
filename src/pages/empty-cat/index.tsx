import React from 'react';
import { View, Text, Button, Image } from '@tarojs/components';
import { navigateTo, switchTab } from '@tarojs/taro';
import { Sparkles, ArrowLeft, PawPrint, Camera } from '../../components/common/Icons';
import { useAuthContext } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { catService } from '../../services/catService';
import './index.less';

export default function EmptyCatPage() {
  const { logout } = useAuthContext();

  const handleLogout = () => {
    logout();
    navigateTo({ url: '/pages/login/index' });
  };

  const handleCreateCat = () => {
    navigateTo({ url: '/pages/create-companion/index' });
  };

  const handleUploadCat = () => {
    navigateTo({ url: '/pages/upload-material/index' });
  };

  const handleSelectBreed = (breed: { id: string; name: string; image: string }) => {
    const newCat = {
      id: 'cat_' + Date.now(),
      name: breed.name,
      breed: breed.name,
      color: '未知',
      avatar: breed.image,
      source: 'created' as const,
      createdAt: Date.now()
    };
    storage.saveCatInfo(newCat);
    switchTab({ url: '/pages/home/index' });
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
          每一个温暖的灵魂都在等待相遇。选择一种方式，领养你的第一只数字猫咪吧！
        </Text>

        {/* Options */}
        <View className="options">
          <View className="option-card" onClick={handleCreateCat}>
            <View className="option-icon"><Sparkles size={28} /></View>
            <Text className="option-title">AI 生成</Text>
            <Text className="option-desc">用AI创造一只独一无二的猫咪</Text>
          </View>

          <View className="option-card" onClick={handleUploadCat}>
            <View className="option-icon"><Camera size={28} /></View>
            <Text className="option-title">上传照片</Text>
            <Text className="option-desc">上传照片生成你的猫咪形象</Text>
          </View>
        </View>

        {/* Preset Cats */}
        <View className="preset-cats">
          <Text className="preset-title">或选择预设猫咪</Text>
          <View className="preset-list">
            {catService.breeds.map((breed) => (
              <View key={breed.id} className="preset-item" onClick={() => handleSelectBreed(breed)}>
                <Image className="preset-image" src={breed.image} mode="aspectFill" />
                <Text className="preset-name">{breed.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className="footer">
        <Text className="footer-text">Miao Sanctuary · Pure Companionship</Text>
      </View>
    </View>
  );
}