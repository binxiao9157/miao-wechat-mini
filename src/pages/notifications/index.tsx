import React, { useState, useEffect } from 'react';
import { View, Text, Image, Switch } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { storage, AppSettings } from '../../services/storage';
import Taro from '@tarojs/taro';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const BELL_PRIMARY = require('../../assets/profile-icons/bell-primary.png');

import './index.less';

export default function Notifications() {
  const [settings, setSettings] = useState<AppSettings>({
    pushNotifications: true,
    greetingsEnabled: true,
    timeLetterReminder: true,
  });

  useEffect(() => {
    const saved = storage.getSettings();
    setSettings(saved);
  }, []);

  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    storage.saveSettings(updated);
    Taro.showToast({ title: value ? '已开启' : '已关闭', icon: 'none', duration: 1000 });
  };

  const settingItems = [
    {
      key: 'pushNotifications' as const,
      title: '推送通知',
      desc: '接收好友互动、系统消息等推送提醒',
      icon: BELL_PRIMARY,
    },
    {
      key: 'greetingsEnabled' as const,
      title: '每日问候',
      desc: '每天早上和晚上收到猫咪的温暖问候',
      icon: BELL_PRIMARY,
    },
    {
      key: 'timeLetterReminder' as const,
      title: '时光信件提醒',
      desc: '有新的时光信件到达时提醒你',
      icon: BELL_PRIMARY,
    },
  ];

  return (
    <View className="notifications-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
        </View>
        <Text className="title">通知设置</Text>
        <View className="placeholder" />
      </View>

      <View className="settings-hero">
        <View className="hero-icon-wrap">
          <Text className="hero-icon-text">🔔</Text>
        </View>
        <Text className="hero-title">通知与提醒</Text>
        <Text className="hero-subtitle">NOTIFICATION SETTINGS</Text>
      </View>

      <View className="settings-card">
        {settingItems.map((item, idx) => (
          <View key={item.key} className={`setting-item ${idx < settingItems.length - 1 ? 'setting-item-border' : ''}`}>
            <View className="setting-left">
              <View className="setting-icon-box">
                <Image className="icon-img" src={item.icon} mode="aspectFit" style={{ width: 22, height: 22 }} />
              </View>
              <View className="setting-info">
                <Text className="setting-title">{item.title}</Text>
                <Text className="setting-desc">{item.desc}</Text>
              </View>
            </View>
            <Switch
              checked={settings[item.key]}
              color="#E89F71"
              onChange={(e) => updateSetting(item.key, e.detail.value)}
            />
          </View>
        ))}
      </View>

      <View className="settings-footer">
        <Text className="footer-text">
          关闭推送通知后，你仍可在应用内查看消息。每日问候和时光信件提醒仅在应用打开时生效。
        </Text>
      </View>
    </View>
  );
}