import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Video } from '@tarojs/components';
import Taro, { useDidHide, useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { storage, CatInfo } from '../../services/storage';
import CatAvatar from '../../components/common/CatAvatar';
import { getPrimaryVideoUrl } from '../../services/catLifecycle';
import { hasFourStageVideos } from '../../services/videoActions';
import { on, off } from '../../utils/eventAdapter';
import { navigateTo } from '../../utils/navigateAdapter';
import FrostedGlassBubble from '../../components/common/FrostedGlassBubble';
import './index.less';

type PlaybackState = 'READY' | 'PLAYING_V1' | 'LOOPING_V2' | 'PLAYING_V3' | 'PLAYING_V4';

const GREETING_MORNING = '早上好~';
const GREETING_NIGHT = '该休息啦~';

const VIDEO_IDS = {
  v1: 'catVideoV1',
  v2: 'catVideoV2',
  v3: 'catVideoV3',
  v4: 'catVideoV4',
};

type StoryVideoKey = keyof typeof VIDEO_IDS;

function getActiveStoryVideoKey(state: PlaybackState): StoryVideoKey | null {
  if (state === 'PLAYING_V1') return 'v1';
  if (state === 'LOOPING_V2') return 'v2';
  if (state === 'PLAYING_V3') return 'v3';
  if (state === 'PLAYING_V4') return 'v4';
  return null;
}

function getGreetingText(): string | null {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 10) return GREETING_MORNING;
  if (hour >= 22 || hour < 1) return GREETING_NIGHT;
  return null;
}

function getStoryUrls(cat: CatInfo | null) {
  return {
    v1: cat?.videoPaths?.v1_approach || cat?.videoPath || cat?.remoteVideoUrl || '',
    v2: cat?.videoPaths?.v2_wait || '',
    v3: cat?.videoPaths?.v3_return || '',
    v4: cat?.videoPaths?.v4_fetch || '',
  };
}

export default function Home() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('READY');
  const [v2LoopCount, setV2LoopCount] = useState(0);
  const [videoError, setVideoError] = useState(false);

  useShareAppMessage(() => ({
    title: cat ? `来和${cat.name}一起玩吧！` : 'Miao - 你的AI猫咪伙伴',
    path: '/pages/home/index',
  }));

  useShareTimeline(() => ({
    title: cat ? `来和${cat.name}一起玩吧！` : 'Miao - 你的AI猫咪伙伴',
    imageUrl: cat?.avatar || undefined,
  }));

  const [bubbleText, setBubbleText] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleExiting, setBubbleExiting] = useState(false);
  const [pointsToast, setPointsToast] = useState('');
  const bubbleTimerRef = useRef<any>(null);
  const bubbleExitTimerRef = useRef<any>(null);
  const pointsToastTimerRef = useRef<any>(null);
  const greetingTimerRef = useRef<any>(null);
  const interactionHintTimerRef = useRef<any>(null);
  const onlineTimerRef = useRef<any>(null);
  const lastActionErrorRef = useRef('');

  const showFloatingBubble = useCallback((text: string, duration = 3000) => {
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    if (bubbleExitTimerRef.current) clearTimeout(bubbleExitTimerRef.current);
    setBubbleExiting(false);
    setBubbleText(text);
    setBubbleVisible(true);

    bubbleTimerRef.current = setTimeout(() => {
      setBubbleExiting(true);
      bubbleExitTimerRef.current = setTimeout(() => {
        setBubbleVisible(false);
        setBubbleExiting(false);
      }, 300);
    }, duration);
  }, []);

  const showPointsToast = useCallback((amount: number, label?: string) => {
    if (pointsToastTimerRef.current) clearTimeout(pointsToastTimerRef.current);
    setPointsToast(label ? `+${amount} ${label}` : `+${amount}`);
    pointsToastTimerRef.current = setTimeout(() => setPointsToast(''), 2000);
  }, []);

  const runVideoCommand = useCallback((id: string, label: string, command: (ctx: any) => void) => {
    try {
      const ctx = Taro.createVideoContext(id);
      command(ctx);
    } catch (error) {
      console.warn(`[Home] ${label} video failed:`, error);
    }
  }, []);

  const pauseVideo = useCallback((id: string) => {
    runVideoCommand(id, 'pause', ctx => {
      ctx.pause?.();
    });
  }, [runVideoCommand]);

  const seekVideoToStart = useCallback((id: string) => {
    runVideoCommand(id, 'seek', ctx => {
      ctx.seek?.(0);
    });
  }, [runVideoCommand]);

  const pauseAllVideos = useCallback(() => {
    Object.values(VIDEO_IDS).forEach(pauseVideo);
  }, [pauseVideo]);

  const resetAllVideoPositions = useCallback(() => {
    Object.values(VIDEO_IDS).forEach(seekVideoToStart);
  }, [seekVideoToStart]);

  const playStoryVideo = useCallback((key: StoryVideoKey) => {
    Object.entries(VIDEO_IDS).forEach(([candidateKey, id]) => {
      if (candidateKey !== key) pauseVideo(id);
    });

    runVideoCommand(VIDEO_IDS[key], `play ${key}`, ctx => {
      ctx.seek?.(0);
      ctx.play?.();
    });
  }, [pauseVideo, runVideoCommand]);

  const resetPlayback = useCallback(() => {
    pauseAllVideos();
    setPlaybackState('READY');
    setV2LoopCount(0);
    setVideoError(false);
    resetAllVideoPositions();
  }, [pauseAllVideos, resetAllVideoPositions]);

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

  const checkDailyLogin = useCallback(() => {
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
  }, [showPointsToast]);

  const startOnlineTimer = useCallback(() => {
    if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
    onlineTimerRef.current = setInterval(() => {
      const p = storage.getPoints();
      const now = Date.now();

      if (now - p.lastOnlineUpdate > 5 * 60000) {
        p.lastOnlineUpdate = now;
        storage.savePoints(p);
        return;
      }

      const diffMinutes = Math.floor((now - p.lastOnlineUpdate) / 60000);
      if (diffMinutes >= 1) {
        p.onlineMinutes += diffMinutes;
        p.lastOnlineUpdate = now;

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
  }, [showPointsToast]);

  const grantInteractionPoints = useCallback(() => {
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
  }, [showPointsToast]);

  useEffect(() => {
    loadCat();
    refreshCatsFromCloud();
    checkDailyLogin();
    startOnlineTimer();
    Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] } as any);

    const greeting = getGreetingText();
    if (greeting) {
      greetingTimerRef.current = setTimeout(() => showFloatingBubble(greeting, 4000), 1000);
    }

    const handler = () => {
      const updatedCat = storage.getActiveCat();
      if (updatedCat) setCat(updatedCat);
    };
    on('cat-updated', handler);
    on('cat-list-synced', handler);

    const interactionHandler = () => {
      if (interactionHintTimerRef.current) clearTimeout(interactionHintTimerRef.current);
      interactionHintTimerRef.current = setTimeout(() => showFloatingBubble('快来和猫咪互动吧~', 3000), 500);
    };
    on('home:show-interaction-hint', interactionHandler);

    return () => {
      off('cat-updated', handler);
      off('cat-list-synced', handler);
      off('home:show-interaction-hint', interactionHandler);
      if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      if (bubbleExitTimerRef.current) clearTimeout(bubbleExitTimerRef.current);
      if (pointsToastTimerRef.current) clearTimeout(pointsToastTimerRef.current);
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
      if (interactionHintTimerRef.current) clearTimeout(interactionHintTimerRef.current);
    };
  }, [checkDailyLogin, loadCat, refreshCatsFromCloud, showFloatingBubble, startOnlineTimer]);

  useDidShow(() => {
    Taro.eventCenter.trigger('tabbar:show');
    Taro.eventCenter.trigger('tabbar:route', 'pages/home/index');
    const activeCat = storage.getActiveCat();
    setCat(activeCat);
    resetPlayback();
    refreshCatsFromCloud();
    checkDailyLogin();
  });

  useDidHide(() => {
    pauseAllVideos();
  });

  useEffect(() => {
    return () => {
      pauseAllVideos();
    };
  }, [pauseAllVideos]);

  useEffect(() => {
    if (!cat?.id) return;
    resetPlayback();
  }, [cat?.id, resetPlayback]);

  useEffect(() => {
    const actionError = cat?.actionGenerationError || '';
    if (!actionError || actionError === lastActionErrorRef.current) return;
    lastActionErrorRef.current = actionError;
    showFloatingBubble(actionError, 5000);
  }, [cat?.actionGenerationError, showFloatingBubble]);

  const urls = getStoryUrls(cat);
  const hasVideo = !!getPrimaryVideoUrl(cat);
  const hasStoryModel = hasFourStageVideos(cat);

  const handleV1Ended = () => {
    if (playbackState !== 'PLAYING_V1') return;

    if (urls.v2) {
      setPlaybackState('LOOPING_V2');
      setV2LoopCount(0);
      showFloatingBubble('喵呜？要把人家的毛球抢走吗？');
      playStoryVideo('v2');
      return;
    }

    pauseAllVideos();
    seekVideoToStart(VIDEO_IDS.v1);
    setPlaybackState('READY');
    showFloatingBubble(cat?.isUnlocking ? '后续剧情还在生成中，请稍后再来互动～' : '剧情流还没准备好，请重新生成或等待同步～');
  };

  const handleV2Ended = () => {
    if (playbackState !== 'LOOPING_V2') return;

    const nextCount = v2LoopCount + 1;
    if (nextCount >= 5) {
      setV2LoopCount(0);

      if (urls.v3) {
        setPlaybackState('PLAYING_V3');
        showFloatingBubble('唔，不抢那我就把球抱回去自个儿玩啦...');
        playStoryVideo('v3');
      } else {
        pauseAllVideos();
        seekVideoToStart(VIDEO_IDS.v1);
        setPlaybackState('READY');
        showFloatingBubble(cat?.isUnlocking ? '还在生成返回结局，请稍后再试～' : '返回结局还没准备好，请等待同步～');
      }

      return;
    }

    setV2LoopCount(nextCount);
    playStoryVideo('v2');
  };

  const handleV3Ended = () => {
    if (playbackState !== 'PLAYING_V3') return;

    pauseAllVideos();
    setPlaybackState('READY');
    seekVideoToStart(VIDEO_IDS.v1);
  };

  const handleV4Ended = () => {
    if (playbackState !== 'PLAYING_V4') return;

    pauseAllVideos();
    setPlaybackState('READY');
    seekVideoToStart(VIDEO_IDS.v1);
  };

  const handleMainTap = () => {
    if (!cat) return;

    if (playbackState === 'READY') {
      if (!urls.v1) {
        setVideoError(true);
        return;
      }

      setPlaybackState('PLAYING_V1');
      showFloatingBubble('它叼着一个毛球，渴望地朝你跑了过来！');
      grantInteractionPoints();
      playStoryVideo('v1');
      return;
    }

    if (playbackState === 'LOOPING_V2') {
      if (!urls.v4) {
        showFloatingBubble(cat.isUnlocking ? '还在生成有趣的后续结局哦，请耐心等候～' : '快去解锁完整的“毛球互动剧情流”吧～');
        return;
      }

      setPlaybackState('PLAYING_V4');
      showFloatingBubble('好耶！把它的毛球投掷到远处～它跑去抢落点捡球了！');
      grantInteractionPoints();
      playStoryVideo('v4');
      return;
    }

    showFloatingBubble('静静观赏它的可爱故事演出吧～');
  };

  const handleVideoError = (key: StoryVideoKey) => {
    const activeKey = getActiveStoryVideoKey(playbackState);
    if (activeKey && activeKey !== key) return;
    if (!activeKey && key !== 'v1') return;

    pauseAllVideos();
    setVideoError(true);
  };

  const handleRetryVideo = () => {
    resetPlayback();
    if (!urls.v1) return;

    setPlaybackState('PLAYING_V1');
    playStoryVideo('v1');
  };

  return (
    <View className="home-page">
      {cat && (
        <View className="video-fullscreen">
          {(cat.placeholderImage || cat.avatar) && (
            <CatAvatar
              className="placeholder-img"
              src={cat.placeholderImage || cat.avatar}
              name={cat.name}
            />
          )}

          {hasVideo && (
            <View className="video-stack">
              <Video
                id={VIDEO_IDS.v1}
                className={`cat-video story-video ${playbackState === 'READY' || playbackState === 'PLAYING_V1' ? 'active' : ''}`}
                src={urls.v1}
                muted
                showFullscreenBtn={false}
                showPlayBtn={false}
                showCenterPlayBtn={false}
                controls={false}
                enableProgressGesture={false}
                enablePlayGesture={false}
                autoplay={false}
                initialTime={0}
                objectFit="cover"
                onEnded={handleV1Ended}
                onError={() => handleVideoError('v1')}
              />

              {urls.v2 && (
                <Video
                  id={VIDEO_IDS.v2}
                  className={`cat-video story-video ${playbackState === 'LOOPING_V2' ? 'active' : ''}`}
                  src={urls.v2}
                  muted
                  showFullscreenBtn={false}
                  showPlayBtn={false}
                  showCenterPlayBtn={false}
                  controls={false}
                  enableProgressGesture={false}
                  enablePlayGesture={false}
                  autoplay={false}
                  initialTime={0}
                  objectFit="cover"
                  onEnded={handleV2Ended}
                  onError={() => handleVideoError('v2')}
                />
              )}

              {urls.v3 && (
                <Video
                  id={VIDEO_IDS.v3}
                  className={`cat-video story-video ${playbackState === 'PLAYING_V3' ? 'active' : ''}`}
                  src={urls.v3}
                  muted
                  showFullscreenBtn={false}
                  showPlayBtn={false}
                  showCenterPlayBtn={false}
                  controls={false}
                  enableProgressGesture={false}
                  enablePlayGesture={false}
                  autoplay={false}
                  initialTime={0}
                  objectFit="cover"
                  onEnded={handleV3Ended}
                  onError={() => handleVideoError('v3')}
                />
              )}

              {urls.v4 && (
                <Video
                  id={VIDEO_IDS.v4}
                  className={`cat-video story-video ${playbackState === 'PLAYING_V4' ? 'active' : ''}`}
                  src={urls.v4}
                  muted
                  showFullscreenBtn={false}
                  showPlayBtn={false}
                  showCenterPlayBtn={false}
                  controls={false}
                  enableProgressGesture={false}
                  enablePlayGesture={false}
                  autoplay={false}
                  initialTime={0}
                  objectFit="cover"
                  onEnded={handleV4Ended}
                  onError={() => handleVideoError('v4')}
                />
              )}

              <View
                className="story-touch-layer"
                data-testid="story-touch-layer"
                onClick={handleMainTap}
              />
            </View>
          )}

          {videoError && (
            <View className="video-error-overlay">
              <Text className="video-error-title">视频暂时无法播放</Text>
              <Text className="video-error-desc">网络波动，请稍后重试</Text>
              <View className="retry-btn" onClick={handleRetryVideo}>
                <Text className="retry-btn-text">重试播放</Text>
              </View>
            </View>
          )}

          {!hasStoryModel && hasVideo && !videoError && (
            <View className="unlock-progress-badge">
              <Text className="unlock-progress-title">剧情流暂未完成</Text>
              <Text className="unlock-progress-text">请重新生成或等待同步</Text>
            </View>
          )}

          <FrostedGlassBubble
            text={bubbleText}
            visible={bubbleVisible}
            exiting={bubbleExiting}
          />

          {pointsToast && (
            <View className="points-toast">
              <Text className="points-toast-text">{pointsToast}</Text>
            </View>
          )}

          {cat.isUnlocking && (
            <View className="unlock-progress-badge">
              <Text className="unlock-progress-title">正在解锁更多动作</Text>
              <Text className="unlock-progress-text">
                {cat.unlockProgress
                  ? `${cat.unlockProgress.completed}/${cat.unlockProgress.total} 已完成`
                  : '后台生成中'}
              </Text>
            </View>
          )}
        </View>
      )}

      {!cat && (
        <View className="no-cat-screen">
          <Text className="no-cat-text">还没有猫咪</Text>
          <View className="add-cat-btn" onClick={() => navigateTo('/pages/empty-cat/index')}>
            <Text className="add-cat-btn-text">领养一只</Text>
          </View>
        </View>
      )}
    </View>
  );
}
