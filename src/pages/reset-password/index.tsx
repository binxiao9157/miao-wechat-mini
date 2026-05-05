import React, { useState, useRef } from 'react';
import { View, Text, Input, Image } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { storage } from '../../services/storage';
import PageHeader from '../../components/layout/PageHeader';
import './index.less';

const EYE_DARK = require('../../assets/profile-icons/eye-dark.png');
const EYEOFF_DARK = require('../../assets/profile-icons/eyeoff-dark.png');
const LOCK_DARK = require('../../assets/profile-icons/lock-dark.png');

export default function ResetPassword() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const codeRef = useRef('');

  let countdownTimer: ReturnType<typeof setInterval>;

  const handleSendCode = () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }

    // Mock: 生成随机6位验证码
    const mockCode = String(Math.floor(100000 + Math.random() * 900000));
    codeRef.current = mockCode;
    setError('');
    setCountdown(60);
    countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 提示用户验证码（Mock）
    import('@tarojs/taro').then(Taro => {
      Taro.showModal({
        title: '验证码（测试）',
        content: `您的验证码是：${mockCode}（测试环境，正式环境将通过短信发送）`,
        showCancel: false,
      });
    });
  };

  const handleSubmit = () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code) {
      setError('请输入验证码');
      return;
    }
    if (code !== codeRef.current) {
      setError('验证码错误');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }

    const user = storage.findUser(phone);
    if (!user) {
      setError('该手机号未注册');
      return;
    }

    storage.updatePassword(phone, newPassword);
    setShowToast(true);
    setTimeout(() => {
      navigateBack();
    }, 1500);
  };

  return (
    <View className="reset-password-page">
      {/* Toast */}
      {showToast && (
        <View className="toast">
          <Text className="toast-text">密码重置成功！</Text>
        </View>
      )}

      {/* Header */}
      <PageHeader title="重置密码" />

      {/* 表单 */}
      <View className="form-section">
        {/* 手机号 */}
        <View className="form-group">
          <Text className="form-label">手机号</Text>
          <Input
            className="form-input"
            type="number"
            value={phone}
            onInput={(e) => { setPhone(e.detail.value); if (error) setError(''); }}
            placeholder="请输入注册时的手机号"
            maxlength={11}
          />
        </View>

        {/* 验证码 */}
        <View className="form-group">
          <Text className="form-label">验证码</Text>
          <View className="code-row">
            <Input
              className="code-input"
              type="number"
              value={code}
              onInput={(e) => { setCode(e.detail.value); if (error) setError(''); }}
              placeholder="请输入验证码"
              maxlength={6}
            />
            <View
              className={`code-btn ${countdown > 0 ? 'disabled' : ''}`}
              onClick={countdown > 0 ? undefined : handleSendCode}
            >
              <Text className="code-btn-text">{countdown > 0 ? `${countdown}s` : '获取验证码'}</Text>
            </View>
          </View>
        </View>

        {/* 新密码 */}
        <View className="form-group">
          <Text className="form-label">新密码</Text>
          <View className="input-wrapper">
            <View className="input-icon">
              <Image className="icon-img" src={LOCK_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} />
            </View>
            <Input
              className="form-input-with-icon"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onInput={(e) => { setNewPassword(e.detail.value); if (error) setError(''); }}
              placeholder="设置 6-20 位新密码"
            />
            <View className="input-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <Image className="icon-img" src={EYEOFF_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} /> : <Image className="icon-img" src={EYE_DARK} mode="aspectFit" style={{ width: 18, height: 18 }} />}
            </View>
          </View>
        </View>

        {/* 错误提示 */}
        {error && (
          <View className="error-box">
            <Text className="error-text">{error}</Text>
          </View>
        )}

        {/* 提交按钮 */}
        <View className="submit-btn" onClick={handleSubmit}>
          <Text className="submit-btn-text">重置密码</Text>
        </View>
      </View>
    </View>
  );
}