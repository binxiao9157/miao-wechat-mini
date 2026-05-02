import React, { useState, useEffect } from 'react';
import {  View, Text, Image } from '@tarojs/components';
import Taro, { useRouter, navigateTo } from '@tarojs/taro';
const SPARKLES_PNG = require('../../assets/profile-icons/sparkles-primary.png');
import { useAuthContext } from '../../context/AuthContext';
import { friendService } from '../../services/friendService';
import './index.less';

export default function JoinFriend() {
  const router = useRouter();
  const { isAuthenticated } = useAuthContext();
  const [inviterName, setInviterName] = useState('');
  const [catName, setCatName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const code = router.params.invite || router.params.code || '';
    setInviteCode(code);
    if (!code) return;

    friendService.getInvite(code)
      .then((invite) => {
        setInviterName(invite.inviter?.nickname || invite.ownerId);
        setCatName(invite.catName || '小猫');
      })
      .catch(() => {
        setInviterName('');
      });
  }, []);

  const handleAddFriend = async () => {
    if (!inviteCode) return;
    try {
      await friendService.acceptInvite(inviteCode);
      setShowSuccess(true);
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '添加好友失败', icon: 'none' });
    }
  };

  const handleLogin = () => {
    navigateTo({ url: '/pages/login/index' });
  };

  const handleRegister = () => {
    navigateTo({ url: '/pages/register/index' });
  };

  if (!inviterName) {
    return (
      <View className="join-friend-page">
        <View className="error-state">
          <View className="error-icon-box">
            <Text className="error-emoji">😿</Text>
          </View>
          <Text className="error-title">链接无效</Text>
          <Text className="error-desc">该邀请链接无效或已过期</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="join-friend-page">
      {/* 成功动画 */}
      {showSuccess && (
        <View className="success-overlay">
          <View className="success-icon-box">
            <Text className="success-emoji">🎉</Text>
          </View>
          <Text className="success-title">添加成功！</Text>
          <Text className="success-desc">你们现在已经是好友了</Text>
        </View>
      )}

      <View className="content">
        {/* 邀请者信息 */}
        <View className="inviter-section">
          <View className="inviter-avatar">
            <Text className="inviter-avatar-text">{inviterName.charAt(0)}</Text>
          </View>
          <Text className="inviter-name">{inviterName}</Text>
          <Text className="inviter-desc">邀请你成为 Miao 好友</Text>
          {catName && <Text className="inviter-cat">🐾 {catName}</Text>}
        </View>

        {/* 操作按钮 */}
        {isAuthenticated ? (
          <View className="action-section">
            <View className="action-btn primary" onClick={handleAddFriend}>
              <Image className="icon-img btn-icon" src={SPARKLES_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
              <Text className="action-btn-text white">添加好友</Text>
            </View>
          </View>
        ) : (
          <View className="action-section">
            <Text className="login-hint">登录后即可添加好友</Text>
            <View className="action-btn primary" onClick={handleLogin}>
              <Text className="action-btn-text white">登录</Text>
            </View>
            <View className="action-btn secondary" onClick={handleRegister}>
              <Text className="action-btn-text">注册新账号</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
