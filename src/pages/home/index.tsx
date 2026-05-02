import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, Video } from '@tarojs/components';
import Taro, { navigateTo, useDidShow } from '@tarojs/taro';
import { storage, CatInfo } from '../../services/storage';
import { getPrimaryVideoUrl } from '../../services/catLifecycle';
import { on, off } from '../../utils/eventAdapter';
import './index.less';

export default function Home() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [currentAction, setCurrentAction] = useState('idle');
  const [videoError, setVideoError] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // 手势状态
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<any>(null);
  const longPressTriggeredRef = useRef(false);
  const onlineTimerRef = useRef<any>(null);
  const prevVideoCountRef = useRef(0);

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

    const handler = (data?: any) => {
      const updatedCat = storage.getActiveCat();
      if (updatedCat) {
        setCat(updatedCat);
      }
    };
    on('cat-updated', handler);
    on('cat-list-synced', handler);

    return () => {
      off('cat-updated', handler);
      off('cat-list-synced', handler);
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
    };
  }, [loadCat, refreshCatsFromCloud]);

  useDidShow(() => {
    loadCat();
    refreshCatsFromCloud();
  });

  useEffect(() => {
    if (cat?.videoPaths) {
      prevVideoCountRef.current = Object.keys(cat.videoPaths).filter(k => cat.videoPaths?.[k]).length;
    }
  }, [cat?.id]);

  const startOnlineTimer = () => {
    const startTime = Date.now();
    onlineTimerRef.current = setInterval(() => {
      const minutes = Math.floor((Date.now() - startTime) / 60000);
      if (minutes >= 10) {
        const today = new Date().toDateString();
        const onlineKey = `miao_online_reward_${today}`;
        if (!Taro.getStorageSync(onlineKey)) {
          storage.addPoints(10, '在线时长奖励');
          Taro.setStorageSync(onlineKey, 'true');
        }
        clearInterval(onlineTimerRef.current);
      }
    }, 60000);
  };

  const checkDailyLogin = () => {
    const pointsInfo = storage.getPoints();
    const today = new Date().toDateString();
    if (pointsInfo.lastLoginDate !== today) {
      storage.addPoints(10, '每日登录奖励');
    }
  };

  const grantInteractionPoints = () => {
    const today = new Date().toDateString();
    const dailyKey = `miao_daily_interaction_${today}`;
    const dailyUsed = parseInt(Taro.getStorageSync(dailyKey) || '0');
    if (dailyUsed < 20) {
      storage.addPoints(5, '互动奖励');
      Taro.setStorageSync(dailyKey, String(dailyUsed + 5));
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
            <Image
              className="placeholder-img"
              src={cat.placeholderImage || cat.avatar || ''}
              mode="aspectFill"
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

          {/* 视频错误状态 - 保留功能性UI */}
          {videoError && (
            <View className="video-error-overlay">
              <Text className="video-error-title">视频暂时无法播放</Text>
              <Text className="video-error-desc">网络波动，请稍后重试</Text>
              <View className="retry-btn" onClick={handleRetryVideo}>
                <Text className="retry-btn-text">重试播放</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 无猫咪状态 - 保留功能性UI */}
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