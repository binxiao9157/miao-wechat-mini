import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { storage } from '../../services/storage';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const HEART_GRAY = require('../../assets/profile-icons/heart-gray.png');
const MESSAGE_GRAY = require('../../assets/profile-icons/message-gray.png');
const USERPLUS_GRAY = require('../../assets/profile-icons/userplus-gray.png');
const BELL_PRIMARY = require('../../assets/profile-icons/bell-primary.png');
const BELL_GRAY = require('../../assets/profile-icons/bell-gray.png');

import './index.less';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'friend';
  fromUser: { nickname: string; avatar: string };
  content: string;
  createdAt: number;
  isRead: boolean;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'like',
        fromUser: { nickname: '林深时见鹿', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
        content: '赞了你的日记',
        createdAt: Date.now() - 3600000,
        isRead: false
      },
      {
        id: '2',
        type: 'friend',
        fromUser: { nickname: '夏天的风', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Summer' },
        content: '通过了您的好友申请',
        createdAt: Date.now() - 86400000,
        isRead: true
      }
    ];
    setNotifications(mockNotifications);
  };

  const handleMarkAllRead = () => {
    storage.markNotificationsAsRead();
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Image className="icon-img" src={HEART_GRAY} mode="aspectFit" style={{ width: 16, height: 16 }} />;
      case 'comment': return <Image className="icon-img" src={MESSAGE_GRAY} mode="aspectFit" style={{ width: 16, height: 16 }} />;
      case 'friend': return <Image className="icon-img" src={USERPLUS_GRAY} mode="aspectFit" style={{ width: 16, height: 16 }} />;
      default: return <Image className="icon-img" src={BELL_PRIMARY} mode="aspectFit" style={{ width: 16, height: 16 }} />;
    }
  };

  return (
    <View className="notifications-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
        </View>
        <Text className="title">消息通知</Text>
        <View className="mark-read" onClick={handleMarkAllRead}>
          <Text>全部已读</Text>
        </View>
      </View>

      <View className="notification-list">
        {notifications.length === 0 ? (
          <View className="empty">
            <Image className="icon-img" src={BELL_GRAY} mode="aspectFit" style={{ width: 48, height: 48 }} />
            <Text className="empty-text">暂无通知</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View key={notification.id} className={`notification-item ${!notification.isRead ? 'unread' : ''}`}>
              <Image className="avatar" src={notification.fromUser.avatar} mode="aspectFill" />
              <View className="content">
                <Text className="nickname">{notification.fromUser.nickname}</Text>
                <Text className="text">{notification.content}</Text>
                <Text className="time">{formatTime(notification.createdAt)}</Text>
              </View>
              <View className="icon">{getIcon(notification.type)}</View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}