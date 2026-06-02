import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Video, CoverView } from '@tarojs/components';
import Taro, { useDidHide, useDidShow, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { storage, CatInfo } from '../../services/storage';
import CatAvatar from '../../components/common/CatAvatar';
import { getPrimaryVideoUrl } from '../../services/catLifecycle';
import { hasFourStageVideos } from '../../services/videoActions';
import { isSecondaryUnlockRunning, startSecondaryUnlock } from '../../services/secondaryUnlockService';
import { on, off } from '../../utils/eventAdapter';
import { navigateTo } from '../../utils/navigateAdapter';
import { reportPlaybackDiagnostic } from '../../utils/clientDiagnostics';
import '../../components/common/FrostedGlassBubble.less';
import './index.less';

type PlaybackState = 'READY' | 'PLAYING_V1' | 'LOOPING_V2' | 'PLAYING_V3' | 'PLAYING_V4';

const GREETING_MORNING = '早上好~';
const GREETING_NIGHT = '该休息啦~';

const STORY_VIDEO_ID = 'catStoryVideo';
const STORY_VIDEO_KEYS = ['v1', 'v2', 'v3', 'v4'] as const;
const HOME_BUBBLE_DURATION_MS = 1000;
const STORY_BUBBLES = {
  v1: '我来啦~',
  v2: '喵呜？陪我玩好不好？',
  v3: '你不理我，那我走了...',
  v4: '好耶！好耶！',
} as const;

type StoryVideoKey = typeof STORY_VIDEO_KEYS[number];

function getActiveStoryVideoKey(state: PlaybackState): StoryVideoKey | null {
  if (state === 'PLAYING_V1') return 'v1';
  if (state === 'LOOPING_V2') return 'v2';
  if (state === 'PLAYING_V3') return 'v3';
  if (state === 'PLAYING_V4') return 'v4';
  return null;
}

function getStoryVideoKeyForState(state: PlaybackState): StoryVideoKey {
  return getActiveStoryVideoKey(state) || 'v1';
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

function getStoryUrlByKey(urls: ReturnType<typeof getStoryUrls>, key: StoryVideoKey): string {
  return urls[key] || '';
}

function HomeCoverBubble({ text, visible, exiting }: { text: string; visible: boolean; exiting?: boolean }) {
  if (!visible) return null;

  return (
    <CoverView className={`frosted-glass-bubble ${exiting ? 'bubble-exit' : 'bubble-enter'}`}>
      <CoverView className="bubble-glow" />
      <CoverView className="bubble-body">
        <CoverView className="bubble-text">{text}</CoverView>
      </CoverView>
      <CoverView className="bubble-border-overlay" />
    </CoverView>
  );
}

export default function Home() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('READY');
  const [v2LoopCount, setV2LoopCount] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [storyVideoReady, setStoryVideoReady] = useState(true);
  const [playRequest, setPlayRequest] = useState<{ key: StoryVideoKey; nonce: number } | null>(null);

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
  const playbackWatchdogRef = useRef<any>(null);
  const playRetryTimersRef = useRef<any[]>([]);
  const requestedVideoKeyRef = useRef<StoryVideoKey | null>(null);
  const playRequestNonceRef = useRef(0);
  const resumeUnlockCatIdsRef = useRef<Set<string>>(new Set());

  const urls = getStoryUrls(cat);
  const hasVideo = !!getPrimaryVideoUrl(cat);
  const hasStoryModel = hasFourStageVideos(cat);
  const activeStoryVideoKey = getStoryVideoKeyForState(playbackState);
  const activeStoryVideoSrc = getStoryUrlByKey(urls, activeStoryVideoKey) || urls.v1;
  const isPlayingStoryVideo = playbackState !== 'READY';

  const showFloatingBubble = useCallback((text: string, duration = HOME_BUBBLE_DURATION_MS) => {
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
    }, Math.min(duration, HOME_BUBBLE_DURATION_MS));
  }, []);

  const showPointsToast = useCallback((amount: number, label?: string) => {
    if (pointsToastTimerRef.current) clearTimeout(pointsToastTimerRef.current);
    setPointsToast(label ? `+${amount} ${label}` : `+${amount}`);
    pointsToastTimerRef.current = setTimeout(() => setPointsToast(''), 2000);
  }, []);

  const runVideoCommand = useCallback((id: string, label: string, command: (ctx: any) => void) => {
    try {
      const ctx = Taro.createVideoContext(id);
      if (!ctx) return;
      command(ctx);
    } catch (error) {
      console.warn(`[Home] ${label} video failed:`, error);
    }
  }, []);

  const clearPlaybackTimers = useCallback(() => {
    if (playbackWatchdogRef.current) {
      clearTimeout(playbackWatchdogRef.current);
      playbackWatchdogRef.current = null;
    }

    playRetryTimersRef.current.forEach(timer => clearTimeout(timer));
    playRetryTimersRef.current = [];
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
    pauseVideo(STORY_VIDEO_ID);
  }, [pauseVideo]);

  const resetAllVideoPositions = useCallback(() => {
    seekVideoToStart(STORY_VIDEO_ID);
  }, [seekVideoToStart]);

  const queueNativePlay = useCallback((key: StoryVideoKey) => {
    const play = () => {
      runVideoCommand(STORY_VIDEO_ID, `play ${key}`, ctx => {
        ctx.seek?.(0);
        ctx.play?.();
      });
    };

    play();

    const nextTick = (Taro as any).nextTick;
    if (typeof nextTick === 'function') {
      nextTick(play);
    } else {
      playRetryTimersRef.current.push(setTimeout(play, 0));
    }

    playRetryTimersRef.current.push(setTimeout(play, 180));
    playRetryTimersRef.current.push(setTimeout(play, 650));
  }, [runVideoCommand]);

  const playStoryVideo = useCallback((key: StoryVideoKey) => {
    clearPlaybackTimers();
    requestedVideoKeyRef.current = key;
    setVideoError(false);
    setStoryVideoReady(false);
    pauseAllVideos();
    setPlayRequest({ key, nonce: playRequestNonceRef.current + 1 });
    playRequestNonceRef.current += 1;
    playbackWatchdogRef.current = setTimeout(() => {
      if (requestedVideoKeyRef.current !== key) return;
      const currentUrls = getStoryUrls(cat);
      reportPlaybackDiagnostic('home.video.watchdog-timeout', {
        catId: cat?.id,
        action: key,
        playbackState,
        src: getStoryUrlByKey(currentUrls, key),
      });
      setVideoError(true);
      showFloatingBubble('视频启动失败，请重试', 4000);
    }, 5000);
  }, [cat, clearPlaybackTimers, pauseAllVideos, playbackState, showFloatingBubble]);

  const resetPlayback = useCallback(() => {
    clearPlaybackTimers();
    requestedVideoKeyRef.current = null;
    setPlayRequest(null);
    pauseAllVideos();
    setPlaybackState('READY');
    setV2LoopCount(0);
    setVideoError(false);
    setStoryVideoReady(true);
    resetAllVideoPositions();
  }, [clearPlaybackTimers, pauseAllVideos, resetAllVideoPositions]);

  useEffect(() => {
    if (!playRequest || !activeStoryVideoSrc) return;
    if (playRequest.key !== activeStoryVideoKey) return;

    queueNativePlay(playRequest.key);
  }, [activeStoryVideoKey, activeStoryVideoSrc, playRequest, queueNativePlay]);

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
    const today = new Date().toISOString().slice(0, 10);
    const transactionId = `daily-login:${today}`;
    let awarded = false;

    storage.updatePoints(points => {
      if (points.lastLoginDate === today) return;

      points.lastLoginDate = today;
      points.onlineMinutes = 0;
      points.lastOnlineUpdate = Date.now();
      points.history = [...points.history];

      if (!points.history.some(item => item.id === transactionId)) {
        points.total += 10;
        awarded = true;
        points.history.unshift({
          id: transactionId,
          type: 'earn',
          amount: 10,
          reason: '每日登录奖励',
          timestamp: Date.now(),
        });
        if (points.history.length > 50) points.history.pop();
      }
    });

    if (awarded) showPointsToast(10, '每日登录奖励');
  }, [showPointsToast]);

  const startOnlineTimer = useCallback(() => {
    if (onlineTimerRef.current) clearInterval(onlineTimerRef.current);
    onlineTimerRef.current = setInterval(() => {
      const now = Date.now();
      let awarded = false;

      storage.updatePoints(points => {
        if (now - points.lastOnlineUpdate > 5 * 60000) {
          points.lastOnlineUpdate = now;
          return;
        }

        const diffMinutes = Math.floor((now - points.lastOnlineUpdate) / 60000);
        if (diffMinutes >= 1) {
          const previousOnlineMinutes = points.onlineMinutes;
          points.onlineMinutes += diffMinutes;
          points.lastOnlineUpdate = now;

          if (points.onlineMinutes >= 10 && previousOnlineMinutes < 10) {
            const transactionId = `online-10min:${new Date().toISOString().slice(0, 10)}`;
            if (!points.history.some(item => item.id === transactionId)) {
              points.total += 10;
              awarded = true;
              points.history.unshift({
                id: transactionId,
                type: 'earn',
                amount: 10,
                reason: '在线时长奖励',
                timestamp: Date.now(),
              });
              if (points.history.length > 50) points.history.pop();
            }
          }
        }
      });

      if (awarded) showPointsToast(10, '在线时长奖励');
    }, 60000);
  }, [showPointsToast]);

  const grantInteractionPoints = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    let transactionId = '';

    storage.updatePoints(points => {
      if (points.lastInteractionDate !== today) {
        points.dailyInteractionPoints = 0;
        points.lastInteractionDate = today;
      }

      if (points.dailyInteractionPoints < 20) {
        const nextInteractionPoints = points.dailyInteractionPoints + 5;
        transactionId = `interaction:${today}:${nextInteractionPoints}`;
        points.dailyInteractionPoints = nextInteractionPoints;
      }
    });

    if (transactionId) {
      storage.addPoints(5, '互动奖励', transactionId);
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
      clearPlaybackTimers();
    };
  }, [checkDailyLogin, clearPlaybackTimers, loadCat, refreshCatsFromCloud, showFloatingBubble, startOnlineTimer]);

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
    clearPlaybackTimers();
    requestedVideoKeyRef.current = null;
    setPlayRequest(null);
    pauseAllVideos();
  });

  useEffect(() => {
    return () => {
      clearPlaybackTimers();
      requestedVideoKeyRef.current = null;
      setPlayRequest(null);
      pauseAllVideos();
    };
  }, [clearPlaybackTimers, pauseAllVideos]);

  useEffect(() => {
    if (!cat?.id) return;
    resetPlayback();
  }, [cat?.id, resetPlayback]);

  useEffect(() => {
    if (!cat?.id) return;

    const shouldResumeUnlock = cat.isUnlocking && hasVideo && !hasStoryModel;
    if (!shouldResumeUnlock) {
      resumeUnlockCatIdsRef.current.delete(cat.id);
      return;
    }
    if (resumeUnlockCatIdsRef.current.has(cat.id) || isSecondaryUnlockRunning(cat.id)) return;

    resumeUnlockCatIdsRef.current.add(cat.id);
    const anchorImage = cat.anchorFrame || cat.placeholderImage || cat.avatar;
    const taskCat = {
      id: cat.id,
      name: cat.name,
      breed: cat.breed,
      color: cat.color,
      avatar: cat.avatar,
      source: cat.source,
      anchorFrame: cat.anchorFrame,
      placeholderImage: cat.placeholderImage,
      videoPaths: cat.videoPaths,
    };

    void startSecondaryUnlock(taskCat, anchorImage).finally(() => {
      resumeUnlockCatIdsRef.current.delete(cat.id);
      const updatedCat = storage.getActiveCat();
      if (updatedCat?.id === cat.id) setCat(updatedCat);
    });
  }, [cat, hasStoryModel, hasVideo]);

  useEffect(() => {
    const actionError = cat?.actionGenerationError || '';
    if (!actionError || actionError === lastActionErrorRef.current) return;
    lastActionErrorRef.current = actionError;
    showFloatingBubble(actionError, 5000);
  }, [cat?.actionGenerationError, showFloatingBubble]);

  const handleV1Ended = () => {
    if (playbackState !== 'PLAYING_V1') return;

    if (urls.v2) {
      setPlaybackState('LOOPING_V2');
      setV2LoopCount(0);
      showFloatingBubble(STORY_BUBBLES.v2);
      playStoryVideo('v2');
      return;
    }

    pauseAllVideos();
    resetAllVideoPositions();
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
        showFloatingBubble(STORY_BUBBLES.v3);
        playStoryVideo('v3');
      } else {
        pauseAllVideos();
        resetAllVideoPositions();
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
    resetAllVideoPositions();
  };

  const handleV4Ended = () => {
    if (playbackState !== 'PLAYING_V4') return;

    pauseAllVideos();
    setPlaybackState('READY');
    resetAllVideoPositions();
  };

  const handleActiveVideoEnded = () => {
    if (playbackState === 'PLAYING_V1') {
      handleV1Ended();
      return;
    }

    if (playbackState === 'LOOPING_V2') {
      handleV2Ended();
      return;
    }

    if (playbackState === 'PLAYING_V3') {
      handleV3Ended();
      return;
    }

    if (playbackState === 'PLAYING_V4') {
      handleV4Ended();
    }
  };

  const handleMainTap = () => {
    if (!cat) return;

    if (playbackState === 'READY') {
      reportPlaybackDiagnostic('home.tap.ready', {
        catId: cat.id,
        action: 'v1',
        playbackState,
        src: urls.v1,
        hasVideo,
        hasV1: !!urls.v1,
        hasV2: !!urls.v2,
        hasV3: !!urls.v3,
        hasV4: !!urls.v4,
        isUnlocking: !!cat.isUnlocking,
      });

      if (!urls.v1) {
        setVideoError(true);
        return;
      }

      setPlaybackState('PLAYING_V1');
      showFloatingBubble(STORY_BUBBLES.v1);
      grantInteractionPoints();
      playStoryVideo('v1');
      return;
    }

    if (playbackState === 'LOOPING_V2') {
      if (!urls.v4) {
        reportPlaybackDiagnostic('home.tap.looping-v2.missing-v4', {
          catId: cat.id,
          action: 'v4',
          playbackState,
          src: urls.v4,
          hasV1: !!urls.v1,
          hasV2: !!urls.v2,
          hasV3: !!urls.v3,
          hasV4: !!urls.v4,
          isUnlocking: !!cat.isUnlocking,
        });
        showFloatingBubble(cat.isUnlocking ? '还在生成有趣的后续结局哦，请耐心等候～' : '快去解锁完整的“毛球互动剧情流”吧～');
        return;
      }

      setPlaybackState('PLAYING_V4');
      showFloatingBubble(STORY_BUBBLES.v4);
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

    reportPlaybackDiagnostic('home.video.error', {
      catId: cat?.id,
      action: key,
      playbackState,
      src: getStoryUrlByKey(urls, key),
    });

    clearPlaybackTimers();
    requestedVideoKeyRef.current = null;
    setPlayRequest(null);
    pauseAllVideos();
    setVideoError(true);
  };

  const handleVideoPlay = (key: StoryVideoKey) => {
    if (requestedVideoKeyRef.current !== key) return;
    reportPlaybackDiagnostic('home.video.play', {
      catId: cat?.id,
      action: key,
      playbackState,
      src: getStoryUrlByKey(urls, key),
    });
    requestedVideoKeyRef.current = null;
    clearPlaybackTimers();
    setStoryVideoReady(true);
    setVideoError(false);
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

          {hasVideo && activeStoryVideoSrc && (
            <View className="video-stack">
              <Video
                key={`${activeStoryVideoKey}:${activeStoryVideoSrc}`}
                id={STORY_VIDEO_ID}
                className={`cat-video story-video ${isPlayingStoryVideo ? 'active' : ''} ${isPlayingStoryVideo && !storyVideoReady ? 'loading' : ''}`}
                src={activeStoryVideoSrc}
                muted
                showFullscreenBtn={false}
                showPlayBtn={false}
                showCenterPlayBtn={false}
                controls={false}
                enableProgressGesture={false}
                enablePlayGesture={false}
                autoplay={isPlayingStoryVideo}
                initialTime={0}
                objectFit="cover"
                onPlay={() => handleVideoPlay(activeStoryVideoKey)}
                onEnded={handleActiveVideoEnded}
                onError={() => handleVideoError(activeStoryVideoKey)}
              />

              <CoverView
                className="story-touch-layer"
                data-testid="story-touch-layer"
                onClick={handleMainTap}
              />
            </View>
          )}

          {videoError && (
            <CoverView className="video-error-overlay">
              <CoverView className="video-error-title">视频暂时无法播放</CoverView>
              <CoverView className="video-error-desc">网络波动，请稍后重试</CoverView>
              <CoverView className="retry-btn" onClick={handleRetryVideo}>
                <CoverView className="retry-btn-text">重试播放</CoverView>
              </CoverView>
            </CoverView>
          )}

          <HomeCoverBubble
            text={bubbleText}
            visible={bubbleVisible}
            exiting={bubbleExiting}
          />

          {pointsToast && (
            <CoverView className="points-toast">
              <CoverView className="points-toast-text">{pointsToast}</CoverView>
            </CoverView>
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
