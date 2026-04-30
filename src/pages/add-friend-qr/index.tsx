import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, Canvas, Button } from '@tarojs/components';
import Taro, { useRouter, navigateBack, getFileSystemManager } from '@tarojs/taro';
import { ArrowLeft, Download, Share2, AlertCircle, X } from '../../components/common/Icons';
import { storage } from '../../services/storage';
import './index.less';

export default function AddFriendQR() {
  const router = useRouter();
  const { catId, catName, catAvatar } = router.params;

  const [qrError, setQrError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [generatedImagePath, setGeneratedImagePath] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const userInfo = storage.getUserInfo();

  // 获取猫咪信息
  const cat = useMemo(() => {
    if (catId && catName) {
      return { id: catId, name: catName, avatar: catAvatar || '' };
    }
    // 兜底：获取当前活跃猫咪或列表第一只
    const activeCat = storage.getActiveCat();
    if (activeCat) return activeCat;
    const catList = storage.getCatList();
    return catList[0] || null;
  }, [catId, catName, catAvatar]);

  // 生成二维码数据
  const qrData = useMemo(() => {
    return JSON.stringify({
      type: 'miao_friend_invite',
      uid: userInfo?.username || 'unknown',
      nickname: userInfo?.nickname || '',
      catName: cat?.name,
      timestamp: Date.now()
    });
  }, [userInfo, cat]);

  // 绘制二维码名片
  const drawQRCard = async () => {
    const query = Taro.createSelectorQuery();
    query.select('#qrCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const width = 320;
        const height = 480;
        const dpr = Taro.getSystemInfoSync().pixelRatio;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // 背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // 顶部渐变装饰条
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#D99B7A');
        grad.addColorStop(1, '#F5C5A3');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(0, 0, width, 5);
        ctx.globalAlpha = 1;

        // 用户头像区域
        const avatarX = 24;
        const avatarY = 24;
        const avatarR = 28;

        // 绘制圆形头像
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarR, avatarY + avatarR, avatarR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // 绘制头像背景
        ctx.fillStyle = '#FEF6F0';
        ctx.fillRect(avatarX, avatarY, avatarR * 2, avatarR * 2);

        // 如果有头像URL，尝试绘制
        if (userInfo?.avatar) {
          const img = canvas.createImage();
          img.src = userInfo.avatar;
          img.onload = () => {
            ctx.drawImage(img, avatarX, avatarY, avatarR * 2, avatarR * 2);
            ctx.restore();
          };
          img.onerror = () => {
            ctx.restore();
          };
        } else {
          ctx.fillStyle = '#D99B7A';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('😺', avatarX + avatarR, avatarY + avatarR);
          ctx.restore();
        }

        // 用户昵称
        ctx.fillStyle = '#1C1B1F';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(userInfo?.nickname || '', 24 + 56 + 12, 28);

        // 副标题
        ctx.fillStyle = '#79747E';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('邀请你成为好友', 24 + 56 + 12, 28 + 24);

        // 绘制二维码区域背景
        const qrSize = 200;
        const qrX = (width - qrSize) / 2;
        const qrY = 100;
        const bgPad = 20;

        ctx.fillStyle = '#F5F0EB';
        ctx.beginPath();
        const bgX = qrX - bgPad;
        const bgY = qrY - bgPad;
        const bgW = qrSize + bgPad * 2;
        const bgH = qrSize + bgPad * 2;
        const bgR = 28;
        ctx.moveTo(bgX + bgR, bgY);
        ctx.arcTo(bgX + bgW, bgY, bgX + bgW, bgY + bgH, bgR);
        ctx.arcTo(bgX + bgW, bgY + bgH, bgX, bgY + bgH, bgR);
        ctx.arcTo(bgX, bgY + bgH, bgX, bgY, bgR);
        ctx.arcTo(bgX, bgY, bgX + bgW, bgY, bgR);
        ctx.closePath();
        ctx.fill();

        // 二维码白底
        ctx.fillStyle = '#FFFFFF';
        const qrPad = 8;
        ctx.fillRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);

        // 绘制简单二维码（使用文字代替，实际项目中可以使用第三方库生成）
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('二维码区域', qrX + qrSize / 2, qrY + qrSize / 2 - 10);
        ctx.font = '10px sans-serif';
        ctx.fillText('(请使用扫一扫)', qrX + qrSize / 2, qrY + qrSize / 2 + 10);

        // 猫咪信息栏
        const catY = qrY + qrSize + bgPad + 20;
        ctx.fillStyle = 'rgba(217, 155, 122, 0.05)';
        const catBarX = 40;
        const catBarW = width - 80;
        const catBarH = 36;
        const catBarR = 12;
        ctx.beginPath();
        ctx.moveTo(catBarX + catBarR, catY);
        ctx.arcTo(catBarX + catBarW, catY, catBarX + catBarW, catY + catBarH, catBarR);
        ctx.arcTo(catBarX + catBarW, catY + catBarH, catBarX, catY + catBarH, catBarR);
        ctx.arcTo(catBarX, catY + catBarH, catBarX, catY, catBarR);
        ctx.arcTo(catBarX, catY, catBarX + catBarW, catY, catBarR);
        ctx.closePath();
        ctx.fill();

        // 猫咪头像
        const catAvatarR = 14;
        const catAvatarX = catBarX + 10;
        const catAvatarY = catY + (catBarH - catAvatarR * 2) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(catAvatarX + catAvatarR, catAvatarY + catAvatarR, catAvatarR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = '#FEF6F0';
        ctx.fillRect(catAvatarX, catAvatarY, catAvatarR * 2, catAvatarR * 2);

        if (cat?.avatar) {
          const catImg = canvas.createImage();
          catImg.src = cat.avatar;
          catImg.onload = () => {
            ctx.drawImage(catImg, catAvatarX, catAvatarY, catAvatarR * 2, catAvatarR * 2);
            ctx.restore();
          };
          catImg.onerror = () => {
            ctx.fillStyle = '#D99B7A';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐱', catAvatarX + catAvatarR, catAvatarY + catAvatarR);
            ctx.restore();
          };
        } else {
          ctx.fillStyle = '#D99B7A';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🐱', catAvatarX + catAvatarR, catAvatarY + catAvatarR);
          ctx.restore();
        }

        // 猫咪名字
        ctx.fillStyle = '#D99B7A';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`代表猫咪：${cat?.name || ''}`, catBarX + 10 + catAvatarR * 2 + 10, catY + catBarH / 2);

        // 底部提示文字
        ctx.fillStyle = '#79747E';
        ctx.globalAlpha = 0.6;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        const footY = catY + catBarH + 24;
        ctx.fillText('让好友打开 Miao 扫描上方二维码', width / 2, footY);
        ctx.fillText('即可建立跨时空的温暖连接', width / 2, footY + 16);
        ctx.globalAlpha = 1;
      });
  };

  useEffect(() => {
    // 延迟绘制确保canvas已渲染
    const timer = setTimeout(() => {
      drawQRCard();
    }, 300);
    return () => clearTimeout(timer);
  }, [cat, userInfo]);

  const showToastMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 保存图片
  const handleSaveImage = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);

      // 将canvas导出为图片
      Taro.canvasToTempFilePath({
        canvasId: 'qrCanvas',
        success: (res) => {
          // 保存到相册
          Taro.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              showToastMessage('图片已保存到相册');
              setGeneratedImagePath(res.tempFilePath);
            },
            fail: (err) => {
              console.error('保存失败:', err);
              // 如果没有权限，显示预览让用户手动保存
              setGeneratedImagePath(res.tempFilePath);
              setShowPreview(true);
              showToastMessage('请长按图片保存', 'error');
            }
          });
        },
        fail: (err) => {
          console.error('生成图片失败:', err);
          showToastMessage('生成图片失败', 'error');
        },
        complete: () => {
          setIsSaving(false);
        }
      });
    } catch (error) {
      console.error('保存图片失败:', error);
      showToastMessage('保存失败，请重试', 'error');
      setIsSaving(false);
    }
  };

  // 分享链接
  const handleShareLink = () => {
    if (!userInfo || !cat) return;

    const inviteText = `我是 ${userInfo.nickname}，快来 Miao 看看我的小猫 ${cat.name} 吧！一起记录萌宠瞬间～`;

    // 复制到剪贴板
    Taro.setClipboardData({
      data: inviteText,
      success: () => {
        showToastMessage('邀请文案已复制，快去发给好友吧');
      },
      fail: () => {
        showToastMessage('复制失败，请手动复制', 'error');
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
            {qrError ? (
              <View className="qr-error">
                <AlertCircle size={40} />
                <Text className="qr-error-text">二维码生成失败</Text>
                <View className="qr-retry" onClick={() => setQrError(false)}>
                  <Text>重试</Text>
                </View>
              </View>
            ) : (
              <View className="qr-wrapper">
                <Canvas
                  canvasId="qrCanvas"
                  id="qrCanvas"
                  className="qr-canvas"
                  style={{ width: '200px', height: '200px' }}
                />
              </View>
            )}
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
          <View className={`toast-icon ${toastType}`}>
            {toastType === 'success' ? '✓' : '!'}
          </View>
          <Text className="toast-message">{toastMessage}</Text>
        </View>
      )}

      {/* 图片预览弹窗 */}
      {showPreview && generatedImagePath && (
        <View className="preview-modal">
          <View className="preview-mask" onClick={() => setShowPreview(false)} />
          <View className="preview-close" onClick={() => setShowPreview(false)}>
            <X size={24} />
          </View>
          <Image
            className="preview-image"
            src={generatedImagePath}
            mode="aspectFit"
            showMenuByLongpress
          />
          <View className="preview-hint">
            <Text className="preview-title">名片已生成</Text>
            <Text className="preview-subtitle">请长按上方图片选择"保存到相册"</Text>
          </View>
          <Button className="preview-back-btn" onClick={() => setShowPreview(false)}>
            返回修改
          </Button>
        </View>
      )}
    </View>
  );
}
