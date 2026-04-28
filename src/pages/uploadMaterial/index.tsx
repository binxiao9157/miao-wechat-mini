import React from 'react';
import { useState } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import { navigateBack, navigateTo } from '@tarojs/taro';
import { ArrowLeft, Camera, Upload, ImageIcon } from '../../components/common/Icons';
import './index.less';

export default function UploadMaterial() {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectImage = () => {
    // 微信小程序使�?chooseImage API
    // 这里模拟选择图片
    console.log('Select image');
  };

  const handleUpload = () => {
    if (!selectedImage) {
      return;
    }
    setIsUploading(true);
    // 模拟上传过程
    setTimeout(() => {
      setIsUploading(false);
      navigateTo({ url: '/pages/generationProgress/index' });
    }, 2000);
  };

  return (
    <View className="upload-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">上传照片</Text>
        <View className="placeholder" />
      </View>

      <View className="content">
        <Text className="desc">上传一张猫咪照片，AI将为你生成可爱的小猫�?/Text>

        <View className="upload-area" onClick={handleSelectImage}>
          {selectedImage ? (
            <Image className="preview-image" src={selectedImage} mode="aspectFill" />
          ) : (
            <View className="upload-placeholder">
              <ImageIcon size={48} />
              <Text className="upload-text">点击上传图片</Text>
              <Text className="upload-hint">支持 JPG、PNG 格式</Text>
            </View>
          )}
        </View>

        <View className="tips">
          <Text className="tips-title">上传建议�?/Text>
          <Text className="tips-item">�?照片清晰、光线充�?/Text>
          <Text className="tips-item">�?猫咪正脸或侧脸效果更�?/Text>
          <Text className="tips-item">�?背景简洁为�?/Text>
        </View>

        <Button
          className="upload-btn"
          onClick={handleUpload}
          disabled={!selectedImage || isUploading}
        >
          {isUploading ? '上传�?..' : '开始生�?}
        </Button>
      </View>
    </View>
  );
}