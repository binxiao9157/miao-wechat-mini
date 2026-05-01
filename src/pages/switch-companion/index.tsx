import React, { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { navigateBack, navigateTo, reLaunch, useDidShow } from '@tarojs/taro';
import { ArrowLeft, Plus, CheckCircle, Coins, Sparkles, Trash2 } from '../../components/common/Icons';
import { storage, CatInfo } from '../../services/storage';
import './index.less';

export default function SwitchCompanion() {
  const [cats, setCats] = useState<CatInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [deletingCat, setDeletingCat] = useState<CatInfo | null>(null);

  const REDEEM_THRESHOLD = storage.getUnlockThreshold();

  useEffect(() => {
    fetchData();
  }, []);

  useDidShow(() => {
    refreshFromCloud();
  });

  const fetchData = () => {
    setCats(storage.getCatList());
    setActiveId(storage.getActiveCatId());
    setPoints(storage.getPoints().total);
  };

  const refreshFromCloud = async () => {
    try {
      await storage.syncCatsFromServer();
    } catch (error) {
      console.warn('[SwitchCompanion] sync cats failed:', error);
    } finally {
      fetchData();
    }
  };

  const handleSwitch = (id: string) => {
    storage.setActiveCatId(id);
    setActiveId(id);
  };

  const handleAddNew = () => {
    if (points >= REDEEM_THRESHOLD) {
      reLaunch({ url: '/pages/empty-cat/index' });
    }
  };

  const handleDeleteCat = (cat: CatInfo, e: any) => {
    e.stopPropagation();
    setDeletingCat(cat);
  };

  const confirmDelete = () => {
    if (!deletingCat) return;
    const remaining = storage.deleteCatById(deletingCat.id);
    setCats(remaining);
    setActiveId(storage.getActiveCatId());
    setPoints(storage.getPoints().total);
    setDeletingCat(null);

    if (remaining.length === 0) {
      reLaunch({ url: '/pages/empty-cat/index' });
    }
  };

  return (
    <View className="switch-companion-page">
      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={24} />
        </View>
        <Text className="header-title">切换伙伴</Text>
        <View className="points-badge">
          <Coins size={14} className="points-icon" />
          <Text className="points-text">{points}</Text>
        </View>
      </View>

      {/* Cat Grid */}
      <View className="cat-grid">
        {cats.map((cat) => (
          <View
            key={cat.id}
            className={`cat-card ${activeId === cat.id ? 'active' : ''}`}
            onClick={() => handleSwitch(cat.id)}
          >
            {/* 删除按钮 */}
            {cats.length > 1 && (
              <View className="delete-btn" onClick={(e) => handleDeleteCat(cat, e)}>
                <Trash2 size={12} />
              </View>
            )}

            {/* AI标记 */}
            {cat.source === 'uploaded' && (
              <View className="ai-badge">
                <Sparkles size={12} />
              </View>
            )}

            {/* 头像 */}
            <View className="cat-avatar-box">
              <Image className="cat-avatar" src={cat.avatar} mode="aspectFill" />
            </View>

            {/* 信息 */}
            <View className="cat-info">
              <View className="cat-name-row">
                <Text className="cat-name">{cat.name}</Text>
                {activeId === cat.id && (
                  <View className="active-check">
                    <CheckCircle size={16} />
                  </View>
                )}
              </View>
              <Text className="cat-breed">{cat.breed}</Text>
            </View>
          </View>
        ))}

        {/* 添加新伙伴按钮 */}
        <View
          className={`add-card ${points >= REDEEM_THRESHOLD ? 'enabled' : 'disabled'}`}
          onClick={points >= REDEEM_THRESHOLD ? handleAddNew : undefined}
        >
          <View className="add-icon-box">
            <Plus size={24} />
          </View>
          <Text className="add-text">添加新伙伴</Text>
          <View className="add-cost">
            <Coins size={10} className="cost-icon" />
            <Text className="cost-text">{REDEEM_THRESHOLD} 积分</Text>
          </View>
        </View>
      </View>

      {/* 积分不足提示 */}
      {points < REDEEM_THRESHOLD && (
        <View className="points-hint">
          <Text className="points-hint-text">
            积分不足喵~ 还需要 {REDEEM_THRESHOLD - points} 积分即可开启一段新的缘分。
            {'\n'}可以通过每日登录、互动、在线时长来获取积分。
          </Text>
        </View>
      )}

      {/* 删除确认弹窗 */}
      {deletingCat && (
        <View className="delete-overlay" onClick={() => setDeletingCat(null)}>
          <View className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <Text className="delete-title">确认告别</Text>
            <Text className="delete-desc">
              确定要和 {deletingCat.name} 说再见吗？此操作不可撤销。
            </Text>
            <View className="delete-actions">
              <View className="delete-btn cancel" onClick={() => setDeletingCat(null)}>
                <Text className="delete-btn-text">取消</Text>
              </View>
              <View className="delete-btn confirm" onClick={confirmDelete}>
                <Text className="delete-btn-text white">确认告别</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
