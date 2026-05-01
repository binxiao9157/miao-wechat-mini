import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { navigateTo, reLaunch } from '@tarojs/taro';
import { User, Settings, Heart, MessageCircle, Users, LogOut, ChevronRight } from '../../components/common/Icons';
import { storage, UserInfo, CatInfo } from '../../services/storage';
import './index.less';

export default function Profile() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [catList, setCatList] = useState<CatInfo[]>([]);
  const [points, setPoints] = useState(0);
  const adminTapCountRef = useRef(0);
  const adminTapTimerRef = useRef<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    const userInfo = storage.getUserInfo();
    setUser(userInfo);

    const cats = storage.getCatList();
    setCatList(cats);

    const pointsInfo = storage.getPoints();
    setPoints(pointsInfo.total);
  };

  const handleLogout = () => {
    storage.clearCurrentUser();
    reLaunch({ url: '/pages/login/index' });
  };

  const handleAdminTap = () => {
    adminTapCountRef.current += 1;
    if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current);

    if (adminTapCountRef.current >= 5) {
      adminTapCountRef.current = 0;
      Taro.vibrateShort({ type: 'light' }).catch(() => {});
      navigateTo({ url: '/pages/admin-settings/index' });
      return;
    }

    adminTapTimerRef.current = setTimeout(() => {
      adminTapCountRef.current = 0;
    }, 2000);
  };

  const menuItems = [
    { icon: <User size={20} />, label: '编辑资料', url: '/pages/edit-profile/index' },
    { icon: <Heart size={20} />, label: '我的收藏', url: '' },
    { icon: <MessageCircle size={20} />, label: '我的日记', url: '/pages/diary/index' },
    { icon: <Users size={20} />, label: '好友列表', url: '' },
    { icon: <Settings size={20} />, label: '设置', url: '' },
  ];

  return (
    <View className="profile-page">
      <View className="profile-header" onClick={handleAdminTap}>
        <Image
          className="avatar"
          src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
          mode="aspectFill"
        />
        <Text className="nickname">{user?.nickname || '未登录'}</Text>
        <Text className="username">@{user?.username || 'guest'}</Text>

        <View className="stats">
          <View className="stat-item">
            <Text className="stat-value">{catList.length}</Text>
            <Text className="stat-label">猫咪</Text>
          </View>
          <View className="stat-item">
            <Text className="stat-value">{points}</Text>
            <Text className="stat-label">积分</Text>
          </View>
          <View className="stat-item">
            <Text className="stat-value">{storage.getFriends().length}</Text>
            <Text className="stat-label">好友</Text>
          </View>
        </View>
      </View>

      <View className="menu-section">
        {menuItems.map((item, index) => (
          <View
            key={index}
            className="menu-item"
            onClick={() => item.url && navigateTo({ url: item.url })}
          >
            <View className="menu-icon">{item.icon}</View>
            <Text className="menu-label">{item.label}</Text>
            <ChevronRight size={20} className="menu-arrow" />
          </View>
        ))}
      </View>

      <Button className="logout-btn" onClick={handleLogout}>
        <LogOut size={18} />
        退出登录
      </Button>
    </View>
  );
}
