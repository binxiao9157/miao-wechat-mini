import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, Video } from '@tarojs/components';
import Taro, { navigateTo, useDidShow } from '@tarojs/taro';
import { storage, CatInfo } from '../../services/storage';
import { on, off } from '../../utils/eventAdapter';
import './index.less';

const ACTION_BUBBLES: Record<string, string> = {
  idle: '喵~ 蹭蹭你',
  tail: '摸摸头，真乖～',
  rubbing: '踩奶中，好舒服～',
  blink: '小羽毛，抓不到～',
};

export default function Home() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [points, setPoints] = useState(0);
  const [currentAction, setCurrentAction] = useState('idle');
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [showPointToast, setShowPointToast] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // 手势状态
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<any>(null);
  const longPressTriggeredRef = useRef(false);
  const bubbleTimerRef = useRef<any>(null);
  const onlineTimerRef = useRef<any>(null);
  const greetingShownRef = useRef(false);
  const secretTapCountRef = useRef(0);
  const secretTapTimerRef = useRef<any>(null);
  const prevVideoCountRef = useRef(0);

  const loadCat = useCallback(() => {
    const activeCat = storage.getActiveCat();
    setCat(activeCat);
    const pointsInfo = storage.getPoints();
    setPoints(pointsInfo.total);
  }, []);

  useEffect(() => {
    loadCat();
    checkDailyLogin();
    showGreeting();
    startOnlineTimer();

    const handler = (data?: any) => {
      const updatedCat = storage.getActiveCat();
      if (updatedCat) {
        const newCount = Object.keys(updatedCat.videoPaths || {}).filter(k => updatedCat.videoPaths?.[k]).length;
        if (newCount > prevVideoCountRef.current && prevVideoCountRef.current > 0) {
          showBubble('新动作已解锁！快来试试吧～');
        }
        prevVideoCountRef.current = newCount;
        setCat(updatedCat);
      }
    };
    on('cat-updated', handler);

    return () => {
      off('cat-updated', handler);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
      if (secretTapTimerRef.current) clearTimeout(secretTapTimerRef.current);
    };
  }, [loadCat]);

  useDidShow(() => {
    loadCat();
    showGreeting();
  });

  useEffect(() => {
    if (cat?.videoPaths) {
      prevVideoCountRef.current = Object.keys(cat.videoPaths).filter(k => cat.videoPaths?.[k]).length;
    }
  }, [cat?.id]);

  const showGreeting = () => {
    if (greetingShownRef.current) return;
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 10) {
      greetingShownRef.current = true;
      showBubble('早上好～');
    } else if (hour >= 22 && hour < 24) {
      greetingShownRef.current = true;
      showBubble('该休息啦～');
    }
  };

  const startOnlineTimer = () => {
    const startTime = Date.now();
    onlineTimerRef.current = setInterval(() => {
      const minutes = Math.floor((Date.now() - startTime) / 60000);
      if (minutes >= 10) {
        const pointsInfo = storage.getPoints();
        const today = new Date().toDateString();
        const onlineKey = `miao_online_reward_${today}`;
        if (!Taro.getStorageSync(onlineKey)) {
          const newTotal = storage.addPoints(10, '在线时长奖励');
          setPoints(newTotal);
          Taro.setStorageSync(onlineKey, 'true');
          showPointReward('+10 在线时长奖励');
        }
        clearInterval(onlineTimerRef.current);
      }
    }, 60000);
  };

  const checkDailyLogin = () => {
    const pointsInfo = storage.getPoints();
    const today = new Date().toDateString();
    if (pointsInfo.lastLoginDate !== today) {
      const newTotal = storage.addPoints(10, '每日登录奖励');
      setPoints(newTotal);
      showBubble('早上好～ 登录奖励 +10');
    }
  };

  const showBubble = (text: string, duration: number = 3000) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    setBubbleText(text);
    bubbleTimerRef.current = setTimeout(() => setBubbleText(null), duration);
  };

  const showPointReward = (msg: string) => {
    setShowPointToast(msg);
    setTimeout(() => setShowPointToast(null), 2500);
  };

  const grantInteractionPoints = () => {
    const today = new Date().toDateString();
    const dailyKey = `miao_daily_interaction_${today}`;
    const dailyUsed = parseInt(Taro.getStorageSync(dailyKey) || '0');
    if (dailyUsed < 20) {
      const newTotal = storage.addPoints(5, '互动奖励');
      setPoints(newTotal);
      Taro.setStorageSync(dailyKey, String(dailyUsed + 5));
      showPointReward('+5 互动奖励');
    }
  };

  const triggerInteraction = (action: string) => {
    if (action !== 'idle' && !cat?.videoPaths?.[action]) {
      showBubble('该动作尚未解锁哦～');
      return;
    }
    setCurrentAction(action);
    setVideoError(false);
    setIsVideoReady(false);
    showBubble(ACTION_BUBBLES[action] || '喵~');
    grantInteractionPoints();
  };

  const handleSecretTap = () => {
    secretTapCountRef.current += 1;
    if (secretTapTimerRef.current) clearTimeout(secretTapTimerRef.current);
    if (secretTapCountRef.current >= 5) {
      secretTapCountRef.current = 0;
      Taro.vibrateShort({ type: 'medium' }).catch(() => {});
      Taro.showModal({
        title: '调试确认',
        content: '确定要永久送走当前的小猫吗？',
        confirmText: '确定送走',
        confirmColor: '#ff4444',
        success: (res) => {
          if (res.confirm && cat) {
            storage.deleteCatById(cat.id);
            const next = storage.getActiveCat();
            if (next) {
              setCat(next);
              setCurrentAction('idle');
              showBubble(`已送走 ${cat.name}，正在迎接新伙伴...`);
            } else {
              setCat(null);
              Taro.reLaunch({ url: '/pages/welcome/index' });
            }
          }
        }
      });
      return;
    }
    secretTapTimerRef.current = setTimeout(() => { secretTapCountRef.current = 0; }, 2000);
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

  const videoSrc = cat?.videoPaths?.[currentAction] || cat?.videoPaths?.idle || '';
  const hasVideo = !!cat?.videoPaths?.idle;

  return (
    <View className="home-page">

      {/* ─── 全屏视频 / 占位图层 ─── */}
      {cat && (
        <View
          className="video-fullscreen"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {/* 占位图（视频加载前 / 无视频时显示） */}
          {(cat.placeholderImage || cat.avatar) && (
            <Image
              className="placeholder-img"
              src={cat.placeholderImage || cat.avatar || ''}
              mode="aspectFill"
            />
          )}

          {/* 视频层 */}
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

      {/* ─── 浮层 UI（叠在视频上方）─── */}

      {/* 秘密入口触发区 - 右上角 */}
      <View className="secret-tap-area" onClick={handleSecretTap} />

      {/* 积分 badge - 右上角 */}
      <View className="points-badge" onClick={() => navigateTo({ url: '/pages/points/index' })}>
        <Text className="points-icon">🪙</Text>
        <Text className="points-value">{points}</Text>
      </View>

      {/* 气泡提示 */}
      {bubbleText && (
        <View className="bubble-container">
          <View className="bubble">
            <Text className="bubble-text">{bubbleText}</Text>
          </View>
        </View>
      )}

      {/* 积分奖励提示 */}
      {showPointToast && (
        <View className="point-toast">
          <Text className="point-toast-text">{showPointToast}</Text>
        </View>
      )}

      {/* 解锁中提示 */}
      {cat?.isUnlocking && (
        <View className="unlocking-hint">
          <Text className="unlocking-text">更多动作加载中...</Text>
        </View>
      )}

      {/* 猫咪名字 - 底部浮层 */}
      {cat && (
        <View className="cat-name-overlay">
          <Text className="cat-name-text">{cat.name}</Text>
          {cat.breed && (
            <Text className="cat-breed-text">{cat.breed}{cat.color ? ` · ${cat.color}` : ''}</Text>
          )}
        </View>
      )}

      {/* 手势提示 - 最底部 */}
      {cat && hasVideo && !videoError && (
        <View className="gesture-hints">
          <Text className="gesture-hint">单击·蹭蹭 | 双击·摸头 | 滑动·踩奶 | 长按·逗猫</Text>
        </View>
      )}
    </View>
  );
}
