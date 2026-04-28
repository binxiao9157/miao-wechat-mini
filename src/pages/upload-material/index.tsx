import React, { useState } from 'react';
import { View, Text, Image, Input } from '@tarojs/components';
import Taro, { navigateBack, navigateTo } from '@tarojs/taro';
import { ArrowLeft, Upload, Sparkles, X } from '../../components/common/Icons';
import { VolcanoService, IMAGE_PROMPTS } from '../../services/volcanoService';
import { storage } from '../../services/storage';
import './index.less';

export default function UploadMaterial() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  // 选择图片 - 使用 Taro.chooseMedia
  const handleChooseImage = () => {
    Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        setSelectedImage(tempFile.tempFilePath);
      },
      fail: (err) => {
        console.error('chooseMedia failed:', err);
        // 降级到 chooseImage
        Taro.chooseImage({
          count: 1,
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success: (imgRes) => {
            setSelectedImage(imgRes.tempFilePaths[0]);
          },
          fail: () => {
            triggerToast('选择图片失败，请重试');
          }
        });
      }
    });
  };

  // 移除已选图片
  const handleRemoveImage = (e: any) => {
    e.stopPropagation();
    setSelectedImage(null);
  };

  // 生成AI首帧形象
  const handleGenerateImage = async () => {
    if (!selectedImage || !nickname.trim()) {
      triggerToast('请输入猫咪名字并上传照片哦~');
      return;
    }

    setIsDrawing(true);
    try {
      // 将本地图片转为 base64
      let imageBase64 = selectedImage;
      if (!selectedImage.startsWith('')) {
        try {
          const fs = Taro.getFileSystemManager();
          const fileData = fs.readFileSync(selectedImage, 'base64');
          imageBase64 = `data:image/jpeg;base64,${fileData}`;
        } catch (e) {
          console.error('读取图片失败:', e);
          // 如果读取失败，直接使用文件路径
          imageBase64 = selectedImage;
        }
      }

      // 构建提示词
      const prompt = IMAGE_PROMPTS.anchor(nickname, '未知');

      // 调用AI生成首帧
      const task = await VolcanoService.submitImageTask(prompt, imageBase64);
      const imageUrl = await VolcanoService.pollImageResult(task.id, task.image_url);
      setFirstFrameUrl(imageUrl);
    } catch (e: any) {
      console.error('Stage 1 Error:', e);
      triggerToast(e.message || '形象生成失败，请重试');
    } finally {
      setIsDrawing(false);
    }
  };

  // 确认首帧并跳转到视频生成
  const handleConfirmAndGenerate = () => {
    if (!firstFrameUrl || !nickname.trim()) return;

    // 保存猫咪信息到 storage
    const newCat = {
      id: 'cat_' + Date.now(),
      name: nickname.trim(),
      breed: 'AI 生成',
      color: '上传',
      avatar: firstFrameUrl,
      source: 'uploaded' as const,
      createdAt: Date.now(),
    };
    storage.saveCatInfo(newCat);

    // 跳转到生成进度页
    navigateTo({ url: '/pages/generation-progress/index' });
  };

  // 重新生成
  const handleRegenerate = () => {
    setFirstFrameUrl(null);
    handleGenerateImage();
  };

  // 保存图片到相册
  const handleSaveImage = () => {
    if (!firstFrameUrl) return;
    Taro.saveImageToPhotosAlbum({
      filePath: firstFrameUrl,
      success: () => {
        triggerToast('已保存到相册');
      },
      fail: () => {
        // 如果是网络图片，需要先下载
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
      }
    });
  };

  const isReady = selectedImage && nickname.trim();

  return (
    <View className="upload-material-page">
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
        <Text className="header-title">上传素材</Text>
      </View>

      {/* Content */}
      <View className="content">
        {/* Title Section */}
        <View className="title-section">
          <Text className="main-title">AI 形象生成</Text>
          <Text className="sub-title">AI IMAGE GENERATION</Text>
          <Text className="desc">上传一张您家猫咪的照片，AI 将为您生成专属的数字形象。</Text>
        </View>

        {/* Image Upload Area */}
        <View className="image-area">
          {selectedImage ? (
            <View className="image-preview">
              <Image className="preview-img" src={selectedImage} mode="aspectFill" />
              <View className="remove-btn" onClick={handleRemoveImage}>
                <X size={16} />
              </View>
            </View>
          ) : (
            <View className="upload-placeholder" onClick={handleChooseImage}>
              <View className="upload-icon-box">
                <Upload size={32} />
              </View>
              <Text className="upload-text">点击上传照片</Text>
              <Text className="upload-hint">JPG, PNG 支持</Text>
            </View>
          )}
        </View>

        {/* Nickname Input */}
        <View className="input-section">
          <Input
            className="nickname-input"
            type="text"
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
            placeholder="给猫咪起个好听的名字"
            placeholderClass="nickname-placeholder"
          />
        </View>

        {/* Generate Button */}
        <View className="btn-section">
          <View
            className={`generate-btn ${isReady && !isDrawing ? 'active' : 'disabled'}`}
            onClick={isReady && !isDrawing ? handleGenerateImage : undefined}
          >
            <Sparkles size={20} className="btn-icon" />
            <Text className="btn-label">{isDrawing ? '绘制专属形象中...' : '开始生成数字形象'}</Text>
          </View>
        </View>
      </View>

      {/* 首帧确认弹窗 */}
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
                <Sparkles size={18} className="confirm-btn-icon" />
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

      {/* 生成中加载遮罩 */}
      {isDrawing && (
        <View className="loading-overlay">
          <View className="loading-spinner">
            <View className="spinner-ring" />
            <View className="spinner-icon">
              <Sparkles size={48} />
            </View>
          </View>
          <Text className="loading-title">正在绘制专属形象...</Text>
          <Text className="loading-subtitle">STAGE 1: IMAGE CAPTURE</Text>
        </View>
      )}
    </View>
  );
}