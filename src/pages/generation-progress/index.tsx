import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Video } from '@tarojs/components';
import { navigateTo, navigateBack, reLaunch } from '@tarojs/taro';
import { Sparkles, CheckCircle, AlertCircle, ArrowRight } from '../../components/common/Icons';
import { VolcanoService, ACTION_PROMPTS } from '../../services/volcanoService';
import { FileManager } from '../../services/fileManager';
import { storage } from '../../services/storage';
import { isCatReady } from '../../services/catLifecycle';
import { useAuthContext } from '../../context/AuthContext';
import './index.less';

type Phase = 'generating' | 'confirm' | 'success' | 'error';

export default function GenerationProgress() {
  const { refreshCatStatus } = useAuthContext();

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
      // 没有猫咪数据，返回创建页
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

  const startGeneration = async (cat: NonNullable<typeof catRef.current>) => {
    try {
      setPhase('generating');
      setProgress(5);
      setStatusText('正在分析图片特征...');

      // 使用猫咪头像作为生成输入
      const imageUrl = cat.avatar;

      setProgress(10);
      setStatusText('正在生成核心待机视频...');

      // 提交视频生成任务
      const task = await VolcanoService.submitTask(imageUrl, ACTION_PROMPTS.idle);

      setProgress(30);
      setStatusText('正在生成待机视频 (已提交)...');

      // 轮询任务结果
      const videoUrl = await VolcanoService.pollTaskResult(
        task.id,
        (s) => {
          const statusMap: Record<string, string> = {
            'running': '正在生成待机视频...',
            'processing': '正在处理视频...',
            'queued': '排队等待中...',
          };
          setStatusText(statusMap[s] || `正在生成待机视频 (${s})...`);
          // 根据状态更新进度
          if (s === 'running' || s === 'processing') {
            setProgress(prev => Math.min(prev + 5, 85));
          }
        }
      );

      setProgress(90);
      setStatusText('正在同步视频资源...');

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
          // 提交下一个任务前等待 3 秒，避免限流
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
    // 如果正在生成，返回创建页
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
              <Sparkles size={48} />
            </View>
          </View>

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
            <View className={`step-item ${progress >= 5 ? 'active' : ''} ${progress > 5 ? 'done' : ''}`}>
              <View className={`step-dot ${progress > 5 ? 'done' : progress >= 5 ? 'active' : ''}`}>
                {progress > 5 ? <CheckCircle size={14} /> : <Text className="step-num">1</Text>}
              </View>
              <Text className="step-label">分析图片特征</Text>
            </View>
            <View className={`step-item ${progress >= 10 ? 'active' : ''} ${progress === 100 ? 'done' : ''}`}>
              <View className={`step-dot ${progress === 100 ? 'done' : progress >= 10 ? 'active' : ''}`}>
                {progress === 100 ? <CheckCircle size={14} /> : <Text className="step-num">2</Text>}
              </View>
              <Text className="step-label">生成核心待机动作</Text>
            </View>
            <View className={`step-item ${progress >= 100 ? 'active done' : ''}`}>
              <View className={`step-dot ${progress >= 100 ? 'done' : ''}`}>
                {progress >= 100 ? <CheckCircle size={14} /> : <Text className="step-num">3</Text>}
              </View>
              <Text className="step-label">同步到本地猫窝</Text>
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
              <Sparkles size={64} className="placeholder-icon" />
              <Text className="placeholder-text">生成完成！</Text>
            </View>
          )}

          {/* 确认对话框 */}
          {showConfirmDialog && (
            <View className="confirm-dialog-overlay">
              <View className="confirm-dialog">
                <View className="dialog-icon-box">
                  <Sparkles size={36} />
                </View>
                <Text className="dialog-title">我是你的梦中情猫吗？</Text>
                <Text className="dialog-desc">
                  形象已初步锁定！是否还需要解锁我更多动作（摸头、踩奶、玩耍）？
                </Text>
                <View className="dialog-actions">
                  <View className="dialog-btn primary" onClick={handleUnlockAll}>
                    <Text className="dialog-btn-text primary-text">是，全部解锁</Text>
                    <ArrowRight size={16} />
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
            <CheckCircle size={64} />
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
            <AlertCircle size={48} />
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
