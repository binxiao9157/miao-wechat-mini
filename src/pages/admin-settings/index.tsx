import React, { useEffect, useState } from 'react';
import { View, Text, Input, Switch, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { safeBack } from '../../utils/navigateAdapter';
import { aiConfig, AIProfile, AIProvider, DEFAULT_AI_PROFILES } from '../../services/aiConfig';
import { storage, PresetCat } from '../../services/storage';
import PageHeader from '../../components/layout/PageHeader';

const SETTINGS_DARK = require('../../assets/profile-icons/settings-dark.png');
const PLUS_WHITE = require('../../assets/profile-icons/plus-white.png');
const X_GRAY = require('../../assets/profile-icons/x-gray.png');
const UPLOAD_PRIMARY = require('../../assets/profile-icons/upload-primary.png');

import './index.less';

export default function AdminSettings() {
  const [profile, setProfile] = useState<AIProfile>(DEFAULT_AI_PROFILES.volcengine);
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetImage, setNewPresetImage] = useState('');
  const [isUploadingPreset, setIsUploadingPreset] = useState(false);
  const [isPointsCheat, setIsPointsCheat] = useState(() => storage.getIsPointsCheat());
  const [isFastForward, setIsFastForward] = useState(() => storage.getIsFastForward());

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
    Taro.showToast({ title: '配置已保存', icon: 'success' });
  };

  const handleReset = () => {
    aiConfig.reset();
    const nextProfile = aiConfig.getProfile();
    setProfile(nextProfile);
    Taro.showToast({ title: '已恢复默认', icon: 'success' });
  };

  const choosePresetImage = async (): Promise<string> => {
    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      });
      return res.tempFiles?.[0]?.tempFilePath || '';
    } catch (error: any) {
      if ((error?.errMsg || '').includes('cancel')) throw error;
      const res = await Taro.chooseImage({
        count: 1,
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      });
      return res.tempFilePaths?.[0] || '';
    }
  };

  const persistPresetImage = async (tempFilePath: string): Promise<string> => {
    if (!tempFilePath) throw new Error('未选择图片');
    if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) return tempFilePath;
    if (/^https?:\/\//.test(tempFilePath)) return tempFilePath;

    const saved = await Taro.saveFile({ tempFilePath }) as Taro.saveFile.SuccessCallbackResult;
    return saved.savedFilePath || tempFilePath;
  };

  const handleChoosePresetImage = async () => {
    try {
      setIsUploadingPreset(true);
      const tempFilePath = await choosePresetImage();
      const imagePath = await persistPresetImage(tempFilePath);
      setNewPresetImage(imagePath);
    } catch (error: any) {
      if (!(error?.errMsg || '').includes('cancel')) {
        Taro.showToast({ title: '图片上传失败', icon: 'none' });
      }
    } finally {
      setIsUploadingPreset(false);
    }
  };

  const handleAddPreset = () => {
    if (!newPresetName.trim()) {
      Taro.showToast({ title: '请填写品种名称', icon: 'none' });
      return;
    }
    if (!newPresetImage) {
      Taro.showToast({ title: '请上传猫咪图片', icon: 'none' });
      return;
    }
    const newPreset: PresetCat = {
      id: 'preset_' + Date.now(),
      name: newPresetName.trim(),
      imageUrl: newPresetImage,
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    setNewPresetName('');
    setNewPresetImage('');
  };

  const handleRemovePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id));
  };

  return (
    <View className="admin-settings-page">
      <PageHeader title="后台配置" subtitle="AI Provider Profile" onBack={() => safeBack()} />

      <ScrollView className="admin-settings-scroll" scrollY showScrollbar={false}>
      <View className="section">
        <View className="section-head">
          <View className="section-icon">
            <Image className="icon-img" src={SETTINGS_DARK} mode="aspectFit" style={{ width: 22, height: 22 }} />
          </View>
          <Text className="section-title">AI 模型配置</Text>
        </View>

        <View className="provider-tabs">
          {(['dashscope', 'volcengine'] as AIProvider[]).map(provider => (
            <View
              key={provider}
              className={`provider-tab ${profile.provider === provider ? 'active' : ''}`}
              onClick={() => handleProviderChange(provider)}
            >
              <Text className="provider-text">{provider === 'dashscope' ? '阿里百炼' : '火山引擎'}</Text>
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

      {/* 预设猫咪管理 */}
      <View className="section">
        <View className="section-head">
          <View className="section-icon">
            <Image className="icon-img" src={SETTINGS_DARK} mode="aspectFit" style={{ width: 22, height: 22 }} />
          </View>
          <View>
            <Text className="section-title">预设猫咪</Text>
            <Text className="section-desc">管理"我想养猫"页面的品种预设</Text>
          </View>
        </View>

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

        <View className="preset-add-card">
          <View className="preset-upload" onClick={handleChoosePresetImage}>
            {newPresetImage ? (
              <Image className="preset-upload-preview" src={newPresetImage} mode="aspectFill" />
            ) : (
              <View className="preset-upload-empty">
                <Image className="icon-img" src={UPLOAD_PRIMARY} mode="aspectFit" style={{ width: 26, height: 26 }} />
              </View>
            )}
            {isUploadingPreset && (
              <View className="preset-upload-mask">
                <Text className="preset-upload-mask-text">处理中</Text>
              </View>
            )}
          </View>
          <View className="preset-add-fields">
            <Input
              className="input preset-name-input"
              placeholder="品种名称"
              placeholderStyle="color: #8E8E8E"
              value={newPresetName}
              onInput={(e) => setNewPresetName(e.detail.value)}
            />
            <View className="preset-add-btn" onClick={handleAddPreset}>
              <Image className="icon-img" src={PLUS_WHITE} mode="aspectFit" style={{ width: 16, height: 16 }} />
              <Text className="preset-add-text">添加预设</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 调试工具 */}
      <View className="section">
        <View className="section-head">
          <View className="section-icon">
            <Image className="icon-img" src={SETTINGS_DARK} mode="aspectFit" style={{ width: 22, height: 22 }} />
          </View>
          <View>
            <Text className="section-title">调试工具</Text>
            <Text className="section-desc">5连击隐藏入口进入</Text>
          </View>
        </View>

        <View className="switch-row">
          <View className="switch-item">
            <Text className="switch-label">积分作弊</Text>
            <Switch
              color="#ff8c5a"
              checked={isPointsCheat}
              onChange={(e) => {
                const val = e.detail.value;
                setIsPointsCheat(val);
                storage.setIsPointsCheat(val);
              }}
            />
          </View>
          <View className="switch-item">
            <Text className="switch-label">时光快进</Text>
            <Switch
              color="#ff8c5a"
              checked={isFastForward}
              onChange={(e) => {
                const val = e.detail.value;
                setIsFastForward(val);
                storage.setIsFastForward(val);
              }}
            />
          </View>
        </View>
      </View>

      <View className="tips">
        <Text className="tips-title">说明</Text>
        <Text className="tips-text">
          API Key 仍只保存在服务端环境变量中。这里仅切换 provider、模型名和生成参数，小程序不会保存密钥。
        </Text>
      </View>

      </ScrollView>

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
