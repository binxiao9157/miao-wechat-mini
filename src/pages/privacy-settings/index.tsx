import React, { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { navigateBack, navigateTo } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import { storage } from '../../services/storage';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const TRASH2_RED2 = require('../../assets/profile-icons/trash2-red2.png');
const SHIELDCHECK_PRIMARY = require('../../assets/profile-icons/shieldcheck-primary.png');

import './index.less';

export default function PrivacySettings() {
  const navSpace = useNavSpace();
  const [cacheSize, setCacheSize] = useState('0 KB');
  const [isClearing, setIsClearing] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    calculateCacheSize();
  }, []);

  const calculateCacheSize = () => {
    try {
      const res = Taro.getStorageInfoSync();
      const sizeKB = res.currentSize || 0;
      if (sizeKB > 1024) {
        setCacheSize(`${(sizeKB / 1024).toFixed(1)} MB`);
      } else {
        setCacheSize(`${sizeKB} KB`);
      }
    } catch {
      setCacheSize('未知');
    }
  };

  const handleClearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '确定要清除所有本地缓存吗？这将清除媒体文件缓存，不会影响您的账号和猫咪数据。',
      success: (res) => {
        if (res.confirm) {
          setIsClearing(true);
          storage.clearMediaCache();
          setTimeout(() => {
            setIsClearing(false);
            calculateCacheSize();
            triggerToast('缓存已清除');
          }, 1000);
        }
      }
    });
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  return (
    <View className="privacy-settings-page" style={navSpace as React.CSSProperties}>
      {/* Toast */}
      {showToast && (
        <View className="toast">
          <Text className="toast-text">{showToast}</Text>
        </View>
      )}

      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 24, height: 24 }} />
        </View>
        <Text className="header-title">隐私设置</Text>
      </View>

      {/* 清除缓存 */}
      <View className="settings-section">
        <View className="setting-item" onClick={handleClearCache}>
          <View className="setting-left">
            <View className="setting-icon danger">
              <Image className="icon-img" src={TRASH2_RED2} mode="aspectFit" style={{ width: 20, height: 20 }} />
            </View>
            <View className="setting-info">
              <Text className="setting-name">清除缓存</Text>
              <Text className="setting-desc">当前缓存: {cacheSize}</Text>
            </View>
          </View>
          <Text className="setting-arrow">›</Text>
        </View>
      </View>

      {/* 隐私政策 */}
      <View className="settings-section">
        <View className="setting-item" onClick={() => navigateTo({ url: '/pages/privacy-policy/index' })}>
          <View className="setting-left">
            <View className="setting-icon">
              <Image className="icon-img" src={SHIELDCHECK_PRIMARY} mode="aspectFit" style={{ width: 20, height: 20 }} />
            </View>
            <View className="setting-info">
              <Text className="setting-name">隐私政策</Text>
              <Text className="setting-desc">查看我们的隐私保护政策</Text>
            </View>
          </View>
          <Text className="setting-arrow">›</Text>
        </View>
      </View>

      {/* 说明 */}
      <View className="info-section">
        <Text className="info-text">
          清除缓存将删除本地存储的媒体文件（如日记图片等），不会影响您的账号信息、猫咪数据和其他核心数据。
        </Text>
      </View>

      {/* 清除中动画 */}
      {isClearing && (
        <View className="clearing-overlay">
          <View className="clearing-spinner" />
          <Text className="clearing-text">正在清除...</Text>
        </View>
      )}
    </View>
  );
}