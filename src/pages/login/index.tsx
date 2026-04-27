import { useState, useEffect } from 'react';
import { View, Text, Input, Button, Image, Checkbox } from '@tarojs/components';
import { navigateTo, reLaunch } from '@tarojs/taro';
import { Eye, EyeOff } from 'lucide-react';
import { storage } from '../../services/storage';
import './index.less';

const DEFAULT_CAT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="%23FEF6F0" width="200" height="200"/%3E%3Ctext x="100" y="115" text-anchor="middle" font-size="80"%3E🐱%3C/text%3E%3C/svg%3E';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [catImage, setCatImage] = useState<string | null>(null);
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

  const performLogin = async (u: string, p: string) => {
    const trimmedU = u.trim();
    const trimmedP = p.trim();
    if (!trimmedU || !trimmedP) {
      setError('请输入用户名和密码');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const user = storage.findUser(trimmedU);
      if (user && user.password === trimmedP) {
        storage.saveUserInfo(user);
        const hasCat = storage.getCatList().length > 0;
        if (hasCat) {
          reLaunch({ url: '/pages/home/index' });
        } else {
          reLaunch({ url: '/pages/emptyCat/index' });
        }
      } else {
        setError('用户名或密码错误');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (!isAgreed) {
      setError('请先同意服务条款和隐私政策');
      return;
    }
    performLogin(username, password);
  };

  return (
    <View className="login-page">
      <View className="login-container">
        <View className="logo-section">
          <Text className="logo-text">Miao</Text>
          <Text className="subtitle">以喵星之名，守护你的每一份温暖</Text>
        </View>

        <View className="cat-image-container">
          <Image
            className="cat-image"
            src={catImage || DEFAULT_CAT_IMAGE}
            mode="aspectFill"
          />
        </View>

        <View className="form-section">
          <Input
            className="miao-input"
            type="text"
            placeholder="用户名"
            value={username}
            onInput={(e) => setUsername(e.detail.value)}
          />
          <View className="password-wrapper">
            <Input
              className="miao-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="密码"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
            <View className="eye-icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </View>
          </View>

          <View className="forgot-password">
            <Text onClick={() => navigateTo({ url: '/pages/resetPassword/index' })}>
              忘记密码？
            </Text>
          </View>

          {error && <Text className="error-text">{error}</Text>}

          <View className="agreement">
            <Checkbox
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.detail.value)}
            />
            <Text className="agreement-text">
              我已阅读并同意
              <Text className="link" onClick={() => navigateTo({ url: '/pages/terms/index' })}>《Miao 服务条款》</Text>
              和
              <Text className="link" onClick={() => navigateTo({ url: '/pages/privacyPolicy/index' })}>《隐私政策》</Text>
            </Text>
          </View>

          <Button
            className="miao-btn-primary"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </Button>
          <Button
            className="miao-btn-secondary"
            onClick={() => navigateTo({ url: '/pages/register/index' })}
          >
            注册
          </Button>
        </View>

        <View className="footer-section">
          <Text
            className="download-link"
            onClick={() => navigateTo({ url: '/pages/download/index' })}
          >
            扫码下载 App
          </Text>
          <View className="footer-links">
            <Text onClick={() => navigateTo({ url: '/pages/privacyPolicy/index' })}>隐私政策</Text>
            <Text>服务条款</Text>
          </View>
        </View>
      </View>
    </View>
  );
}