import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Video, Image } from '@tarojs/components';
import Taro, { navigateTo, navigateBack, reLaunch } from '@tarojs/taro';
import { VolcanoService, ACTION_PROMPTS } from '../../services/volcanoService';
import { FileManager } from '../../services/fileManager';
import { storage } from '../../services/storage';
import { isCatReady } from '../../services/catLifecycle';
import { useAuthContext } from '../../context/AuthContext';

const SPARKLES_GRAY = require('../../assets/profile-icons/sparkles-gray.png');
const SPARKLES_PRIMARY = require('../../assets/profile-icons/sparkles-primary.png');
const CHECKCIRCLE_GREEN = require('../../assets/profile-icons/checkcircle-green.png');
const ALERTCIRCLE_RED2 = require('../../assets/profile-icons/alertcircle-red2.png');
const ARROWRIGHT_PRIMARY2 = require('../../assets/profile-icons/arrowright-primary2.png');

import './index.less';

type Phase = 'generating' | 'confirm' | 'success' | 'error';

// 沉浸式状态文案轮播
const getImmersiveStatus = (p: number): string => {
  if (p < 20) return ['正在感知猫咪的灵魂印记...', '正在编织柔软的毛发肌理...'][Math.floor(p / 10) % 2];
  if (p < 50) return ['正在为你的专属伙伴注入生命力...', '正在捕捉最灵动的眼神...'][Math.floor((p - 20) / 15) % 2];
  if (p < 85) return ['正在教它如何撒娇和呼噜...', '正在为它布置舒适的数字猫窝...'][Math.floor((p - 50) / 17) % 2];
  return ['正在进行最后的魔法同步...', '嘘，它即将苏醒...'][Math.floor((p - 85) / 7) % 2];
};

export default function GenerationProgress() {
  const { refreshCatStatus } = useAuthContext();

  const router = Taro.getCurrentInstance().router;
  const isRedemption = router?.params?.isRedemption === '1';
  const redemptionAmount = Number(router?.params?.redemptionAmount) || 0;

  const [phase, setPhase] = useState<Phase>('generating');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('正在准备生成...');
  const [errorMsg, setErrorMsg] = useState('');
  const [idleVideoUrl, setIdleVideoUrl] = useState<string | null>(null);
  const [anchorImage, setAnchorImage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // 从 storage 获取刚创建的猫咪信息
  const catRef = useRef<{ id: string; name: string; breed: string; color: string; avatar: string; source: 'created' | 'uploaded' } | null>(null);

  useEffect(() => {
    const activeCat = storage.getActiveCat();
    if (!activeCat) {
      navigateBack();
      return;
    }
    if (isCatReady(activeCat)) {
      reLaunch({ url: '/pages/home/index' });
      return;
    }
    catRef.current = {
      id: activeCat.id,
      name: activeCat.name,
      breed: activeCat.breed,
      color: activeCat.color,
      avatar: activeCat.avatar,
      source: activeCat.source,
    };

    setAnchorImage(activeCat.avatar);
    startGeneration(activeCat);
  }, []);

  // 沉浸式状态文字自动轮播
  useEffect(() => {
    if (phase !== 'generating' || progress <= 0 || progress >= 100) return;
    const immersive = getImmersiveStatus(progress);
    if (statusText !== immersive && !statusText.includes('错误') && !statusText.includes('积分不足')) {
      setStatusText(immersive);
    }
  }, [progress, phase]);

  const startGeneration = async (cat: NonNullable<typeof catRef.current>) => {
    let pointsDeducted = 0;
    try {
      // 积分兑换时，在生成前扣除积分
      if (isRedemption && redemptionAmount > 0) {
        const success = storage.deductPoints(redemptionAmount, '解锁新伙伴');
        if (!success) {
          const currentPoints = storage.getPoints();
          throw new Error(`积分不足，需要 ${redemptionAmount} 积分，当前仅有 ${currentPoints.total} 积分`);
        }
        pointsDeducted = redemptionAmount;
      }

      setPhase('generating');
      setProgress(5);
      setStatusText('正在注入生命力...');

      const imageUrl = cat.avatar;

      setProgress(10);
      setStatusText('正在编织它的动作姿态...');

      // 提交视频生成任务
      const task = await VolcanoService.submitTask(imageUrl, ACTION_PROMPTS.idle);

      setProgress(30);
      setStatusText(getImmersiveStatus(30));

      // 轮询任务结果
      const videoUrl = await VolcanoService.pollTaskResult(
        task.id,
        (s) => {
          const statusMap: Record<string, string> = {
            'running': getImmersiveStatus(50),
            'processing': getImmersiveStatus(60),
            'queued': '排队等待中...',
          };
          setStatusText(statusMap[s] || getImmersiveStatus(50));
          if (s === 'running' || s === 'processing') {
            setProgress(prev => Math.min(prev + 5, 85));
          }
        }
      );

      setProgress(90);
      setStatusText('正在开启次元通道...');

      // 更新猫咪视频信息
      const finalVideoPaths = await FileManager.downloadVideos(
        { idle: videoUrl },
        cat.id,
        cat.name,
        cat.avatar,
        {
          breed: cat.breed,
          furColor: cat.color,
          source: cat.source === 'uploaded' ? 'upload' : cat.source,
          placeholderImage: cat.avatar,
          anchorFrame: cat.avatar,
        }
      );
      const playableIdleVideoUrl = finalVideoPaths.idle || videoUrl;
      setIdleVideoUrl(playableIdleVideoUrl);

      // 确认保存成功
      const saved = storage.getCatById(cat.id);
      if (!saved) throw new Error('猫咪数据保存失败');
      storage.setActiveCatId(cat.id);
      refreshCatStatus();

      setProgress(100);
      setStatusText('生成成功！');
      setPhase('confirm');

      // 短暂延迟后显示确认对话框
      setTimeout(() => {
        setShowConfirmDialog(true);
      }, 1500);

    } catch (err: any) {
      // 生成失败时退还积分
      if (pointsDeducted > 0) {
        storage.addPoints(pointsDeducted, '生成失败退还');
      }
      console.error('生成过程出错:', err);
      setPhase('error');
      setErrorMsg(err.message || '生成失败，请重试');
    }
  };

  const handleUnlockAll = async () => {
    if (!idleVideoUrl || !catRef.current) return;

    const cat = catRef.current;
    setIsUnlocking(true);

    reLaunch({ url: '/pages/home/index' });

    // 串行提交视频生成任务，避免触发 DashScope rate limit
    const secondaryActions: (keyof typeof ACTION_PROMPTS)[] = ['tail', 'rubbing', 'blink'];
    try {
      await FileManager.updateCatVideos(cat.id, {}, true);

      const anchorFrame = anchorImage || cat.avatar;
      for (const action of secondaryActions) {
        try {
          const task = await VolcanoService.submitTask(anchorFrame, ACTION_PROMPTS[action]);
          const videoUrl = await VolcanoService.pollTaskResult(task.id);
          await FileManager.updateCatVideos(cat.id, { [action]: videoUrl }, true);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
          console.error(`动作 ${action} 生成失败:`, e);
        }
      }

      await FileManager.updateCatVideos(cat.id, {}, false);
    } catch (e) {
      console.error('后台生成任务失败:', e);
      await FileManager.updateCatVideos(cat.id, {}, false);
    }
  };

  const handleStayBasic = () => {
    reLaunch({ url: '/pages/home/index' });
  };

  const handleRetry = () => {
    setPhase('generating');
    setProgress(0);
    setErrorMsg('');
    setIdleVideoUrl(null);
    setShowConfirmDialog(false);

    if (catRef.current) {
      startGeneration(catRef.current);
    } else {
      navigateBack();
    }
  };

  const handleGoBack = () => {
    navigateTo({ url: '/pages/create-companion/index' });
  };

  return (
    <View className="generation-progress-page">
      {/* 生成中状态 */}
      {phase === 'generating' && (
        <View className="generating-view">
          {/* 旋转加载动画 */}
          <View className="loading-spinner">
            <View className="spinner-ring" />
            <View className="spinner-icon">
              <Image className="icon-img" src={SPARKLES_GRAY} mode="aspectFit" style={{ width: 48, height: 48 }} />
            </View>
          </View>

          <Text className="status-subtitle">AWAKENING DIGITAL LIFE</Text>
          <Text className="status-title">{statusText}</Text>

          {/* 进度条 */}
          <View className="progress-bar-wrapper">
            <View className="progress-bar-bg">
              <View className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </View>
          </View>

          <Text className="progress-hint">
            {progress < 100 ? '请耐心等待，魔法正在发生...' : '即将完成'}
          </Text>

          {/* 步骤列表 */}
          <View className="steps-list">
            <View className={`step-item ${progress >= 5 ? 'active' : ''} ${progress > 30 ? 'done' : ''}`}>
              <View className={`step-dot ${progress > 30 ? 'done' : progress >= 5 ? 'active' : ''}`}>
                {progress > 30 ? <Image className="icon-img" src={CHECKCIRCLE_GREEN} mode="aspectFit" style={{ width: 14, height: 14 }} /> : <Text className="step-num">1</Text>}
              </View>
              <Text className="step-label">构筑灵魂基石</Text>
            </View>
            <View className={`step-item ${progress >= 30 ? 'active' : ''} ${progress >= 90 ? 'done' : ''}`}>
              <View className={`step-dot ${progress >= 90 ? 'done' : progress >= 30 ? 'active' : ''}`}>
                {progress >= 90 ? <Image className="icon-img" src={CHECKCIRCLE_GREEN} mode="aspectFit" style={{ width: 14, height: 14 }} /> : <Text className="step-num">2</Text>}
              </View>
              <Text className="step-label">注入生命律动</Text>
            </View>
            <View className={`step-item ${progress >= 100 ? 'active done' : ''}`}>
              <View className={`step-dot ${progress >= 100 ? 'done' : ''}`}>
                {progress >= 100 ? <Image className="icon-img" src={CHECKCIRCLE_GREEN} mode="aspectFit" style={{ width: 14, height: 14 }} /> : <Text className="step-num">3</Text>}
              </View>
              <Text className="step-label">魔法连接完成</Text>
            </View>
          </View>
        </View>
      )}

      {/* 确认状态 - 视频预览 + 确认对话框 */}
      {phase === 'confirm' && (
        <View className="confirm-view">
          {/* 视频预览 */}
          {idleVideoUrl ? (
            <Video
              className="preview-video"
              src={idleVideoUrl}
              autoplay
              loop
              muted
              showFullscreenBtn={false}
              showPlayBtn={false}
              showCenterPlayBtn={false}
              controls={false}
              objectFit="contain"
            />
          ) : (
            <View className="preview-placeholder">
              <Image className="icon-img placeholder-icon" src={SPARKLES_GRAY} mode="aspectFit" style={{ width: 64, height: 64 }} />
              <Text className="placeholder-text">生成完成！</Text>
            </View>
          )}

          {/* 确认对话框 */}
          {showConfirmDialog && (
            <View className="confirm-dialog-overlay">
              <View className="confirm-dialog">
                <View className="dialog-icon-box">
                  <Image className="icon-img" src={SPARKLES_PRIMARY} mode="aspectFit" style={{ width: 36, height: 36 }} />
                </View>
                <Text className="dialog-title">我是你的梦中情猫吗？</Text>
                <Text className="dialog-desc">
                  形象已初步锁定！是否还需要解锁我更多动作（摸头、踩奶、玩耍）？
                </Text>
                <View className="dialog-actions">
                  <View className="dialog-btn primary" onClick={handleUnlockAll}>
                    <Text className="dialog-btn-text primary-text">是，全部解锁</Text>
                    <Image className="icon-img" src={ARROWRIGHT_PRIMARY2} mode="aspectFit" style={{ width: 16, height: 16 }} />
                  </View>
                  <View className="dialog-btn secondary" onClick={handleStayBasic}>
                    <Text className="dialog-btn-text secondary-text">否，就这样吧</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 成功状态 */}
      {phase === 'success' && (
        <View className="success-view">
          <View className="success-icon">
            <Image className="icon-img" src={CHECKCIRCLE_GREEN} mode="aspectFit" style={{ width: 64, height: 64 }} />
          </View>
          <Text className="success-title">生成完成！</Text>
          <Text className="success-desc">你的数字猫咪已经准备好了</Text>
          <View className="success-btn" onClick={handleStayBasic}>
            <Text className="success-btn-text">查看我的猫咪</Text>
          </View>
        </View>
      )}

      {/* 错误状态 */}
      {phase === 'error' && (
        <View className="error-view">
          <View className="error-icon">
            <Image className="icon-img" src={ALERTCIRCLE_RED2} mode="aspectFit" style={{ width: 48, height: 48 }} />
          </View>
          <Text className="error-title">生成遇到问题</Text>
          <Text className="error-desc">{errorMsg}</Text>
          <View className="error-actions">
            <View className="error-btn retry" onClick={handleRetry}>
              <Text className="error-btn-text">重新尝试</Text>
            </View>
            <View className="error-btn back" onClick={handleGoBack}>
              <Text className="error-btn-text back-text">返回创建页</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}