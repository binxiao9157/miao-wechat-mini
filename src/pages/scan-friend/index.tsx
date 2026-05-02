import React, { useState, useEffect } from 'react';
import {  View, Text, Image } from '@tarojs/components';
import Taro, { navigateBack, navigateTo } from '@tarojs/taro';
const ARROWLEFT_PNG = require('../../assets/profile-icons/arrowleft-dark.png');
const SCAN_PNG = require('../../assets/profile-icons/scan-primary.png');
import { FriendInfo } from '../../services/storage';
import { friendService } from '../../services/friendService';
import './index.less';

export default function ScanFriend() {
  const [scanning, setScanning] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [friendInfo, setFriendInfo] = useState<FriendInfo | null>(null);
  const [inviteCode, setInviteCode] = useState('');
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

  const handleScanResult = async (result: string) => {
    try {
      const code = friendService.extractInviteCode(result);
      if (!code) {
        triggerToast('无效的邀请码');
        return;
      }
      const invite = await friendService.getInvite(code);
      setInviteCode(code);
      setFriendInfo({
        id: invite.ownerId,
        nickname: invite.inviter?.nickname || invite.ownerId,
        avatar: invite.inviter?.avatar || '',
        catName: invite.catName || '小猫',
        catAvatar: invite.catAvatar || '',
        addedAt: Date.now(),
      });
      setShowConfirm(true);
    } catch (error: any) {
      triggerToast(error?.message || '无法识别的二维码');
    }
  };

  const handleConfirmAdd = async () => {
    if (!friendInfo || !inviteCode) return;
    try {
      await friendService.acceptInvite(inviteCode);
      setShowConfirm(false);
      triggerToast('添加好友成功！');
      setTimeout(() => {
        navigateBack();
      }, 1500);
    } catch (error: any) {
      triggerToast(error?.message || '添加好友失败');
    }
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
          <Image className="icon-img" src={ARROWLEFT_PNG} mode="aspectFit" style={{ width: 24, height: 24 }} />
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
            <Image className="icon-img" src={SCAN_PNG} mode="aspectFit" style={{ width: 48, height: 48 }} />
          </View>
        </View>
        <Text className="scan-hint">将二维码放入框内扫描</Text>
      </View>

      {/* 底部操作 */}
      <View className="bottom-actions">
        <View className="action-item" onClick={startScan}>
          <View className="action-circle">
            <Image className="icon-img" src={SCAN_PNG} mode="aspectFit" style={{ width: 24, height: 24 }} />
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
