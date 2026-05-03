import React, { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { navigateBack, navigateTo } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import { storage, TimeLetter, PointsInfo } from '../../services/storage';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const SETTINGS_DARK = require('../../assets/profile-icons/settings-dark.png');
const SPARKLES_PRIMARY = require('../../assets/profile-icons/sparkles-primary.png');
const COINS_PRIMARY = require('../../assets/profile-icons/coins-primary.png');
const HEART_GRAY = require('../../assets/profile-icons/heart-gray.png');
const BELL_PRIMARY = require('../../assets/profile-icons/bell-primary.png');
const BELL_GRAY = require('../../assets/profile-icons/bell-gray.png');

import './index.less';

interface Notification {
  id: string;
  type: 'letter' | 'points' | 'greeting';
  title: string;
  content: string;
  time: number;
  read: boolean;
  catAvatar?: string;
}

function computeNotifications(): Notification[] {
  const notifications: Notification[] = [];
  const readIds = storage.getReadNotificationIds();
  const isFastForward = storage.getIsFastForward();

  // 时光信件解锁通知
  const letters = storage.getTimeLetters();
  letters.forEach((letter: TimeLetter) => {
    const now = isFastForward ? Date.now() * 10 : Date.now();
    if (letter.unlockAt <= now) {
      notifications.push({
        id: `letter_${letter.id}`,
        type: 'letter',
        title: '时光信件已解锁',
        content: `"${letter.title || '一封来自过去的信'}" 可以查看了`,
        time: letter.unlockAt,
        read: readIds.includes(`letter_${letter.id}`),
        catAvatar: letter.catAvatar,
      });
    }
  });

  // 积分变动通知
  const points: PointsInfo = storage.getPoints();
  if (points.history && points.history.length > 0) {
    const recentPoints = points.history.slice(0, 5);
    recentPoints.forEach((tx) => {
      notifications.push({
        id: `points_${tx.id}`,
        type: 'points',
        title: tx.type === 'earn' ? '积分收入' : '积分支出',
        content: `${tx.reason}：${tx.type === 'earn' ? '+' : '-'}${tx.amount} 积分`,
        time: tx.timestamp,
        read: readIds.includes(`points_${tx.id}`),
      });
    });
  }

  // 系统问候
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const today = new Date().toISOString().slice(0, 10);
  notifications.push({
    id: `greeting_${today}`,
    type: 'greeting',
    title: `${greeting}，喵~`,
    content: '今天也要和猫咪一起度过美好的一天哦！',
    time: new Date().setHours(8, 0, 0, 0),
    read: readIds.includes(`greeting_${today}`),
  });

  // 自定义通知（好友分享等）
  const customNotifications = storage.getCustomNotifications();
  customNotifications.forEach((n: any) => {
    notifications.push({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      time: n.time,
      read: readIds.includes(n.id),
      catAvatar: n.catAvatar,
    });
  });

  // 按时间倒序排列
  notifications.sort((a, b) => b.time - a.time);
  return notifications;
}

export default function NotificationList() {
  const navSpace = useNavSpace();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setNotifications(computeNotifications());
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    // 标记已读
    storage.markNotificationAsRead(notification.id);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));

    // 跳转到对应页面
    if (notification.type === 'letter') {
      navigateTo({ url: '/pages/time-letters/index' });
    } else if (notification.type === 'points') {
      navigateTo({ url: '/pages/points/index' });
    } else if (notification.type === 'friend_share') {
      Taro.switchTab({ url: '/pages/diary/index' });
    }
  };

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) storage.markNotificationAsRead(n.id);
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'letter': return <Image className="icon-img" src={SPARKLES_PRIMARY} mode="aspectFit" style={{ width: 22, height: 22 }} />;
      case 'points': return <Image className="icon-img" src={COINS_PRIMARY} mode="aspectFit" style={{ width: 22, height: 22 }} />;
      case 'greeting': return <Image className="icon-img" src={HEART_GRAY} mode="aspectFit" style={{ width: 22, height: 22 }} />;
      case 'friend_share': return <Image className="icon-img" src={BELL_PRIMARY} mode="aspectFit" style={{ width: 22, height: 22 }} />;
      default: return <Image className="icon-img" src={BELL_PRIMARY} mode="aspectFit" style={{ width: 22, height: 22 }} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View className="notification-list-page" style={navSpace as React.CSSProperties}>
      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 24, height: 24 }} />
        </View>
        <Text className="header-title">消息中心</Text>
        <View className="settings-btn" onClick={() => navigateTo({ url: '/pages/notifications/index' })}>
          <Image className="icon-img" src={SETTINGS_DARK} mode="aspectFit" style={{ width: 22, height: 22 }} />
        </View>
      </View>

      {/* 操作栏 */}
      {unreadCount > 0 && (
        <View className="action-bar">
          <Text className="unread-count">{unreadCount} 条未读</Text>
          <View className="mark-all-btn" onClick={handleMarkAllRead}>
            <Text className="mark-all-text">全部已读</Text>
          </View>
        </View>
      )}

      {/* 通知列表 */}
      {notifications.length > 0 ? (
        <View className="notification-list">
          {notifications.map((notification) => (
            <View
              key={notification.id}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <View className={`notification-icon ${notification.type}`}>
                {getIcon(notification.type)}
              </View>
              <View className="notification-content">
                <View className="notification-header">
                  <Text className="notification-title">{notification.title}</Text>
                  {!notification.read && <View className="unread-dot" />}
                </View>
                <Text className="notification-desc">{notification.content}</Text>
                <Text className="notification-time">{formatTime(notification.time)}</Text>
              </View>
              <Text className="notification-arrow">›</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="empty-state">
          <View className="empty-icon-box">
            <Image className="icon-img" src={BELL_GRAY} mode="aspectFit" style={{ width: 22, height: 22 }} />
          </View>
          <Text className="empty-title">暂无消息</Text>
          <Text className="empty-desc">当有新消息时，会在这里显示</Text>
        </View>
      )}
    </View>
  );
}