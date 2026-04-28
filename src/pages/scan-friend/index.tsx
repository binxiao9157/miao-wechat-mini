import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { navigateBack, navigateTo } from '@tarojs/taro';
import { ArrowLeft, Scan } from '../../components/common/Icons';
import { storage, FriendInfo } from '../../services/storage';
import { useAuthContext } from '../../context/AuthContext';
import './index.less';

export default function ScanFriend() {
  const { user } = useAuthContext();
  const [scanning, setScanning] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [friendInfo, setFriendInfo] = useState<FriendInfo | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    // 自动启动扫码
    startScan();
  }, []);

  const startScan = () => {
    setScanning(true);
    Taro.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        setScanning(false);
        handleScanResult(res.result);
      },
      fail: () => {
        setScanning(false);
        // 用户取消扫码，返回上一页
        navigateBack();
      }
    });
  };

  const handleScanResult = (result: string) => {
    try {
      // 尝试解析二维码内容
      const url = new URL(result);
      const uid = url.searchParams.get('uid');
      const cat = url.searchParams.get('cat');

      if (uid) {
        const foundUser = storage.findUser(uid);
        if (foundUser) {
          const activeCat = storage.getActiveCat();
          setFriendInfo({
            id: foundUser.username,
            nickname: foundUser.nickname,
            avatar: foundUser.avatar || '',
            catName: cat || activeCat?.name || '小猫',
            catAvatar: activeCat?.avatar || '',
            addedAt: Date.now(),
          });
          setShowConfirm(true);
        } else {
          triggerToast('未找到该用户');
        }
      } else {
        triggerToast('无效的邀请码');
      }
    } catch {
      // 简单字符串处理
      if (result.includes('miao_friend_invite')) {
        triggerToast('扫描成功，正在处理...');
      } else {
        triggerToast('无法识别的二维码');
      }
    }
  };

  const handleConfirmAdd = () => {
    if (!friendInfo) return;
    storage.addFriend(friendInfo);
    setShowConfirm(false);
    triggerToast('添加好友成功！');
    setTimeout(() => {
      navigateBack();
    }, 1500);
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  return (
    <View className="scan-friend-page">
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
        <Text className="header-title">扫码添加好友</Text>
        <View className="header-placeholder" />
      </View>

      {/* 扫码提示区 */}
      <View className="scan-area">
        <View className="scan-frame">
          <View className="scan-corner top-left" />
          <View className="scan-corner top-right" />
          <View className="scan-corner bottom-left" />
          <View className="scan-corner bottom-right" />
          <View className="scan-icon-box">
            <Scan size={48} />
          </View>
        </View>
        <Text className="scan-hint">将二维码放入框内扫描</Text>
      </View>

      {/* 底部操作 */}
      <View className="bottom-actions">
        <View className="action-item" onClick={startScan}>
          <View className="action-circle">
            <Scan size={24} />
          </View>
          <Text className="action-label">再次扫码</Text>
        </View>
        <View className="action-item" onClick={() => navigateTo({ url: '/pages/add-friend-qr/index' })}>
          <View className="action-circle">
            <Text className="action-emoji">📱</Text>
          </View>
          <Text className="action-label">我的二维码</Text>
        </View>
      </View>

      {/* 好友确认弹窗 */}
      {showConfirm && friendInfo && (
        <View className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <View className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <Text className="confirm-title">添加好友</Text>
            <View className="friend-info">
              <View className="friend-avatar-box">
                <Text className="friend-avatar-text">{friendInfo.nickname.charAt(0)}</Text>
              </View>
              <View className="friend-detail">
                <Text className="friend-name">{friendInfo.nickname}</Text>
                <Text className="friend-cat">猫咪: {friendInfo.catName}</Text>
              </View>
            </View>
            <View className="confirm-actions">
              <View className="confirm-btn cancel" onClick={() => setShowConfirm(false)}>
                <Text className="confirm-btn-text">取消</Text>
              </View>
              <View className="confirm-btn primary" onClick={handleConfirmAdd}>
                <Text className="confirm-btn-text white">添加好友</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}