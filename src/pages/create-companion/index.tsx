import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import { navigateTo, switchTab } from '@tarojs/taro';
import { ArrowLeft, Sparkles, Camera, PawPrint } from '../../components/common/Icons';
import { storage } from '../../services/storage';
import { catService } from '../../services/catService';
import './index.less';

export default function CreateCompanionPage() {
  const handleBack = () => {
    navigateTo({ url: '/pages/empty-cat/index' });
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
    <View className="create-companion-page">
      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={handleBack}>
          <ArrowLeft size={20} />
        </View>
        <Text className="header-title">创建你的猫咪</Text>
        <View className="placeholder" />
      </View>

      {/* Decorative */}
      <View className="bg-decoration bg-decoration-1"></View>
      <View className="bg-decoration bg-decoration-2"></View>

      <View className="content">
        {/* Illustration */}
        <View className="illustration">
          <View className="illustration-bg">
            <PawPrint size={64} className="illustration-icon" />
          </View>
        </View>

        <Text className="section-title">选择创建方式</Text>
        <Text className="section-desc">用AI生成或上传照片，创造你的专属数字猫咪</Text>

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
    </View>
  );
}