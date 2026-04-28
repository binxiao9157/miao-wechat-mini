import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { switchTab } from '@tarojs/taro';
import { ArrowLeft, Coins, TrendingUp, Calendar, Gift } from '../../components/common/Icons';
import { storage, PointsInfo, PointTransaction } from '../../services/storage';
import './index.less';

export default function Points() {
  const [pointsInfo, setPointsInfo] = useState<PointsInfo>({
    total: 0,
    lastLoginDate: null,
    dailyInteractionPoints: 0,
    lastInteractionDate: null,
    onlineMinutes: 0,
    lastOnlineUpdate: Date.now(),
    history: []
  });

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = () => {
    const info = storage.getPoints();
    setPointsInfo(info);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getTransactionIcon = (type: string) => {
    return type === 'earn' ? '+' : '-';
  };

  return (
    <View className="points-page">
      <View className="header">
        <View className="back-btn" onClick={() => switchTab({ url: '/pages/home/index' })}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">积分</Text>
        <View className="placeholder" />
      </View>

      <View className="points-card">
        <View className="points-icon">
          <Coins size={32} />
        </View>
        <Text className="points-value">{pointsInfo.total}</Text>
        <Text className="points-label">当前积分</Text>
      </View>

      <View className="stats-row">
        <View className="stat-item">
          <TrendingUp size={20} />
          <Text className="stat-value">{pointsInfo.dailyInteractionPoints}</Text>
          <Text className="stat-label">今日互动</Text>
        </View>
        <View className="stat-item">
          <Calendar size={20} />
          <Text className="stat-value">{pointsInfo.onlineMinutes}</Text>
          <Text className="stat-label">在线时长(�?</Text>
        </View>
        <View className="stat-item">
          <Gift size={20} />
          <Text className="stat-value">{pointsInfo.history.length}</Text>
          <Text className="stat-label">获得记录</Text>
        </View>
      </View>

      <View className="history-section">
        <Text className="section-title">积分记录</Text>
        <View className="history-list">
          {pointsInfo.history.length === 0 ? (
            <View className="empty">
              <Text>暂无记录</Text>
            </View>
          ) : (
            pointsInfo.history.map((tx) => (
              <View key={tx.id} className="history-item">
                <View className="tx-info">
                  <Text className="tx-reason">{tx.reason}</Text>
                  <Text className="tx-time">{formatTime(tx.timestamp)}</Text>
                </View>
                <Text className={`tx-amount ${tx.type}`}>
                  {getTransactionIcon(tx.type)}{tx.amount}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}