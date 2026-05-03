import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, Video } from '@tarojs/components';
import Taro, { navigateTo, useDidShow, useDidHide, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { storage, CatInfo } from '../../services/storage';
import CatAvatar from '../../components/common/CatAvatar';
import { getPrimaryVideoUrl } from '../../services/catLifecycle';
import { on, off, trigger } from '../../utils/eventAdapter';
import FrostedGlassBubble from '../../components/common/FrostedGlassBubble';
import './index.less';

const INTERACTION_TEXTS: Record<string, string> = {
  idle: '蹭蹭你~',
  tail: '摸摸头，真乖~',
  rubbing: '踩奶中，好舒服~',
  blink: '小羽毛，抓不到~',
};

const GREETING_MORNING = '早上好~';
const GREETING_NIGHT = '该休息啦~';

function getGreetingText(): string | null {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 10) return GREETING_MORNING;
  if (hour >= 22 || hour < 1) return GREETING_NIGHT;
  return null;
}

export default function Home() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [currentAction, setCurrentAction] = useState('idle');
  const [videoError, setVideoError] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useShareAppMessage(() => ({
    title: cat ? `来和${cat.name}一起玩吧！` : 'Miao - 你的AI猫咪伙伴',
    path: '/pages/home/index',
  }));

  useShareTimeline(() => ({
    title: cat ? `来和${cat.name}一起玩吧！` : 'Miao - 你的AI猫咪伙伴',
    imageUrl: cat?.avatar || undefined,
  }));

  // 气泡状态
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleExiting, setBubbleExiting] = useState(false);
  const [bubbleId, setBubbleId] = useState(0);
  const [pointsToast, setPointsToast] = useState('');
  const bubbleTimerRef = useRef<any>(null);

  // 手势状态
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<any>(null);
  const longPressTriggeredRef = useRef(false);
  const onlineTimerRef = useRef<any>(null);
  const prevVideoCountRef = useRef(0);

  const showFloatingBubble = useCallback((text: string, duration = 3000) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setBubbleExiting(false);
    setBubbleText(text);
    setBubbleVisible(true);
    setBubbleId(prev => prev + 1);

    bubbleTimerRef.current = setTimeout(() => {
      setBubbleExiting(true);
      setTimeout(() => {
        setBubbleVisible(false);
        setBubbleExiting(false);
      }, 300);
    }, duration);
  }, []);

  const showPointsToast = useCallback((amount: number, label?: string) => {
    setPointsToast(label ? `+${amount} ${label}` : `+${amount}`);
    setTimeout(() => setPointsToast(''), 2000);
  }, []);

  const loadCat = useCallback(() => {
    const activeCat = storage.getActiveCat();
    setCat(activeCat);
  }, []);

  const refreshCatsFromCloud = useCallback(async () => {
    try {
      await storage.syncCatsFromServer();
      loadCat();
    } catch (error) {
      console.warn('[Home] sync cats failed:', error);
    }
  }, [loadCat]);

  useEffect(() => {
    loadCat();
    refreshCatsFromCloud();
    checkDailyLogin();
    startOnlineTimer();
    Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] } as any);

    // 进入页面时显示时间问候
    const greeting = getGreetingText();
    if (greeting) {
      setTimeout(() => showFloatingBubble(greeting, 4000), 1000);
    }

    const handler = (data?: any) => {
      const updatedCat = storage.getActiveCat();
      if (updatedCat) {
        setCat(updatedCat);
      }
    };
    on('cat-updated', handler);
    on('cat-list-synced', handler);

    // 从其他页面切换回来时显示互动提示
    const interactionHandler = () => {
      setTimeout(() => showFloatingBubble('快来和猫咪互动吧~', 3000), 500);
    };
    on('home:show-interaction-hint', interactionHandler);

    return () => {
      off('cat-updated', handler);
      off('cat-list-synced', handler);
      off('home:show-interaction-hint', interactionHandler);
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    };
  }, [loadCat, refreshCatsFromCloud, showFloatingBubble]);

  useDidShow(() => {
    loadCat();
    refreshCatsFromCloud();
    checkDailyLogin();
  });

  useDidHide(() => {
    setVideoError(true);
  });

  // 组件卸载时清理视频资源
  useEffect(() => {
    return () => {
      setVideoError(true);
      setCurrentAction('idle');
    };
  }, []);

  useEffect(() => {
    if (cat?.videoPaths) {
      prevVideoCountRef.current = Object.keys(cat.videoPaths).filter(k => cat.videoPaths?.[k]).length;
    }
  }, [cat?.id]);

  const startOnlineTimer = () => {
    onlineTimerRef.current = setInterval(() => {
      const p = storage.getPoints();
      const now = Date.now();

      // If the last update was more than 5 minutes ago, assume offline
      if (now - p.lastOnlineUpdate > 5 * 60000) {
        p.lastOnlineUpdate = now;
        storage.savePoints(p);
        return;
      }

      const diffMinutes = Math.floor((now - p.lastOnlineUpdate) / 60000);
      if (diffMinutes >= 1) {
        p.onlineMinutes += diffMinutes;
        p.lastOnlineUpdate = now;

        // Check if we just crossed the 10 minute threshold
        if (p.onlineMinutes >= 10 && p.onlineMinutes - diffMinutes < 10) {
          p.total += 10;
          p.history.unshift({
            id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
            type: 'earn',
            amount: 10,
            reason: '在线时长奖励',
            timestamp: Date.now(),
          });
          if (p.history.length > 50) p.history.pop();
          showPointsToast(10, '在线时长奖励');
        }
        storage.savePoints(p);
      }
    }, 60000);
  };

  const checkDailyLogin = () => {
    const pointsInfo = storage.getPoints();
    const today = new Date().toISOString().slice(0, 10);
    if (pointsInfo.lastLoginDate !== today) {
      pointsInfo.total += 10;
      pointsInfo.history.unshift({
        id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
        type: 'earn',
        amount: 10,
        reason: '每日登录奖励',
        timestamp: Date.now(),
      });
      if (pointsInfo.history.length > 50) pointsInfo.history.pop();
      pointsInfo.lastLoginDate = today;
      pointsInfo.onlineMinutes = 0;
      pointsInfo.lastOnlineUpdate = Date.now();
      storage.savePoints(pointsInfo);
      showPointsToast(10, '每日登录奖励');
    }
  };

  const grantInteractionPoints = () => {
    const p = storage.getPoints();
    const today = new Date().toISOString().slice(0, 10);
    if (p.lastInteractionDate !== today) {
      p.dailyInteractionPoints = 0;
      p.lastInteractionDate = today;
    }
    if (p.dailyInteractionPoints < 20) {
      p.dailyInteractionPoints += 5;
      p.total += 5;
      p.history.unshift({
        id: 'tx_' + Date.now() + Math.random().toString(36).substring(2, 7),
        type: 'earn',
        amount: 5,
        reason: '互动奖励',
        timestamp: Date.now(),
      });
      if (p.history.length > 50) p.history.pop();
      storage.savePoints(p);
      showPointsToast(5, '互动奖励');
    }
  };

  const triggerInteraction = (action: string) => {
    if (action !== 'idle' && !cat?.videoPaths?.[action]) {
      return;
    }
    setCurrentAction(action);
    setVideoError(false);
    setIsVideoReady(false);
    grantInteractionPoints();

    // 显示互动气泡
    const bubbleText = INTERACTION_TEXTS[action];
    if (bubbleText) {
      showFloatingBubble(bubbleText, 2500);
    }
  };

  const handleTouchStart = (e: any) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      triggerInteraction('blink');
    }, 600);
  };

  const handleTouchEnd = (e: any) => {
    clearTimeout(longPressTimerRef.current);
    if (longPressTriggeredRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const now = Date.now();

    if (dist > 50) {
      triggerInteraction('rubbing');
    } else if (now - lastTapRef.current < 300) {
      triggerInteraction('tail');
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          triggerInteraction('idle');
        }
      }, 300);
    }
  };

  const handleTouchMove = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const handleRetryVideo = () => {
    setVideoError(false);
    setCurrentAction('idle');
    setIsVideoReady(false);
  };

  const primaryVideo = getPrimaryVideoUrl(cat);
  const videoSrc = cat?.videoPaths?.[currentAction] || primaryVideo;
  const hasVideo = !!primaryVideo;

  return (
    <View className="home-page">
      {/* 全屏视频 / 占位图层 */}
      {cat && (
        <View
          className="video-fullscreen"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {(cat.placeholderImage || cat.avatar) && (
            <CatAvatar
              className="placeholder-img"
              src={cat.placeholderImage || cat.avatar}
              name={cat.name}
            />
          )}

          {hasVideo && !videoError && (
            <Video
              className="cat-video"
              src={videoSrc}
              autoplay
              loop
              muted
              showFullscreenBtn={false}
              showPlayBtn={false}
              showCenterPlayBtn={false}
              controls={false}
              objectFit="cover"
              onPlay={() => setIsVideoReady(true)}
              onError={handleVideoError}
            />
          )}

          {/* 视频错误状态 */}
          {videoError && (
            <View className="video-error-overlay">
              <Text className="video-error-title">视频暂时无法播放</Text>
              <Text className="video-error-desc">网络波动，请稍后重试</Text>
              <View className="retry-btn" onClick={handleRetryVideo}>
                <Text className="retry-btn-text">重试播放</Text>
              </View>
            </View>
          )}

          {/* 互动气泡 */}
          <FrostedGlassBubble
            text={bubbleText}
            bubbleId={bubbleId}
            visible={bubbleVisible}
            exiting={bubbleExiting}
          />

          {/* 积分 Toast */}
          {pointsToast && (
            <View className="points-toast">
              <Text className="points-toast-text">{pointsToast}</Text>
            </View>
          )}
        </View>
      )}

      {/* 无猫咪状态 */}
      {!cat && (
        <View className="no-cat-screen">
          <Text className="no-cat-text">还没有猫咪</Text>
          <View className="add-cat-btn" onClick={() => navigateTo({ url: '/pages/empty-cat/index' })}>
            <Text className="add-cat-btn-text">领养一只</Text>
          </View>
        </View>
      )}
    </View>
  );
}