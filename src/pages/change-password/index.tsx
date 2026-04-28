import React, { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { ArrowLeft, Eye, EyeOff, Lock } from '../../components/common/Icons';
import { useAuthContext } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import './index.less';

export default function ChangePassword() {
  const { user } = useAuthContext();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('请填写完整信息');
      return;
    }

    const savedUser = user?.username ? storage.findUser(user.username) : null;
    if (!savedUser || currentPassword !== savedUser.password) {
      setError('当前密码错误');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }

    storage.updatePassword(user!.username, newPassword);
    setShowToast(true);
    setTimeout(() => {
      navigateBack();
    }, 1500);
  };

  return (
    <View className="change-password-page">
      {/* Toast */}
      {showToast && (
        <View className="toast">
          <Text className="toast-text">密码修改成功喵~</Text>
        </View>
      )}

      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={24} />
        </View>
        <Text className="header-title">修改登录密码</Text>
      </View>

      {/* 安全验证说明 */}
      <View className="intro-section">
        <View className="intro-icon-box">
          <Lock size={32} />
        </View>
        <Text className="intro-title">安全验证</Text>
        <Text className="intro-desc">为了您的账号安全，请在修改密码前进行身份验证。</Text>
      </View>

      {/* 表单 */}
      <View className="form-section">
        {/* 当前密码 */}
        <View className="form-group">
          <Text className="form-label">当前密码</Text>
          <View className="input-wrapper">
            <View className="input-icon">
              <Lock size={18} />
            </View>
            <Input
              className="form-input"
              type="text"
              value={currentPassword}
              onInput={(e) => { setCurrentPassword(e.detail.value); if (error) setError(''); }}
              placeholder="请输入当前使用的密码"
              password={!showCurrent}
            />
            <View className="input-toggle" onClick={() => setShowCurrent(!showCurrent)}>
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </View>
          </View>
        </View>

        {/* 新密码 */}
        <View className="form-group">
          <Text className="form-label">新密码</Text>
          <View className="input-wrapper">
            <View className="input-icon">
              <Lock size={18} />
            </View>
            <Input
              className="form-input"
              type="text"
              value={newPassword}
              onInput={(e) => { setNewPassword(e.detail.value); if (error) setError(''); }}
              placeholder="设置 6-20 位新密码"
              password={!showNew}
            />
            <View className="input-toggle" onClick={() => setShowNew(!showNew)}>
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </View>
          </View>
        </View>

        {/* 确认新密码 */}
        <View className="form-group">
          <Text className="form-label">确认新密码</Text>
          <View className="input-wrapper">
            <View className="input-icon">
              <Lock size={18} />
            </View>
            <Input
              className="form-input"
              type="text"
              value={confirmPassword}
              onInput={(e) => { setConfirmPassword(e.detail.value); if (error) setError(''); }}
              placeholder="请再次输入新密码"
              password={!showConfirm}
            />
            <View className="input-toggle" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </View>
          </View>
        </View>

        {/* 错误提示 */}
        {error && (
          <View className="error-box">
            <Text className="error-text">{error}</Text>
          </View>
        )}

        {/* 保存按钮 */}
        <View className="save-btn" onClick={handleSave}>
          <Text className="save-btn-text">保存修改</Text>
        </View>
      </View>

      {/* 底部提示 */}
      <Text className="footer-hint">忘记密码？请联系客服进行人工找回</Text>
    </View>
  );
}