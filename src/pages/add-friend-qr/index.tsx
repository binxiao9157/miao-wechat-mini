import React, { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { navigateBack } from '@tarojs/taro';
import { ArrowLeft, Download } from '../../components/common/Icons';
import { storage } from '../../services/storage';
import { useAuthContext } from '../../context/AuthContext';
import './index.less';

export default function AddFriendQR() {
  const { user } = useAuthContext();
  const [showToast, setShowToast] = useState<string | null>(null);

  const activeCat = storage.getActiveCat();
  const nickname = user?.nickname || 'Miao 用户';
  const catName = activeCat?.name || '小猫';

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleSaveImage = () => {
    // 小程序中保存名片图到相册
    triggerToast('长按名片卡片可保存图片');
  };

  const handleShare = () => {
    Taro.showShareMenu({
      withShareTicket: true,
    });
  };

  const handleCopyLink = () => {
    const link = `https://miao.app/join?uid=${user?.username || ''}&cat=${encodeURIComponent(catName)}`;
    Taro.setClipboardData({
         data: link,
      success: () => triggerToast('邀请链接已复制'),
    });
  };

  return (
    <View className="add-friend-qr-page">
      {/* Toast */}
      {showToast && (
        <View className="toast">
          <Text className="toast-text">{showToast}</Text>
        </View>
      )}

      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={24} />
        </View>
        <Text className="header-title">面对面添加</Text>
        <View className="header-placeholder" />
      </View>

      {/* 名片卡 */}
      <View className="card-section">
        <View className="name-card">
          {/* 头像和昵称 */}
          <View className="card-top">
            <View className="card-avatar-box">
              {user?.avatar ? (
                <Image className="card-avatar" src={user.avatar} mode="aspectFill" />
              ) : (
                <Text className="card-avatar-text">{nickname.charAt(0)}</Text>
              )}
            </View>
            <Text className="card-nickname">{nickname}</Text>
          </View>

          {/* 二维码区域 */}
          <View className="qr-section">
            <View className="qr-placeholder">
              <Text className="qr-emoji">📱</Text>
              <Text className="qr-hint">扫码添加好友</Text>
            </View>
          </View>

          {/* 猫咪信息 */}
          <View className="card-cat-info">
            <Text className="cat-label">🐾</Text>
            <Text className="cat-name">{catName}</Text>
          </View>

          <Text className="card-tip">打开 Miao 扫一扫，即可添加好友</Text>
        </View>
      </View>

      {/* 操作按钮 */}
      <View className="action-section">
        <View className="action-btn primary" onClick={handleCopyLink}>
          <Text className="action-btn-text white">复制邀请链接</Text>
        </View>
        <View className="action-btn secondary" onClick={handleShare}>
          <Text className="action-btn-text">分享给好友</Text>
        </View>
      </View>
    </View>
  );
}