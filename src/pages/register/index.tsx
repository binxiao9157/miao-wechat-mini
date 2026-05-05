import React from 'react';
import { useState } from 'react';
import { View, Text, Input, Button, Image } from '@tarojs/components';
import { navigateTo } from '@tarojs/taro';
import { safeBack } from '../../utils/navigateAdapter';
import PawLogo from '../../components/common/PawLogo';
import PageHeader from '../../components/layout/PageHeader';
import { storage, UserInfo } from '../../services/storage';
import { useAuthContext } from '../../context/AuthContext';
import { routeAfterCatSync } from '../../services/catLifecycle';
import './index.less';
const USER_DARK = require('../../assets/profile-icons/user-dark.png');
const LOCK_DARK = require('../../assets/profile-icons/lock-dark.png');
const EYEOFF_DARK = require('../../assets/profile-icons/eyeoff-dark.png');
const EYE_DARK = require('../../assets/profile-icons/eye-dark.png');
const SHIELDCHECK_DARK = require('../../assets/profile-icons/shieldcheck-dark.png');

export default function Register() {
  const { register } = useAuthContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!isAgreed) {
      setError('请先阅读并勾选同意服务条款与隐私政策');
      return;
    }
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedUsername || !trimmedPassword || !trimmedConfirm) {
      setError('请填写完整信息');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const existingUser = storage.findUser(trimmedUsername);
      if (existingUser) {
        setError('用户名已存在');
        setIsLoading(false);
        return;
      }

      const newUser: UserInfo = {
        username: trimmedUsername,
        nickname: trimmedUsername,
        avatar: ''
      };

      await register(newUser);
      // 注册成功后，清除本地存储中的明文密码
      const savedUser = storage.findUser(trimmedUsername);
      if (savedUser) {
        storage.saveUserInfo({ ...savedUser, passwordSet: true });
      }
      routeAfterCatSync();
    } catch (e: any) {
      setError(e.message || '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="register-page">
      {/* Decorative background */}
      <View className="bg-decoration bg-decoration-1"></View>
      <View className="bg-decoration bg-decoration-2"></View>

      <View className="content">
        {/* Header */}
        <PageHeader title="加入 Miao" onBack={() => safeBack()} />

        {/* Logo Section */}
        <View className="logo-section">
          <View className="logo-wrapper">
            <PawLogo size={56} className="logo-icon" />
          </View>
          <Text className="app-name">加入 Miao</Text>
        </View>

        {/* Subtitle */}
        <Text className="subtitle">开启您与宠物的精致陪伴之旅，记录每一个温暖瞬间。</Text>

        {/* Form Section */}
        <View className="form-section">
          {/* Username */}
          <View className="input-group">
            <Text className="input-label">用户名</Text>
            <View className="input-wrapper">
              <View className="input-icon">
                <Image className="icon-img" src={USER_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} />
              </View>
              <Input
                className="miao-input with-icon"
                type="text"
                placeholder="请输入您的用户名"
                value={username}
                onInput={(e) => setUsername(e.detail.value)}
              />
            </View>
          </View>

          {/* Password */}
          <View className="input-group">
            <Text className="input-label">设置密码</Text>
            <View className="input-wrapper">
              <View className="input-icon">
                <Image className="icon-img" src={LOCK_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} />
              </View>
              <Input
                className="miao-input with-icon with-eye"
                type="text"
                placeholder="请输入您的密码"
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
                password={!showPassword}
              />
              <View className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <Image className="icon-img" src={EYEOFF_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} /> : <Image className="icon-img" src={EYE_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} />}
              </View>
            </View>
          </View>

          {/* Confirm Password */}
          <View className="input-group">
            <Text className="input-label">确认密码</Text>
            <View className="input-wrapper">
              <View className="input-icon">
                <Image className="icon-img" src={SHIELDCHECK_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} />
              </View>
              <Input
                className="miao-input with-icon with-eye"
                type="text"
                placeholder="请再次输入您的密码"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
                password={!showConfirmPassword}
              />
              <View className="eye-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <Image className="icon-img" src={EYEOFF_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} /> : <Image className="icon-img" src={EYE_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} />}
              </View>
            </View>
          </View>

          {error && (
            <View className="error-box">
              <Text className="error-text">{error}</Text>
            </View>
          )}

          {/* Agreement */}
          <View className="agreement" onClick={() => setIsAgreed(!isAgreed)}>
            <View className={`custom-checkbox ${isAgreed ? 'checked' : ''}`}>
              {isAgreed && <Text className="check-mark">✓</Text>}
            </View>
            <Text className="agreement-text">
              我已阅读并同意
              <Text className="link" onClick={(e) => { e.stopPropagation(); navigateTo({ url: '/pages/terms-of-service/index' }); }}>《Miao 服务条款》</Text>
              和
              <Text className="link" onClick={(e) => { e.stopPropagation(); navigateTo({ url: '/pages/privacy-policy/index' }); }}>《隐私政策》</Text>
            </Text>
          </View>

          {/* Register Button */}
          <Button
            className="miao-btn-primary"
            onClick={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '立即注册'}
          </Button>

          {/* Login Link */}
          <View className="login-link">
            <Text className="login-link-text">已有账号？</Text>
            <Text className="login-link-action" onClick={() => safeBack()}>登入</Text>
          </View>

          {/* Bottom agreement text */}
          <Text className="bottom-agreement">
            注册即表示您同意
            <Text className="link" onClick={() => navigateTo({ url: '/pages/terms-of-service/index' })}>《Miao 服务条款》</Text>
            和
            <Text className="link" onClick={() => navigateTo({ url: '/pages/privacy-policy/index' })}>《隐私政策》</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}