import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, Image } from '@tarojs/components';
import { navigateTo } from '@tarojs/taro';
import { Eye, EyeOff } from '../../components/common/Icons';
import PawLogo from '../../components/common/PawLogo';
import { storage } from '../../services/storage';
import { useAuthContext } from '../../context/AuthContext';
import { routeAfterCatSync } from '../../services/catLifecycle';
import './index.less';

const DEFAULT_CAT_IMAGE = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default_cat';

export default function Login() {
  const { login, wechatLogin } = useAuthContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [catImage, setCatImage] = useState<string>(DEFAULT_CAT_IMAGE);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const lastImage = storage.getLastCatImage();
    if (lastImage) {
      setCatImage(lastImage);
    }

    const lastUsername = storage.getLastUsername();
    if (lastUsername) {
      setUsername(lastUsername);
    }
  }, []);

  const handleLogin = async () => {
    if (!isAgreed) {
      setError('请先阅读并同意服务条款和隐私政策');
      return;
    }

    const trimmedU = username.trim();
    const trimmedP = password.trim();

    if (!trimmedU || !trimmedP) {
      setError('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await login(trimmedU, trimmedP);
      if (result.success) {
        routeAfterCatSync();
      } else {
        setError(result.error || '用户名或密码错误');
      }
    } catch (e) {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigateTo({ url: '/pages/register/index' });
  };

  const handleWechatLogin = async () => {
    if (!isAgreed) {
      setError('请先阅读并同意服务条款和隐私政策');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await wechatLogin();
      if (!result.success) {
        setError(result.error || '微信登录失败');
        return;
      }
      routeAfterCatSync();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="login-page">
      {/* Decorative background */}
      <View className="bg-decoration bg-decoration-1"></View>
      <View className="bg-decoration bg-decoration-2"></View>

      <View className="content">
        {/* Logo Section */}
        <View className="logo-section">
          <View className="logo-wrapper">
            <PawLogo size={48} className="logo-icon" />
          </View>
          <Text className="app-name">Miao</Text>
        </View>

        {/* Title Section */}
        <View className="title-section">
          <Text className="title">欢迎来到 Miao</Text>
          <Text className="subtitle">以喵星之名，守护你的每一份温暖</Text>
        </View>

        {/* Cat Image */}
        <View className="cat-container">
          <View className="cat-outer">
            <View className="cat-inner">
              <Image
                src={catImage}
                className="cat-image"
                mode="aspectFill"
              />
            </View>
          </View>
        </View>

        {/* Form Section */}
        <View className="form-section">
          <View className="input-group">
            <Input
              className="miao-input"
              type="text"
              placeholder="用户名"
              value={username}
              onInput={(e) => setUsername(e.detail.value)}
            />
          </View>

          <View className="input-group">
            <View className="password-wrapper">
              <Input
                className="miao-input password-input"
                type="text"
                placeholder="密码"
                value={password}
                onInput={(e) => setPassword(e.detail.value)}
                password={!showPassword}
              />
              <View className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </View>
            </View>
          </View>

          <View className="forgot-password">
            <Text className="forgot-text" onClick={() => navigateTo({ url: '/pages/reset-password/index' })}>
              忘记密码？
            </Text>
          </View>

          {error && <Text className="error-text">{error}</Text>}

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

          <View className="buttons">
            <Button className="login-btn" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? '登录中...' : '登录'}
            </Button>
            <Button className="login-btn" onClick={handleWechatLogin} disabled={isLoading}>
              微信一键登录
            </Button>
            <Button className="register-btn" onClick={handleRegister}>
              注册
            </Button>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="footer">
        <Text className="download-btn" onClick={() => navigateTo({ url: '/pages/download/index' })}>
          扫码下载 App
        </Text>
        <View className="footer-links">
          <Text className="footer-link" onClick={() => navigateTo({ url: '/pages/privacy-policy/index' })}>隐私政策</Text>
          <Text className="dot">·</Text>
          <Text className="footer-link" onClick={() => navigateTo({ url: '/pages/terms-of-service/index' })}>服务条款</Text>
        </View>
        <Text className="copyright">© 2026 MIAO SANCTUARY</Text>
      </View>
    </View>
  );
}
