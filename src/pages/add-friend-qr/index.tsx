import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, Canvas } from '@tarojs/components';
import Taro, { useRouter, navigateBack } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import CatAvatar from '../../components/common/CatAvatar';
const ARROWLEFT_PNG = require('../../assets/profile-icons/arrowleft-dark.png');
const DOWNLOAD_PNG = require('../../assets/profile-icons/download-primary.png');
const SHARE2_PNG = require('../../assets/profile-icons/share-gray.png');
const ALERTCIRCLE_PNG = require('../../assets/profile-icons/alertcircle-primary.png');
import { storage } from '../../services/storage';
import { friendService, FriendInvite } from '../../services/friendService';
import { drawQROnCanvas } from '../../utils/qrCanvas';
import './index.less';

export default function AddFriendQR() {
  const navSpace = useNavSpace();
  const router = useRouter();
  const { catId } = router.params;

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [invite, setInvite] = useState<FriendInvite | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  const canvasRef = useRef<any>(null);

  const userInfo = storage.getUserInfo();

  // 获取猫咪信息：优先按 catId 从 storage 查找，保证 avatar 等字段完整
  const getCat = () => {
    if (catId) {
      const found = storage.getCatById(catId);
      if (found) return found;
    }
    const activeCat = storage.getActiveCat();
    if (activeCat) return activeCat;
    const catList = storage.getCatList();
    return catList[0] || null;
  };

  const cat = getCat();
  const invitePayload = invite ? friendService.buildInvitePayload(invite.code) : '';

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

  // Draw QR code on canvas when invite is ready
  useEffect(() => {
    if (!invitePayload || !invite) return;
    drawQRToCanvas();
  }, [invite?.code]);

  const drawQRToCanvas = () => {
    if (!invitePayload) return;

    // Use nextTick to ensure Canvas node is mounted in native layer
    Taro.nextTick(() => {
      setTimeout(() => {
        const query = Taro.createSelectorQuery().in(Taro.getCurrentInstance().page);
        query.select('#qrCanvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res[0]?.node) return;
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            const dpr = Taro.getSystemInfoSync().pixelRatio;
            const size = 320;

            canvas.width = size * dpr;
            canvas.height = size * dpr;
            ctx.scale(dpr, dpr);

            // Draw white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            // Draw QR code
            drawQROnCanvas(ctx, invitePayload, 0, 0, size, '#1C1B1F', '#ffffff');

            setQrReady(true);
          });
      }, 100);
    });
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 保存二维码图片
  const handleSaveImage = async () => {
    if (isSaving || !invitePayload || !cat) return;
    setIsSaving(true);

    try {
      // Request photo album permission
      const authRes = await Taro.getSetting();
      if (!authRes.authSetting['scope.writePhotosAlbum']) {
        try {
          await Taro.authorize({ scope: 'scope.writePhotosAlbum' });
        } catch {
          await Taro.openSetting();
          const reAuth = await Taro.getSetting();
          if (!reAuth.authSetting['scope.writePhotosAlbum']) {
            showToastMessage('需要相册权限才能保存');
            return;
          }
        }
      }

      // Export QR canvas to image
      const query = Taro.createSelectorQuery().in(Taro.getCurrentInstance().page);
      query.select('#qrCanvas')
        .fields({ node: true })
        .exec(async (res) => {
          if (!res[0]?.node) {
            showToastMessage('保存失败，请截图保存');
            return;
          }
          try {
            const tempRes = await Taro.canvasToTempFilePath({
              canvas: res[0].node,
            });
            await Taro.saveImageToPhotosAlbum({ filePath: tempRes.tempFilePath });
            showToastMessage('二维码已保存到相册');
          } catch {
            showToastMessage('保存失败，请截图保存');
          }
        });
    } catch {
      showToastMessage('保存失败，请截图保存');
    } finally {
      setIsSaving(false);
    }
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
        <View className="error-btn" onClick={() => navigateBack()}>
          <Text className="error-btn-text">返回</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="add-friend-qr-page" style={navSpace as React.CSSProperties}>
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
            <CatAvatar
              src={userInfo.avatar}
              name={userInfo.nickname}
              className="user-avatar"
            />
            <View className="user-text">
              <Text className="user-nickname">{userInfo.nickname}</Text>
              <Text className="user-subtitle">邀请你成为好友</Text>
            </View>
          </View>

          {/* 二维码区域 - Canvas 生成 */}
          <View className="qr-area">
            <View className="qr-wrapper">
              {invitePayload ? (
                <Canvas
                  id="qrCanvas"
                  type="2d"
                  className="qr-canvas"
                  style={{ width: '320rpx', height: '320rpx' }}
                />
              ) : (
                <View className="qr-placeholder">
                  <Text className="qr-emoji">QR</Text>
                  <Text className="qr-hint">{isCreatingInvite ? '正在生成二维码...' : '好友邀请码'}</Text>
                  {invite?.code && <Text className="qr-code-text">{invite.code}</Text>}
                </View>
              )}
            </View>
          </View>

          {/* 猫咪信息 */}
          <View className="cat-info-bar">
            <CatAvatar
              src={cat.avatar}
              name={cat.name}
              className="cat-avatar-small"
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