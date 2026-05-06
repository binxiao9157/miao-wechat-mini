import React, { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import './index.less';

// Lucide-style icon images for tab bar
const TAB_ICONS = {
  diary: {
    active: require('../assets/profile-icons/bookopen-active.png'),
    inactive: require('../assets/profile-icons/bookopen-inactive.png'),
  },
  timeLetters: {
    active: require('../assets/profile-icons/mail-active.png'),
    inactive: require('../assets/profile-icons/mail-inactive.png'),
  },
  home: {
    active: require('../assets/profile-icons/home-white.png'),
    inactive: require('../assets/profile-icons/home-white.png'),
  },
  points: {
    active: require('../assets/profile-icons/star-active.png'),
    inactive: require('../assets/profile-icons/star-inactive.png'),
  },
  profile: {
    active: require('../assets/profile-icons/user-active.png'),
    inactive: require('../assets/profile-icons/user-inactive.png'),
  },
};

const tabs = [
  { pagePath: '/pages/diary/index', text: '日志', iconKey: 'diary' as const },
  { pagePath: '/pages/time-letters/index', text: '时光', iconKey: 'timeLetters' as const },
  { pagePath: '/pages/home/index', text: '首页', iconKey: 'home' as const, center: true },
  { pagePath: '/pages/points/index', text: '积分', iconKey: 'points' as const },
  { pagePath: '/pages/profile/index', text: 'MIAO', iconKey: 'profile' as const },
];

function getCurrentPath(): string {
  const pages = Taro.getCurrentPages();
  return pages[pages.length - 1]?.route || '';
}

export default function CustomTabBar() {
  const [current, setCurrent] = useState(getCurrentPath);
  const [hidden, setHidden] = useState(false);

  // 每次页面显示时刷新当前路由，确保 tab 选中状态同步
  useDidShow(() => {
    setCurrent(getCurrentPath());
  });

  useEffect(() => {
    const onShow = () => setHidden(true);
    const onHide = () => setHidden(false);
    Taro.eventCenter.on('tabbar:hide', onShow);
    Taro.eventCenter.on('tabbar:show', onHide);
    return () => {
      Taro.eventCenter.off('tabbar:hide', onShow);
      Taro.eventCenter.off('tabbar:show', onHide);
    };
  }, []);

  if (hidden) return null;

  return (
    <View className={`miao-tabbar ${current === 'pages/home/index' ? 'on-home' : ''}`}>
      {tabs.map((tab) => {
        const active = current === tab.pagePath.replace(/^\//, '');
        const iconSrc = active ? TAB_ICONS[tab.iconKey].active : TAB_ICONS[tab.iconKey].inactive;
        return (
          <View
            key={tab.pagePath}
            className={`miao-tab ${active ? 'active' : ''} ${tab.center ? 'center' : ''}`}
            onClick={() => {
              setCurrent(tab.pagePath.replace(/^\//, ''));
              Taro.switchTab({ url: tab.pagePath });
            }}
          >
            <View className="miao-tab-icon">
              <Image
                className="tab-icon-img"
                src={iconSrc}
                mode="aspectFit"
                style={{ width: tab.center ? 22 : 20, height: tab.center ? 22 : 20 }}
              />
            </View>
            <Text className="miao-tab-text">{tab.text}</Text>
            {active && <View className="miao-tab-dot" />}
          </View>
        );
      })}
    </View>
  );
}