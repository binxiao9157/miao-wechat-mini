import React, { useState } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useRouter, navigateBack } from '@tarojs/taro';
import { ArrowLeft, Download, Share2, AlertCircle } from '../../components/common/Icons';
import { storage } from '../../services/storage';
import './index.less';

export default function AddFriendQR() {
  const router = useRouter();
  const { catId, catName, catAvatar } = router.params;

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const userInfo = storage.getUserInfo();

  // 获取猫咪信息
  const getCat = () => {
    if (catId && catName) {
      return { id: catId, name: catName, avatar: catAvatar || '' };
    }
    const activeCat = storage.getActiveCat();
    if (activeCat) return activeCat;
    const catList = storage.getCatList();
    return catList[0] || null;
  };

  const cat = getCat();

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 保存图片
  const handleSaveImage = () => {
    if (isSaving) return;
    setIsSaving(true);
    showToastMessage('请截图保存名片');
    setIsSaving(false);
  };

  // 分享链接
  const handleShareLink = () => {
    if (!userInfo || !cat) return;

    const inviteText = `我是 ${userInfo.nickname}，快来 Miao 看看我的小猫 ${cat.name} 吧！一起记录萌宠瞬间～`;

    Taro.setClipboardData({
      data: inviteText,
      success: () => {
        showToastMessage('邀请文案已复制');
      },
      fail: () => {
        showToastMessage('复制失败，请手动复制');
      }
    });
  };

  if (!userInfo || !cat) {
    return (
      <View className="add-friend-qr-page error-page">
        <View className="error-icon">
          <AlertCircle size={40} />
        </View>
        <Text className="error-title">缺少必要信息</Text>
        <Text className="error-desc">请先去生成或选择一只猫咪哦</Text>
        <Button className="error-btn" onClick={() => navigateBack()}>
          返回
        </Button>
      </View>
    );
  }

  return (
    <View className="add-friend-qr-page">
      {/* 头部 */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <View className="header-title">
          <Text className="title">面对面添加</Text>
          <Text className="subtitle">Face-to-Face</Text>
        </View>
        <View className="header-placeholder" />
      </View>

      {/* 名片卡片 */}
      <View className="card-container">
        <View className="qr-card">
          <View className="card-top-line" />

          {/* 用户信息 */}
          <View className="user-info-row">
            <Image
              className="user-avatar"
              src={userInfo.avatar || ''}
              mode="aspectFill"
            />
            <View className="user-text">
              <Text className="user-nickname">{userInfo.nickname}</Text>
              <Text className="user-subtitle">邀请你成为好友</Text>
            </View>
          </View>

          {/* 二维码区域 */}
          <View className="qr-area">
            <View className="qr-wrapper">
              <View className="qr-placeholder">
                <Text className="qr-emoji">📱</Text>
                <Text className="qr-hint">二维码区域</Text>
                <Text className="qr-hint">(请使用扫一扫)</Text>
              </View>
            </View>
          </View>

          {/* 猫咪信息 */}
          <View className="cat-info-bar">
            <Image
              className="cat-avatar-small"
              src={cat.avatar || ''}
              mode="aspectFill"
            />
            <Text className="cat-name-text">代表猫咪：{cat.name}</Text>
          </View>

          {/* 底部提示 */}
          <Text className="footer-hint">
            让好友打开 Miao 扫描上方二维码{'\n'}即可建立跨时空的温暖连接
          </Text>
        </View>
      </View>

      {/* 底部按钮 */}
      <View className="action-buttons">
        <View className="action-btn" onClick={handleSaveImage}>
          <View className={`action-icon ${isSaving ? 'loading' : ''}`}>
            {isSaving ? <Text className="loading-text">...</Text> : <Download size={24} />}
          </View>
          <Text className="action-text">{isSaving ? '保存中...' : '保存图片'}</Text>
        </View>

        <View className="action-btn" onClick={handleShareLink}>
          <View className="action-icon">
            <Share2 size={24} />
          </View>
          <Text className="action-text">分享链接</Text>
        </View>
      </View>

      {/* Toast 提示 */}
      {showToast && (
        <View className="toast">
          <Text className="toast-message">{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}
