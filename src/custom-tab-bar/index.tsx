import React, { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
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

export default function CustomTabBar() {
  const [activeRoute, setActiveRoute] = useState('');
  const [hidden, setHidden] = useState(false);

  // 初始化：从页面栈读取当前路由
  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const current = pages[pages.length - 1]?.route || '';
    setActiveRoute(current);
  }, []);

  // 监听页面显示事件，同步路由
  useEffect(() => {
    const onRouteSync = (route: string) => setActiveRoute(route);
    Taro.eventCenter.on('tabbar:route', onRouteSync);
    return () => {
      Taro.eventCenter.off('tabbar:route', onRouteSync);
    };
  }, []);

  // 监听 tabbar 显示/隐藏
  useEffect(() => {
    const onHide = () => setHidden(true);
    const onShow = () => setHidden(false);
    Taro.eventCenter.on('tabbar:hide', onHide);
    Taro.eventCenter.on('tabbar:show', onShow);
    return () => {
      Taro.eventCenter.off('tabbar:hide', onHide);
      Taro.eventCenter.off('tabbar:show', onShow);
    };
  }, []);

  if (hidden) return null;

  return (
    <View className={`miao-tabbar ${activeRoute === 'pages/home/index' ? 'on-home' : ''}`}>
      {tabs.map((tab) => {
        const tabRoute = tab.pagePath.replace(/^\//, '');
        const active = activeRoute === tabRoute;
        const iconSrc = active ? TAB_ICONS[tab.iconKey].active : TAB_ICONS[tab.iconKey].inactive;
        return (
          <View
            key={tab.pagePath}
            className={`miao-tab ${active ? 'active' : ''} ${tab.center ? 'center' : ''}`}
            onClick={() => {
              setActiveRoute(tabRoute);
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