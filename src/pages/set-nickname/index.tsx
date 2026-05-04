import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthContext } from '../../context/AuthContext';
import { request } from '../../utils/httpAdapter';
import { routeAfterCatSync } from '../../services/catLifecycle';
import './index.less';

// 覆盖常见 emoji 范围，包括 Emoji 12.0-15.0 新增
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F780}-\u{1F7FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B50}-\u{2B55}\u{2300}-\u{23FF}\u{00A9}-\u{00AE}\u{1F000}-\u{1F02F}]/gu;

function filterEmoji(text: string): string {
  return text.replace(EMOJI_REGEX, '');
}

export default function SetNickname() {
  const { isAuthenticated, user, updateProfile } = useAuthContext();
  const defaultNickname = user?.nickname || '';
  const [nickname, setNickname] = useState(defaultNickname);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      Taro.redirectTo({ url: '/pages/login/index' });
    }
  }, [isAuthenticated]);

  const handleInput = (e: any) => {
    const filtered = filterEmoji(e.detail.value);
    if (filtered.length <= 12) {
      setNickname(filtered);
    }
  };

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      Taro.showToast({ title: '昵称至少2个字符', icon: 'none' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await request({
        url: '/api/v1/me',
        method: 'PATCH',
         data: { nickname: trimmed },
      });
      if (res.data?.user) {
        updateProfile({ nickname: res.data.user.nickname });
      }
      routeAfterCatSync();
    } catch (e: any) {
      Taro.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    routeAfterCatSync();
  };

  return (
    <View className="set-nickname-page">
      <View className="bg-decoration bg-decoration-1"></View>
      <View className="bg-decoration bg-decoration-2"></View>

      <View className="content">
        <View className="title-section">
          <Text className="title">给自己取个名字吧</Text>
          <Text className="subtitle">2-12个字符，不支持emoji</Text>
        </View>

        <View className="input-section">
          <Input
            className="nickname-input"
            type="text"
            placeholder="输入昵称"
            value={nickname}
            onInput={handleInput}
            maxlength={12}
            focus
          />
          <Text className="char-count">{nickname.length}/12</Text>
        </View>

        <View className="buttons">
          <Button className="save-btn" onClick={handleSave} disabled={isLoading || nickname.trim().length < 2}>
            {isLoading ? '保存中...' : '保存昵称'}
          </Button>
          <Button className="skip-btn" onClick={handleSkip}>
            跳过，使用默认昵称
          </Button>
        </View>
      </View>
    </View>
  );
}