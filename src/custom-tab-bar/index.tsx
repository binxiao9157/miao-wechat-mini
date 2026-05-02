import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { BookOpen, Mail, HomeIcon, StarOutline, UserOutline } from '../components/common/Icons';
import './index.less';

const tabs = [
  { pagePath: '/pages/diary/index', text: '日志', icon: BookOpen },
  { pagePath: '/pages/time-letters/index', text: '时光', icon: Mail },
  { pagePath: '/pages/home/index', text: '首页', icon: HomeIcon, center: true },
  { pagePath: '/pages/points/index', text: '积分', icon: StarOutline },
  { pagePath: '/pages/profile/index', text: 'MIAO', icon: UserOutline },
];

export default function CustomTabBar() {
  const pages = Taro.getCurrentPages();
  const current = pages[pages.length - 1]?.route || '';

  return (
    <View className={`miao-tabbar ${current === 'pages/home/index' ? 'on-home' : ''}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = current === tab.pagePath.replace(/^\//, '');
        return (
          <View
            key={tab.pagePath}
            className={`miao-tab ${active ? 'active' : ''} ${tab.center ? 'center' : ''}`}
            onClick={() => Taro.switchTab({ url: tab.pagePath })}
          >
            <View className="miao-tab-icon">
              <Icon size={tab.center ? 34 : 30} />
            </View>
            <Text className="miao-tab-text">{tab.text}</Text>
            {active && <View className="miao-tab-dot" />}
          </View>
        );
      })}
    </View>
  );
}
