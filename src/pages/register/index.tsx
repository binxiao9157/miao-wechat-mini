import React from 'react';
import { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import { navigateBack, navigateTo } from '@tarojs/taro';
import { Eye, EyeOff, ArrowLeft, User, Lock, ShieldCheck } from '../../components/common/Icons';
import PawLogo from '../../components/common/PawLogo';
import { storage, UserInfo } from '../../services/storage';
import { useAuthContext } from '../../context/AuthContext';
import { routeAfterCatSync } from '../../services/catLifecycle';
import './index.less';

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
        password: trimmedPassword,
        nickname: trimmedUsername,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${trimmedUsername}`
      };

      await register(newUser);
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
        <View className="header">
          <View className="back-btn" onClick={() => navigateBack()}>
            <ArrowLeft size={20} />
          </View>
        </View>

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
                <User size={18} />
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
                <Lock size={18} />
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </View>
            </View>
          </View>

          {/* Confirm Password */}
          <View className="input-group">
            <Text className="input-label">确认密码</Text>
            <View className="input-wrapper">
              <View className="input-icon">
                <ShieldCheck size={18} />
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
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </View>
            </View>
          </View>

          {error && <Text className="error-text">{error}</Text>}

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
            <Text className="login-link-action" onClick={() => navigateBack()}>登入</Text>
          </View>
        </View>
      </View>
    </View>
  );
}