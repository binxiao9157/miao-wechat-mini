import React, { useEffect, useState } from 'react';
import { View, Text, Input, Switch, Button, Image } from '@tarojs/components';
import Taro, { navigateBack } from '@tarojs/taro';
import { aiConfig, AIProfile, AIProvider, DEFAULT_AI_PROFILES } from '../../services/aiConfig';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const SETTINGS_DARK = require('../../assets/profile-icons/settings-dark.png');
const REFRESHCW_PRIMARY = require('../../assets/profile-icons/refreshcw-primary.png');
const CHECKCIRCLE_GREEN = require('../../assets/profile-icons/checkcircle-green.png');

import './index.less';

export default function AdminSettings() {
  const [profile, setProfile] = useState<AIProfile>(DEFAULT_AI_PROFILES.volcengine);

  useEffect(() => {
    setProfile(aiConfig.getProfile());
  }, []);

  const handleProviderChange = (provider: AIProvider) => {
    const defaults = DEFAULT_AI_PROFILES[provider];
    setProfile(prev => ({
      ...defaults,
      mockMode: prev.mockMode,
      resolution: prev.resolution || defaults.resolution,
      duration: prev.duration || defaults.duration,
      seed: prev.seed || defaults.seed,
      promptExtend: prev.promptExtend,
    }));
  };

  const updateField = <K extends keyof AIProfile>(key: K, value: AIProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    aiConfig.saveProfile(profile);
    Taro.showToast({ title: '配置已保存', icon: 'success' });
  };

  const handleReset = () => {
    aiConfig.reset();
    const nextProfile = aiConfig.getProfile();
    setProfile(nextProfile);
    Taro.showToast({ title: '已恢复默认', icon: 'success' });
  };

  return (
    <View className="admin-settings-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 24, height: 24 }} />
        </View>
        <View className="header-title-wrap">
          <Text className="header-title">后台配置</Text>
          <Text className="header-subtitle">AI Provider Profile</Text>
        </View>
      </View>

      <View className="section">
        <View className="section-head">
          <View className="section-icon">
            <Image className="icon-img" src={SETTINGS_DARK} mode="aspectFit" style={{ width: 22, height: 22 }} />
          </View>
          <View>
            <Text className="section-title">AI 模型配置</Text>
            <Text className="section-desc">与 PWA 后台配置策略保持一致</Text>
          </View>
        </View>

        <View className="provider-tabs">
          {(['dashscope', 'volcengine'] as AIProvider[]).map(provider => (
            <View
              key={provider}
              className={`provider-tab ${profile.provider === provider ? 'active' : ''}`}
              onClick={() => handleProviderChange(provider)}
            >
              <Text className="provider-text">{provider === 'dashscope' ? '阿里百练' : '火山引擎'}</Text>
            </View>
          ))}
        </View>

        <View className="form-list">
          <View className="field">
            <Text className="label">图片模型</Text>
            <Input
              className="input"
              value={profile.imageModel}
              onInput={(e) => updateField('imageModel', e.detail.value)}
            />
          </View>

          <View className="field">
            <Text className="label">视频模型</Text>
            <Input
              className="input"
              value={profile.videoModel}
              onInput={(e) => updateField('videoModel', e.detail.value)}
            />
          </View>

          <View className="field-row">
            <View className="field compact">
              <Text className="label">清晰度</Text>
              <Input
                className="input compact-input"
                value={profile.resolution}
                onInput={(e) => updateField('resolution', e.detail.value)}
              />
            </View>
            <View className="field compact">
              <Text className="label">时长</Text>
              <Input
                className="input compact-input"
                type="number"
                value={String(profile.duration)}
                onInput={(e) => updateField('duration', Number(e.detail.value) || 5)}
              />
            </View>
            <View className="field compact">
              <Text className="label">Seed</Text>
              <Input
                className="input compact-input"
                type="number"
                value={String(profile.seed)}
                onInput={(e) => updateField('seed', Number(e.detail.value) || 12345)}
              />
            </View>
          </View>

          <View className="switch-row">
            <View className="switch-item">
              <Text className="switch-label">Prompt 扩展</Text>
              <Switch
                color="#ff8c5a"
                checked={profile.promptExtend}
                onChange={(e) => updateField('promptExtend', e.detail.value)}
              />
            </View>
            <View className="switch-item">
              <Text className="switch-label">Mock 模式</Text>
              <Switch
                color="#ff8c5a"
                checked={profile.mockMode}
                onChange={(e) => updateField('mockMode', e.detail.value)}
              />
            </View>
          </View>
        </View>
      </View>

      <View className="tips">
        <Text className="tips-title">说明</Text>
        <Text className="tips-text">
          API Key 仍只保存在服务端环境变量中。这里仅切换 provider、模型名和生成参数，小程序不会保存密钥。
        </Text>
      </View>

      <View className="bottom-actions">
        <Button className="reset-btn" onClick={handleReset}>
          <Image className="icon-img" src={REFRESHCW_PRIMARY} mode="aspectFit" style={{ width: 20, height: 20 }} />
          恢复默认
        </Button>
        <Button className="save-btn" onClick={handleSave}>
          <Image className="icon-img" src={CHECKCIRCLE_GREEN} mode="aspectFit" style={{ width: 20, height: 20 }} />
          保存配置
        </Button>
      </View>
    </View>
  );
}
