import React, { useState, useRef } from 'react';
import { View, Text, Input, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { safeBack } from '../../utils/navigateAdapter';
import { storage } from '../../services/storage';
import { request } from '../../utils/httpAdapter';
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

  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }

    setError('');
    try {
      const reqData = { phone };
      await request({ url: '/api/v1/auth/send-reset-code', method: 'POST', data: reqData });
      Taro.showToast({ title: '验证码已发送', icon: 'none' });
    } catch {
      // 服务端 API 未就绪时，回退到开发模式
      if (process.env.NODE_ENV === 'development') {
        const mockCode = String(Math.floor(100000 + Math.random() * 900000));
        codeRef.current = mockCode;
        console.log('[Dev] 重置密码验证码:', mockCode);
        Taro.showToast({ title: '验证码已发送（开发模式）', icon: 'none' });
      } else {
        setError('验证码发送失败，请稍后重试');
        return;
      }
    }

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
  };

  const handleSubmit = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code) {
      setError('请输入验证码');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }

    try {
      const resetData = { phone, code, newPassword };
      await request({
        url: '/api/v1/auth/reset-password',
        method: 'POST',
         resetData,
      });
      setShowToast(true);
      setTimeout(() => {
        safeBack();
      }, 1500);
    } catch (e: any) {
      // 服务端 API 未就绪时，回退到开发模式验证
      if (process.env.NODE_ENV === 'development' && codeRef.current && code === codeRef.current) {
        storage.updatePassword(phone);
        setShowToast(true);
        setTimeout(() => {
          safeBack();
        }, 1500);
        return;
      }
      setError(e?.message || '重置密码失败，请重试');
    }
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
            placeholderStyle="color: #8E8E8E"
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
              placeholderStyle="color: #8E8E8E"
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
              placeholderStyle="color: #8E8E8E"
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