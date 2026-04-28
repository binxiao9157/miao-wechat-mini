import { View, Text, Button, Image } from '@tarojs/components';
import { navigateTo } from '@tarojs/taro';
import { storage } from '../../services/storage';
import { catService } from '../../services/catService';
import './index.less';

export default function EmptyCat() {
  const handleCreateCat = () => {
    navigateTo({ url: '/pages/create-companion/index' });
  };

  const handleUploadCat = () => {
    navigateTo({ url: '/pages/upload-material/index' });
  };

  return (
    <View className="empty-cat-page">
      <View className="content">
        <View className="illustration">
          <Text className="cat-emoji">🐱</Text>
        </View>

        <Text className="title">还没有猫咪陪伴你</Text>
        <Text className="subtitle">领养一只属于你的猫咪，开始温暖的旅程</Text>

        <View className="options">
          <View className="option-card" onClick={handleCreateCat}>
            <View className="option-icon">✨</View>
            <Text className="option-title">AI 生成</Text>
            <Text className="option-desc">用AI创造一只独一无二的猫咪</Text>
          </View>

          <View className="option-card" onClick={handleUploadCat}>
            <View className="option-icon">📷</View>
            <Text className="option-title">上传照片</Text>
            <Text className="option-desc">上传照片生成你的猫咪形象</Text>
          </View>
        </View>

        <View className="preset-cats">
          <Text className="preset-title">或选择预设猫咪</Text>
          <View className="preset-list">
            {catService.breeds.map((breed) => (
              <View key={breed.id} className="preset-item" onClick={() => {
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
                navigateTo({ url: '/pages/home/index' });
              }}>
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