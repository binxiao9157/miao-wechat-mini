import React, { useState } from 'react';
import { View, Text, Input, Image } from '@tarojs/components';
import Taro, { navigateBack } from '@tarojs/taro';
import PageHeader from '../../components/layout/PageHeader';
const CAMERA_PNG = require('../../assets/profile-icons/camera-primary.png');
const CHECKCIRCLE_PNG = require('../../assets/profile-icons/checkcircle-green.png');
const IMAGEICON_PNG = require('../../assets/profile-icons/image-primary.png');
const X_GRAY_PNG = require('../../assets/profile-icons/x-gray.png');
import { useAuthContext } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { request } from '../../utils/httpAdapter';
import './index.less';

export default function EditProfile() {
  const { user, updateProfile } = useAuthContext();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await request({
        url: '/api/v1/me',
        method: 'PATCH',
        data: { nickname: nickname.trim(), avatar },
      });
      if (res.data?.user) {
        updateProfile({ nickname: res.data.user.nickname, avatar: res.data.user.avatar });
      }
      setShowSuccessToast(true);
      setTimeout(() => navigateBack(), 1500);
    } catch (e: any) {
      Taro.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChooseFromAlbum = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 压缩图片
        Taro.compressImage({
          src: tempFilePath,
          quality: 70,
          success: (compressRes) => {
            setAvatar(compressRes.tempFilePath);
            setShowActionSheet(false);
          },
          fail: () => {
            setAvatar(tempFilePath);
            setShowActionSheet(false);
          }
        });
      },
      fail: () => {}
    });
  };

  const handleTakePhoto = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        setAvatar(tempFilePath);
        setShowActionSheet(false);
      },
      fail: () => {}
    });
  };

  return (
    <View className="edit-profile-page">
      {/* 成功提示 */}
      {showSuccessToast && (
        <View className="success-toast">
          <Image className="icon-img" src={CHECKCIRCLE_PNG} mode="aspectFit" style={{ width: 18, height: 18 }} />
          <Text className="success-toast-text">修改成功！</Text>
        </View>
      )}

      {/* Header */}
      <PageHeader
        title="编辑资料"
        rightElement={
          <View className={`save-btn ${isSaving ? 'disabled' : ''}`} onClick={isSaving ? undefined : handleSave}>
            <Text className="save-btn-text">{isSaving ? '...' : '保存'}</Text>
          </View>
        }
      />

      {/* 头像区域 */}
      <View className="avatar-section">
        <View className="avatar-wrapper" onClick={() => setShowActionSheet(true)}>
          <View className="avatar-box">
            <Image
              className="avatar-image"
              src={avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=miao_default'}
              mode="aspectFill"
            />
          </View>
          <View className="avatar-camera-btn">
            <Image className="icon-img" src={CAMERA_PNG} mode="aspectFit" style={{ width: 22, height: 22 }} />
          </View>
        </View>
        <Text className="avatar-hint">点击更换头像</Text>
      </View>

      {/* 表单 */}
      <View className="form-section">
        <View className="form-group">
          <Text className="form-label">昵称</Text>
          <View className="input-wrapper">
            <Input
              className="form-input"
              type="text"
              value={nickname}
              onInput={(e) => setNickname(e.detail.value)}
              placeholder="输入您的新昵称"
            />
          </View>
        </View>

        {user?.phone && (
          <View className="form-group">
            <Text className="form-label">手机号</Text>
            <View className="input-wrapper">
              <Text className="form-input phone-display">{user.phone}</Text>
            </View>
          </View>
        )}

        <View className="form-group">
          <View className="nav-item" onClick={() => navigateTo({ url: '/pages/change-password/index' })}>
            <Text className="nav-item-text">修改登录密码</Text>
            <Text className="nav-item-arrow">›</Text>
          </View>
        </View>
      </View>

      {/* 提示 */}
      <View className="hint-box">
        <Text className="hint-text">
          提示：好的昵称能让您的猫咪伙伴更容易记住您哦。头像建议选择清晰的个人照片或可爱的宠物合照。
        </Text>
      </View>

      {/* ActionSheet */}
      {showActionSheet && (
        <View className="actionsheet-overlay" onClick={() => setShowActionSheet(false)}>
          <View className="actionsheet" onClick={(e) => e.stopPropagation()}>
            <View className="actionsheet-header">
              <Text className="actionsheet-title">更换头像</Text>
              <View className="actionsheet-close" onClick={() => setShowActionSheet(false)}>
                <Image className="icon-img" src={X_GRAY_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
              </View>
            </View>

            <View className="actionsheet-options">
              <View className="actionsheet-option" onClick={handleChooseFromAlbum}>
                <View className="option-icon-box blue">
                  <Image className="icon-img" src={IMAGEICON_PNG} mode="aspectFit" style={{ width: 28, height: 28 }} />
                </View>
                <Text className="option-text">从相册选择</Text>
              </View>
              <View className="actionsheet-option" onClick={handleTakePhoto}>
                <View className="option-icon-box orange">
                  <Image className="icon-img" src={CAMERA_PNG} mode="aspectFit" style={{ width: 28, height: 28 }} />
                </View>
                <Text className="option-text">拍照</Text>
              </View>
            </View>

            <View className="actionsheet-cancel" onClick={() => setShowActionSheet(false)}>
              <Text className="cancel-text">取消</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function navigateTo(options: { url: string }) {
  Taro.navigateTo(options);
}