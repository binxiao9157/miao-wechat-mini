import React from 'react';
import { View, Text } from '@tarojs/components';
import { useEffect } from 'react';
import { reLaunch } from '@tarojs/taro';
import { storage } from '../../services/storage';
import { routeAfterCatSync } from '../../services/catLifecycle';

export default function Welcome() {
  useEffect(() => {
    const bootstrap = async () => {
      // 检查是否已登录
      const user = storage.getUserInfo();
      if (user) {
        try {
          await storage.syncFromServer(user.username);
        } catch (error) {
          console.warn('[Welcome] sync failed:', error);
        }
      }

      if (user) {
        routeAfterCatSync();
      } else {
        reLaunch({ url: '/pages/login/index' });
      }
    };

    setTimeout(() => {
      bootstrap();
    }, 500);
  }, []);

  return (
    <View style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#FFF9F5'
    }}>
      <Text style={{ fontSize: '48px', marginBottom: '20px' }}>🐱</Text>
      <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4037' }}>Miao</Text>
      <Text style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>以喵星之名，开启治愈之旅</Text>
    </View>
  );
}
