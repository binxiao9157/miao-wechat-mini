import React, { useState, useEffect } from 'react';
import { View, Text, Input, Image } from '@tarojs/components';
import { navigateTo, navigateBack } from '@tarojs/taro';
const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const SPARKLES_WHITE = require('../../assets/profile-icons/sparkles-white.png');
import { storage, PresetCat } from '../../services/storage';
import './index.less';

export default function CreateCompanion() {
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [catName, setCatName] = useState('');

  useEffect(() => {
    setPresets(storage.getPresetCats());
  }, []);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleGenerate = () => {
    if (!catName.trim() || !selectedPresetId) {
      triggerToast('请填写完整信息后再生成哦！');
      return;
    }

    const selectedPreset = presets.find(p => p.id === selectedPresetId);
    if (!selectedPreset) return;

    setIsGenerating(true);

    // 保存猫咪信息并跳转到生成进度页
    const newCat = {
      id: 'cat_' + Date.now(),
      name: catName.trim(),
      breed: selectedPreset.name,
      color: '预设',
      avatar: selectedPreset.imageUrl,
      source: 'created' as const,
      createdAt: Date.now()
    };
    storage.saveCatInfo(newCat);

    // 跳转到生成进度页
    navigateTo({ url: '/pages/generation-progress/index' });
  };

  const isFormComplete = catName.trim().length > 0 && selectedPresetId !== null;

  return (
    <View className="create-companion-page">
      {/* Toast */}
      {showToast && (
        <View className="toast">
          <Text className="toast-text">{showToast}</Text>
        </View>
      )}

      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 24, height: 24 }} />
        </View>
        <Text className="header-title">手捏小猫</Text>
      </View>

      {/* Scrollable Content */}
      <View className="scroll-content">
        {/* Name Input */}
        <View className="form-section">
          <Text className="form-label">猫咪昵称</Text>
          <Input
            className="name-input"
            type="text"
            placeholder="给它起个好听的名字"
            value={catName}
            onInput={(e) => setCatName(e.detail.value)}
          />
        </View>

        {/* Breed Selection - Grid */}
        <View className="form-section">
          <Text className="form-label">选择品种</Text>
          <View className="breed-grid">
            {presets.map((preset) => (
              <View
                key={preset.id}
                className={`breed-card ${selectedPresetId === preset.id ? 'selected' : ''}`}
                onClick={() => setSelectedPresetId(preset.id)}
              >
                {selectedPresetId === preset.id && (
                  <View className="check-badge">
                    <Text className="check-mark">✓</Text>
                  </View>
                )}
                <View className="breed-image-wrapper">
                  <Image
                    className="breed-image"
                    src={preset.imageUrl}
                    mode="aspectFill"
                  />
                </View>
                <Text className={`breed-name ${selectedPresetId === preset.id ? 'selected' : ''}`}>
                  {preset.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Fixed Bottom Button */}
      <View className="bottom-bar">
        <View
          className={`generate-btn ${isFormComplete && !isGenerating ? 'active' : 'disabled'}`}
          onClick={isFormComplete && !isGenerating ? handleGenerate : undefined}
        >
          <Image className="icon-img btn-icon" src={SPARKLES_WHITE} mode="aspectFit" style={{ width: 22, height: 22 }} />
          <Text className="btn-label">{isGenerating ? '生成中...' : '确认生成'}</Text>
        </View>
      </View>
    </View>
  );
}