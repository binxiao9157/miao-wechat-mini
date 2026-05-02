import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { switchTab, navigateTo } from '@tarojs/taro';
import { storage, PointsInfo, PointTransaction } from '../../services/storage';
import './index.less';

// Lucide-style PNG icons
const STAR_WHITE = require('../../assets/profile-icons/star-white.png');
const STAR_PRIMARY = require('../../assets/profile-icons/star-primary.png');
const CHECKCIRCLE2_GREEN = require('../../assets/profile-icons/checkcircle2-green.png');
const ARROWRIGHT_WHITE = require('../../assets/profile-icons/arrowright-white.png');
const ARROWRIGHT_PRIMARY = require('../../assets/profile-icons/arrowright-primary.png');
const LOCK_GRAY = require('../../assets/profile-icons/lock-gray.png');
const CHEVRONRIGHT_WHITE = require('../../assets/profile-icons/chevronright-white.png');
const X_GRAY = require('../../assets/profile-icons/x-gray.png');

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
  const [showHistory, setShowHistory] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const debugTapRef = useRef(0);
  const debugTimerRef = useRef<any>(null);

  const REDEEM_THRESHOLD = storage.getUnlockThreshold();
  const ownedCatsCount = storage.getCatList().length;
  const effectivePoints = isDebugMode ? Math.max(pointsInfo.total, REDEEM_THRESHOLD) : pointsInfo.total;

  useEffect(() => {
    loadPoints();

    const handleStorageChange = () => {
      loadPoints();
    };
    Taro.eventCenter.on('points-updated', handleStorageChange);

    const handleShow = () => loadPoints();
    Taro.eventCenter.on('pageshow', handleShow);

    return () => {
      Taro.eventCenter.off('points-updated', handleStorageChange);
      Taro.eventCenter.off('pageshow', handleShow);
      if (debugTimerRef.current) clearTimeout(debugTimerRef.current);
    };
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

  const today = new Date().toISOString().slice(0, 10);
  const loginCompleted = pointsInfo.lastLoginDate === today;
  const interactionCompleted = pointsInfo.lastInteractionDate === today && (pointsInfo.dailyInteractionPoints || 0) > 0;
  const onlineCompleted = (pointsInfo.onlineMinutes || 0) >= 10;

  const tasks = [
    { id: 1, title: '每日首次登录', reward: 10, completed: loginCompleted, description: '每天第一次打开APP即可获得' },
    { id: 2, title: '完成1次猫咪互动', reward: 5, completed: interactionCompleted, description: '在首页点击猫咪进行互动', action: 'trigger' },
    { id: 3, title: '单日登录时长超10分钟', reward: 10, completed: onlineCompleted, description: '累计在线时间达到10分钟' },
  ];

  const handleTaskClick = (task: typeof tasks[0]) => {
    if (!task.completed && task.id === 2) {
      switchTab({ url: '/pages/home/index' });
    }
  };

  const handleRedeem = () => {
    if (effectivePoints >= REDEEM_THRESHOLD) {
      navigateTo({ url: '/pages/welcome/index' });
    }
  };

  const handleDebugTap = () => {
    debugTapRef.current += 1;
    if (debugTimerRef.current) clearTimeout(debugTimerRef.current);

    if (debugTapRef.current >= 5) {
      debugTapRef.current = 0;
      setIsDebugMode(!isDebugMode);
      Taro.showToast({ title: isDebugMode ? '调试模式已关闭' : '调试模式已开启', icon: 'none' });
      return;
    }

    debugTimerRef.current = setTimeout(() => {
      debugTapRef.current = 0;
    }, 2000);
  };

  return (
    <View className="points-page">
      {/* Header */}
      <View className="header">
        <View className="header-title" onClick={handleDebugTap}>
          <Text className="title">积分中心</Text>
          <Text className="subtitle">POINTS CENTER</Text>
        </View>
        <View className="placeholder" />
      </View>

      <View className="points-content">
        {/* 积分卡片 - 对齐PWA: Star图标 + 积分明细用ChevronRight */}
        <View className="points-card" onClick={() => setShowHistory(true)}>
          <View className="points-card-glow" />
          <View className="points-card-glow-bottom" />
          <View className="points-card-content">
            <View className="points-card-header">
              <Text className="points-card-label">积分明细</Text>
              <Image className="icon-img-sm" src={CHEVRONRIGHT_WHITE} mode="aspectFit" style={{ width: 12, height: 12 }} />
            </View>
            <View className="points-icon-wrapper">
              <Image className="icon-img" src={STAR_WHITE} mode="aspectFit" style={{ width: 32, height: 32, opacity: 0.8 }} />
            </View>
            <Text className="points-card-subtitle">当前积分余额</Text>
            <Text className="points-value">{effectivePoints.toLocaleString()}</Text>
          </View>
        </View>

        {/* 今日任务 - 对齐PWA: 标题字体、任务卡片布局、图标 */}
        <View className="tasks-section">
          <View className="tasks-header">
            <Text className="tasks-title">今日任务</Text>
            <Text className="tasks-tag">每日更新</Text>
          </View>

          <View className="tasks-list">
            {tasks.map((task) => (
              <View
                key={task.id}
                className={`task-item ${!task.completed && task.id === 2 ? 'clickable' : ''}`}
                onClick={() => handleTaskClick(task)}
              >
                <View className="task-left">
                  <View className={`task-icon ${task.completed ? 'completed' : ''}`}>
                    {task.completed ? (
                      <Image className="icon-img" src={CHECKCIRCLE2_GREEN} mode="aspectFit" style={{ width: 24, height: 24 }} />
                    ) : (
                      <Image className="icon-img" src={STAR_PRIMARY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                    )}
                  </View>
                  <View className="task-info">
                    <Text className="task-title">{task.title}</Text>
                    <Text className="task-desc">{task.description}</Text>
                    <View className="task-reward">
                      <Text className="task-reward-value">+{task.reward}</Text>
                      <Text className="task-reward-unit">积分</Text>
                    </View>
                  </View>
                </View>
                {task.completed ? (
                  <Text className="task-badge completed">已完成</Text>
                ) : (
                  <View className="task-go-btn">
                    <Image className="icon-img" src={ARROWRIGHT_PRIMARY} mode="aspectFit" style={{ width: 16, height: 16 }} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* 积分兑换 - 对齐PWA: Star/Lock图标、虚线边框 */}
        <View className="redeem-section">
          <Text className="redeem-title">积分兑换</Text>
          <View className={`redeem-card ${effectivePoints >= REDEEM_THRESHOLD ? 'active' : ''}`}>
            <View className={`redeem-icon ${effectivePoints >= REDEEM_THRESHOLD ? 'active' : ''}`}>
              {effectivePoints >= REDEEM_THRESHOLD ? (
                <Image className="icon-img" src={STAR_PRIMARY} mode="aspectFit" style={{ width: 32, height: 32 }} />
              ) : (
                <Image className="icon-img" src={LOCK_GRAY} mode="aspectFit" style={{ width: 32, height: 32 }} />
              )}
            </View>
            <Text className="redeem-subtitle">解锁第 {ownedCatsCount + 1} 位伙伴</Text>
            <Text className="redeem-desc">消耗 {REDEEM_THRESHOLD} 积分，即可生成一只全新的猫咪伙伴</Text>

            {effectivePoints < REDEEM_THRESHOLD && (
              <Text className="redeem-hint">还差 {REDEEM_THRESHOLD - effectivePoints} 积分即可解锁第 {ownedCatsCount + 1} 位伙伴</Text>
            )}

            <Button
              className={`redeem-btn ${effectivePoints >= REDEEM_THRESHOLD ? 'active' : ''}`}
              onClick={handleRedeem}
              disabled={effectivePoints < REDEEM_THRESHOLD}
            >
              {effectivePoints >= REDEEM_THRESHOLD ? '前往兑换' : '积分不足'}
            </Button>
          </View>
        </View>

        {/* 调试入口 */}
        <View className="debug-entry" onClick={handleDebugTap}>
          <Text className="debug-text">调试模式点击入口</Text>
        </View>
      </View>

      {/* 积分明细弹窗 */}
      {showHistory && (
        <View className="modal-mask" onClick={() => setShowHistory(false)}>
          <View className="modal-content" onClick={(e) => e.stopPropagation()}>
            <View className="modal-header">
              <Text className="modal-title">积分明细</Text>
              <View className="modal-close" onClick={() => setShowHistory(false)}>
                <Image className="icon-img" src={X_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
              </View>
            </View>

            <View className="modal-list">
              {pointsInfo.history.length === 0 ? (
                <View className="modal-empty">
                  <View className="modal-empty-icon">
                    <Image className="icon-img" src={STAR_PRIMARY} mode="aspectFit" style={{ width: 32, height: 32, opacity: 0.5 }} />
                  </View>
                  <Text className="modal-empty-text">暂无积分记录</Text>
                </View>
              ) : (
                pointsInfo.history.map((tx) => (
                  <View key={tx.id} className="modal-item">
                    <View className="modal-item-info">
                      <Text className="modal-item-reason">{tx.reason}</Text>
                      <Text className="modal-item-time">{formatTime(tx.timestamp)}</Text>
                    </View>
                    <Text className={`modal-item-amount ${tx.type}`}>
                      {getTransactionIcon(tx.type)}{tx.amount}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}