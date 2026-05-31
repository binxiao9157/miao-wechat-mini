import React, { useState } from 'react';
import { View, Text, Image, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { redirectTo, safeBack } from '../../utils/navigateAdapter';
import { useNavSpace } from '../../hooks/useNavSpace';
import { useManagedTimeout } from '../../hooks/useManagedTimeout';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const X_DARK = require('../../assets/profile-icons/x-dark.png');
const UPLOAD_PRIMARY = require('../../assets/profile-icons/upload-primary.png');
const SPARKLES_WHITE = require('../../assets/profile-icons/sparkles-white.png');
const SPARKLES_GRAY = require('../../assets/profile-icons/sparkles-gray.png');
const SPARKLES_PRIMARY = require('../../assets/profile-icons/sparkles-primary.png');
import { VolcanoService, IMAGE_PROMPTS } from '../../services/volcanoService';
import { storage } from '../../services/storage';
import { checkMediaContent, checkTextContent } from '../../services/contentSafetyService';
import { ensurePrivacyAuthorized } from '../../utils/privacyAuthorization';
import './index.less';

export default function UploadMaterial() {
  const navSpace = useNavSpace();
  const router = Taro.getCurrentInstance().router;
  const isRedemption = router?.params?.isRedemption === '1';
  const redemptionAmount = Number(router?.params?.redemptionAmount) || 0;

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
  const { setManagedTimeout } = useManagedTimeout();

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setManagedTimeout(() => setShowToast(null), 2500);
  };

  const prepareSelectedImage = async (filePath: string): Promise<string> => {
    if (!filePath || /^https?:\/\//i.test(filePath)) return filePath;
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return filePath;

    try {
      const compressed = await Taro.compressImage({
        src: filePath,
        quality: 72,
      });
      return compressed.tempFilePath || filePath;
    } catch (error) {
      console.warn('[UploadMaterial] compress image failed, using original:', error);
      return filePath;
    }
  };

  const handleChooseImage = async () => {
    if (!await ensurePrivacyAuthorized('选择猫咪照片')) return;
    Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const imagePath = res.tempFiles?.[0]?.tempFilePath;
        if (!imagePath) {
          triggerToast('选择图片失败，请重试');
          return;
        }
        setSelectedImage(await prepareSelectedImage(imagePath));
      },
      fail: () => {
        Taro.chooseImage({
          count: 1,
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success: async (imgRes) => {
            const imagePath = imgRes.tempFilePaths?.[0];
            if (!imagePath) {
              triggerToast('选择图片失败，请重试');
              return;
            }
            setSelectedImage(await prepareSelectedImage(imagePath));
          },
          fail: () => triggerToast('选择图片失败，请重试'),
        });
      },
    });
  };

  const handleRemoveImage = (e: any) => {
    e.stopPropagation();
    setSelectedImage(null);
  };

  const handleGenerateImage = async () => {
    if (!selectedImage || !nickname.trim()) {
      triggerToast('请输入猫咪名字并上传照片哦~');
      return;
    }

    setIsDrawing(true);
    try {
      await checkTextContent(nickname, 'cat_profile');
      // 直接传文件路径，volcanoService 内部用 Taro.uploadFile 上传，避免 base64 过大触发微信限制
      const prompt = IMAGE_PROMPTS.anchor('未知', '未知');
      const uploadImage = await prepareSelectedImage(selectedImage);
      await checkMediaContent(uploadImage, 'image', 'cat_upload');
      if (uploadImage !== selectedImage) setSelectedImage(uploadImage);
      const task = await VolcanoService.submitImageTask(prompt, uploadImage);
      const imageUrl = await VolcanoService.pollImageResult(task.id, task.image_url);
      setFirstFrameUrl(imageUrl);
    } catch (e: any) {
      console.error('Stage 1 Error:', e);
      triggerToast(e.message || '形象生成失败，请重试');
    } finally {
      setIsDrawing(false);
    }
  };

  const handleConfirmAndGenerate = () => {
    if (!firstFrameUrl || !nickname.trim()) return;

    const newCat = {
      id: 'cat_' + Date.now(),
      name: nickname.trim(),
      breed: 'AI 生成',
      color: '上传',
      avatar: firstFrameUrl,
      source: 'uploaded' as const,
      createdAt: Date.now(),
      generationStatus: 'pending' as const,
      generationUpdatedAt: Date.now(),
    };
    storage.saveCatInfo(newCat);

    const redemptionParams = isRedemption ? `&isRedemption=1&redemptionAmount=${redemptionAmount}` : '';
    redirectTo(`/pages/generation-progress/index?source=uploaded&catId=${encodeURIComponent(newCat.id)}${redemptionParams}`);
  };

  const handleRegenerate = () => {
    setFirstFrameUrl(null);
    handleGenerateImage();
  };

  const handleSaveImage = async () => {
    if (!firstFrameUrl) return;
    if (!await ensurePrivacyAuthorized('保存生成图片到相册')) return;
    Taro.saveImageToPhotosAlbum({
      filePath: firstFrameUrl,
      success: () => triggerToast('已保存到相册'),
      fail: () => {
        if (firstFrameUrl.startsWith('http')) {
          Taro.downloadFile({
            url: firstFrameUrl,
            success: (downloadRes) => {
              if (downloadRes.statusCode === 200) {
                Taro.saveImageToPhotosAlbum({
                  filePath: downloadRes.tempFilePath,
                  success: () => triggerToast('已保存到相册'),
                  fail: () => triggerToast('保存失败，请长按图片手动保存'),
                });
              }
            },
            fail: () => triggerToast('下载图片失败'),
          });
        } else {
          triggerToast('保存失败，请长按图片手动保存');
        }
      },
    });
  };

  const isReady = selectedImage && nickname.trim();

  return (
    <View className="upload-material-page" style={navSpace as React.CSSProperties}>
      {showToast && (
        <View className="toast">
          <Text className="toast-text">{showToast}</Text>
        </View>
      )}

      {/* Back Button */}
      <View className="back-btn" onClick={() => safeBack()}>
        <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 24, height: 24 }} />
      </View>

      <ScrollView className="upload-material-scroll" scrollY showScrollbar={false}>
      <View className="content">
        <View className="title-section">
          <Text className="main-title">AI 形象生成</Text>
          <Text className="sub-title">AI IMAGE GENERATION</Text>
          <Text className="desc">上传一张您家猫咪的照片，AI 将为您生成专属的数字形象。</Text>
        </View>

        <View className="image-area">
          {selectedImage ? (
            <View className="image-preview">
              <Image className="preview-img" src={selectedImage} mode="aspectFill" />
              <View className="remove-btn" onClick={handleRemoveImage}>
                <Image className="icon-img" src={X_DARK} mode="aspectFit" style={{ width: 16, height: 16 }} />
              </View>
            </View>
          ) : (
            <View className="upload-placeholder" onClick={handleChooseImage}>
              <View className="upload-icon-box">
                <Image className="icon-img" src={UPLOAD_PRIMARY} mode="aspectFit" style={{ width: 32, height: 32 }} />
              </View>
              <Text className="upload-text">点击上传照片</Text>
              <Text className="upload-hint">JPG, PNG 支持</Text>
            </View>
          )}
        </View>

        <View className="input-section">
          <Input
            className="nickname-input"
            type="text"
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
            placeholder="给猫咪起个好听的名字"
            placeholderClass="nickname-placeholder"
            placeholderStyle="color: #8E8E8E"
          />
        </View>

        <View className="btn-section">
          <View
            className={`generate-btn ${isReady && !isDrawing ? 'active' : 'disabled'}`}
            onClick={isReady && !isDrawing ? handleGenerateImage : undefined}
          >
            <Image className="icon-img btn-icon" src={SPARKLES_WHITE} mode="aspectFit" style={{ width: 20, height: 20 }} />
            <Text className="btn-label">{isDrawing ? '绘制专属形象中...' : '开始生成数字形象'}</Text>
          </View>
        </View>
      </View>
      </ScrollView>

      {firstFrameUrl && (
        <View className="confirm-overlay">
          <View className="confirm-dialog">
            <View className="confirm-header">
              <Text className="confirm-title">专属形象初稿</Text>
              <Text className="confirm-desc">AI 已捕捉到了猫咪的灵魂特征</Text>
            </View>
            <View className="confirm-image-box">
              <Image className="confirm-image" src={firstFrameUrl} mode="aspectFill" />
            </View>
            <View className="confirm-actions">
              <View className="confirm-btn primary" onClick={handleConfirmAndGenerate}>
                <Image className="icon-img confirm-btn-icon" src={SPARKLES_PRIMARY} mode="aspectFit" style={{ width: 18, height: 18 }} />
                <Text className="confirm-btn-text primary">确认并注入生命力</Text>
              </View>
              <View className="confirm-btn-row">
                <View className="confirm-btn secondary" onClick={handleRegenerate}>
                  <Text className="confirm-btn-text secondary">重新生成</Text>
                </View>
                <View className="confirm-btn secondary" onClick={handleSaveImage}>
                  <Text className="confirm-btn-text secondary">保存图片</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {isDrawing && (
        <View className="loading-overlay">
          <View className="loading-spinner">
            <View className="spinner-ring" />
            <View className="spinner-icon">
              <Image className="icon-img" src={SPARKLES_PRIMARY} mode="aspectFit" style={{ width: 48, height: 48 }} />
            </View>
          </View>
          <Text className="loading-title">正在绘制专属形象...</Text>
          <Text className="loading-subtitle">STAGE 1: IMAGE CAPTURE</Text>
        </View>
      )}
    </View>
  );
}
