import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { useRouter, navigateBack } from '@tarojs/taro';
const ARROWLEFT_PNG = require('../../assets/profile-icons/arrowleft-dark.png');
const DOWNLOAD_PNG = require('../../assets/profile-icons/download-primary.png');
const SHARE2_PNG = require('../../assets/profile-icons/share-gray.png');
const ALERTCIRCLE_PNG = require('../../assets/profile-icons/alertcircle-primary.png');
import { storage } from '../../services/storage';
import { friendService, FriendInvite } from '../../services/friendService';
import './index.less';

export default function AddFriendQR() {
  const router = useRouter();
  const { catId, catName, catAvatar } = router.params;

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [invite, setInvite] = useState<FriendInvite | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [qrLoadError, setQrLoadError] = useState(false);

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
  const invitePayload = invite ? friendService.buildInvitePayload(invite.code) : '';
  const qrImageUrl = invitePayload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&format=png&data=${encodeURIComponent(invitePayload)}`
    : '';

  useEffect(() => {
    if (!cat || isCreatingInvite || invite) return;
    setIsCreatingInvite(true);
    friendService.createInvite({ id: cat.id, name: cat.name, avatar: cat.avatar })
      .then(setInvite)
      .catch((error) => {
        console.error('创建好友邀请码失败:', error);
        showToastMessage(error?.message || '创建邀请码失败');
      })
      .finally(() => setIsCreatingInvite(false));
  }, [cat?.id]);

  useEffect(() => {
    setQrLoadError(false);
  }, [invite?.code]);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 保存图片
  const handleSaveImage = () => {
    if (isSaving) return;
    setIsSaving(true);
    showToastMessage('请截图保存名片或复制邀请码');
    setIsSaving(false);
  };

  // 分享链接
  const handleShareLink = () => {
    if (!userInfo || !cat) return;

    const inviteText = invitePayload
      ? `我是 ${userInfo.nickname}，快来 Miao 看看我的小猫 ${cat.name} 吧！${invitePayload}`
      : `我是 ${userInfo.nickname}，快来 Miao 看看我的小猫 ${cat.name} 吧！一起记录萌宠瞬间～`;

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
          <Image className="icon-img" src={ALERTCIRCLE_PNG} mode="aspectFit" style={{ width: 40, height: 40 }} />
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
          <Image className="icon-img" src={ARROWLEFT_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
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
              {qrImageUrl && !qrLoadError ? (
                <Image
                  className="qr-image"
                  src={qrImageUrl}
                  mode="aspectFit"
                  showMenuByLongpress
                  onError={() => setQrLoadError(true)}
                />
              ) : (
                <View className="qr-placeholder" onClick={() => setQrLoadError(false)}>
                  <Text className="qr-emoji">QR</Text>
                  <Text className="qr-hint">{isCreatingInvite ? '正在生成二维码' : qrLoadError ? '二维码加载失败' : '好友邀请码'}</Text>
                  <Text className="qr-code-text">{invite?.code || '请稍候'}</Text>
                  {qrLoadError && <Text className="qr-hint">点此重试，或复制邀请码添加</Text>}
                </View>
              )}
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
            让好友打开 Miao 扫描或复制邀请码{'\n'}即可建立跨时空的温暖连接
          </Text>
        </View>
      </View>

      {/* 底部按钮 */}
      <View className="action-buttons">
        <View className="action-btn" onClick={handleSaveImage}>
          <View className={`action-icon ${isSaving ? 'loading' : ''}`}>
            {isSaving ? <Text className="loading-text">...</Text> : <Image className="icon-img" src={DOWNLOAD_PNG} mode="aspectFit" style={{ width: 24, height: 24 }} />}
          </View>
          <Text className="action-text">{isSaving ? '保存中...' : '保存图片'}</Text>
        </View>

        <View className="action-btn" onClick={handleShareLink}>
          <View className="action-icon">
            <Image className="icon-img" src={SHARE2_PNG} mode="aspectFit" style={{ width: 24, height: 24 }} />
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
