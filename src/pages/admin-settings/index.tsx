import React, { useEffect, useState } from 'react';
import { View, Text, Input, Switch, Image } from '@tarojs/components';
import Taro, { navigateBack } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import { aiConfig, AIProfile, AIProvider, DEFAULT_AI_PROFILES } from '../../services/aiConfig';
import { storage, PresetCat } from '../../services/storage';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const PLUS_WHITE = require('../../assets/profile-icons/plus-white.png');
const X_GRAY = require('../../assets/profile-icons/x-gray.png');

const PROVIDER_LABELS: Record<AIProvider, string> = {
  dashscope: 'DashScope',
  volcengine: 'Volcengine',
};

export default function AdminSettings() {
  const navSpace = useNavSpace();
  const [profile, setProfile] = useState<AIProfile>(DEFAULT_AI_PROFILES.volcengine);
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetUrl, setNewPresetUrl] = useState('');

  useEffect(() => {
    setProfile(aiConfig.getProfile());
    setPresets(storage.getPresetCats());
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
    storage.savePresetCats(presets);
    Taro.showToast({ title: '已保存', icon: 'success' });
  };

  const handleReset = () => {
    Taro.showModal({
      title: '恢复默认',
      content: '将重置所有 AI 配置为默认值，确定吗？',
      confirmText: '确定',
      confirmColor: '#E89F71',
      success: (res) => {
        if (res.confirm) {
          aiConfig.reset();
          setProfile(aiConfig.getProfile());
          Taro.showToast({ title: '已恢复默认', icon: 'success' });
        }
      }
    });
  };

  const handleAddPreset = () => {
    if (!newPresetName.trim() || !newPresetUrl.trim()) {
      Taro.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    const newPreset: PresetCat = {
      id: 'preset_' + Date.now(),
      name: newPresetName.trim(),
      imageUrl: newPresetUrl.trim(),
    };
    setPresets([...presets, newPreset]);
    setNewPresetName('');
    setNewPresetUrl('');
  };

  const handleRemovePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
  };

  return (
    <View className="admin-settings-page" style={navSpace as React.CSSProperties}>
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 24, height: 24 }} />
        </View>
        <View className="header-title-wrap">
          <Text className="header-title">后台配置</Text>
          <Text className="header-subtitle">Admin Settings</Text>
        </View>
      </View>

      {/* AI 模型配置 */}
      <View className="section">
        <Text className="section-title">AI 模型配置</Text>

        <View className="provider-tabs">
          {(['dashscope', 'volcengine'] as AIProvider[]).map(provider => (
            <View
              key={provider}
              className={`provider-tab ${profile.provider === provider ? 'active' : ''}`}
              onClick={() => handleProviderChange(provider)}
            >
              <Text className="provider-text">{PROVIDER_LABELS[provider]}</Text>
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
                color="#E89F71"
                checked={profile.promptExtend}
                onChange={(e) => updateField('promptExtend', e.detail.value)}
              />
            </View>
            <View className="switch-item">
              <Text className="switch-label">Mock 模式</Text>
              <Switch
                color="#E89F71"
                checked={profile.mockMode}
                onChange={(e) => updateField('mockMode', e.detail.value)}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 预设猫咪管理 */}
      <View className="section">
        <Text className="section-title">预设猫咪</Text>

        <View className="preset-list">
          {presets.map((preset) => (
            <View key={preset.id} className="preset-item">
              <Image className="preset-avatar" src={preset.imageUrl} mode="aspectFill" />
              <Text className="preset-name">{preset.name}</Text>
              <View className="preset-remove" onClick={() => handleRemovePreset(preset.id)}>
                <Image className="icon-img" src={X_GRAY} mode="aspectFit" style={{ width: 16, height: 16 }} />
              </View>
            </View>
          ))}
          {presets.length === 0 && (
            <Text className="preset-empty">暂无预设猫咪</Text>
          )}
        </View>

        <View className="preset-add">
          <Input
            className="input preset-input"
            placeholder="品种名称"
            value={newPresetName}
            onInput={(e) => setNewPresetName(e.detail.value)}
          />
          <Input
            className="input preset-input"
            placeholder="图片 URL"
            value={newPresetUrl}
            onInput={(e) => setNewPresetUrl(e.detail.value)}
          />
          <View className="preset-add-btn" onClick={handleAddPreset}>
            <Image className="icon-img" src={PLUS_WHITE} mode="aspectFit" style={{ width: 16, height: 16 }} />
            <Text className="preset-add-text">添加</Text>
          </View>
        </View>
      </View>

      {/* 底部操作栏 */}
      <View className="bottom-actions">
        <View className="reset-btn" onClick={handleReset}>
          <Text className="reset-btn-text">恢复默认</Text>
        </View>
        <View className="save-btn" onClick={handleSave}>
          <Text className="save-btn-text">保存配置</Text>
        </View>
      </View>
    </View>
  );
}