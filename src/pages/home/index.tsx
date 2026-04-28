import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import { switchTab, navigateTo } from '@tarojs/taro';
import { storage, CatInfo } from '../../services/storage';
import './index.less';

export default function Home() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const activeCat = storage.getActiveCat();
    setCat(activeCat);

    const pointsInfo = storage.getPoints();
    setPoints(pointsInfo.total);
  }, []);

  const handleCatClick = () => {
    navigateTo({ url: '/pages/cat-player/index' });
  };

  const handleFeed = () => {
    const newPoints = storage.addPoints(5, '喂食奖励');
    setPoints(newPoints);
  };

  return (
    <View className="home-page">
      <View className="header">
        <Text className="greeting">你好，{storage.getUserInfo()?.nickname || '喵~'}</Text>
        <View className="points-badge" onClick={() => switchTab({ url: '/pages/points/index' })}>
          <Text className="points-icon">🪙</Text>
          <Text className="points-value">{points}</Text>
        </View>
      </View>

      <View className="cat-container" onClick={handleCatClick}>
        {cat ? (
          <>
            <Image
              className="cat-image"
              src={cat.avatar || cat.placeholderImage || ''}
              mode="aspectFill"
            />
            <View className="cat-info">
              <Text className="cat-name">{cat.name}</Text>
              <Text className="cat-breed">{cat.breed} · {cat.color}</Text>
            </View>
          </>
        ) : (
          <View className="no-cat">
            <Text className="no-cat-text">还没有猫咪</Text>
            <Button className="add-cat-btn" onClick={() => navigateTo({ url: '/pages/empty-cat/index' })}>
              领养一只
            </Button>
          </View>
        )}
      </View>

      <View className="actions">
        <Button className="action-btn" onClick={handleFeed}>
          <Text>🍚 喂食</Text>
        </Button>
        <Button className="action-btn" onClick={() => navigateTo({ url: '/pages/diary/index' })}>
          <Text>📔 日记</Text>
        </Button>
        <Button className="action-btn" onClick={() => navigateTo({ url: '/pages/profile/index' })}>
          <Text>👤 我的</Text>
        </Button>
      </View>

      <View className="bottom-nav">
        <View className="nav-item active">
          <Text>🏠</Text>
          <Text className="nav-label">首页</Text>
        </View>
        <View className="nav-item" onClick={() => switchTab({ url: '/pages/diary/index' })}>
          <Text>📔</Text>
          <Text className="nav-label">日记</Text>
        </View>
        <View className="nav-item" onClick={() => navigateTo({ url: '/pages/scan-friend/index' })}>
          <Text>👥</Text>
          <Text className="nav-label">好友</Text>
        </View>
        <View className="nav-item" onClick={() => switchTab({ url: '/pages/profile/index' })}>
          <Text>👤</Text>
          <Text className="nav-label">我的</Text>
        </View>
      </View>
    </View>
  );
}