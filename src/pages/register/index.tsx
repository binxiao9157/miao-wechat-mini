import React from 'react';
import { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import { navigateBack, reLaunch } from '@tarojs/taro';
import { Eye, EyeOff, ArrowLeft } from '../../components/common/Icons';
import { storage, UserInfo } from '../../services/storage';
import { useAuthContext } from '../../context/AuthContext';
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

      const hasCat = storage.getCatList().length > 0;
      if (hasCat) {
        reLaunch({ url: '/pages/home/index' });
      } else {
        reLaunch({ url: '/pages/empty-cat/index' });
      }
    } catch (e: any) {
      setError(e.message || '注册失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="register-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">注册</Text>
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

        <View className="password-wrapper">
          <Input
            className="miao-input"
            type="text"
            placeholder="确认密码"
            value={confirmPassword}
            onInput={(e) => setConfirmPassword(e.detail.value)}
            password={!showConfirmPassword}
          />
          <View className="eye-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </View>
        </View>

        {error && <Text className="error-text">{error}</Text>}

        <View className="agreement">
          <View
            className={`checkbox ${isAgreed ? 'checked' : ''}`}
            onClick={() => setIsAgreed(!isAgreed)}
          >
            {isAgreed && <Text>✓</Text>}
          </View>
          <Text className="agreement-text">
            我已阅读并同意
            <Text className="link">《Miao 服务条款》</Text>
            和
            <Text className="link">《隐私政策》</Text>
          </Text>
        </View>

        <Button
          className="miao-btn-primary"
          onClick={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? '注册中...' : '注册'}
        </Button>
      </View>
    </View>
  );
}