import React from 'react';
import { useState } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import { navigateBack, scanCode } from '@tarojs/taro';
import { ArrowLeft, QrCode, Camera } from '../../components/common/Icons';
import { storage } from '../../services/storage';
import './index.less';

export default function AddFriendQR() {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useState(() => {
    const user = storage.getUserInfo();
    if (user) {
      // 生成包含用户ID的二维码
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=miao://friend/${user.username}`);
    }
  });

  const handleScan = () => {
    // 微信小程序扫码
    scanCode({
      success: (res) => {
        console.log('Scan result:', res.result);
      }
    });
  };

  return (
    <View className="add-friend-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">添加好友</Text>
        <View className="placeholder" />
      </View>

      <View className="content">
        <Text className="desc">让好友扫描二维码或输入你的用户名来添加你为好友。</Text>

        <View className="qr-container">
          {qrCodeUrl ? (
            <Image className="qr-code" src={qrCodeUrl} mode="aspectFit" />
          ) : (
            <View className="qr-placeholder">
              <QrCode size={80} />
            </View>
          )}
        </View>

        <Text className="my-id">我的ID: {storage.getUserInfo()?.username || '未登录'}</Text>

        <Button className="scan-btn" onClick={handleScan}>
          <Camera size={20} />
          扫码添加好友
        </Button>
      </View>
    </View>
  );
}