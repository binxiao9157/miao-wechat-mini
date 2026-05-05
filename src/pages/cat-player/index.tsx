import React, { useState, useEffect } from 'react';
import { View, Text, Video, Image } from '@tarojs/components';
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import PageHeader from '../../components/layout/PageHeader';

const PLAY_WHITE = require('../../assets/profile-icons/play-white.png');
const DOWNLOAD_PRIMARY = require('../../assets/profile-icons/download-primary.png');
const TRASH2_RED2 = require('../../assets/profile-icons/trash2-red2.png');
const HEART_GRAY = require('../../assets/profile-icons/heart-gray.png');
const SHARE_GRAY = require('../../assets/profile-icons/share-gray.png');
const ALERTCIRCLE_RED2 = require('../../assets/profile-icons/alertcircle-red2.png');
import { storage, CatInfo } from '../../services/storage';
import { FileManager } from '../../services/fileManager';
import { getPrimaryVideoUrl } from '../../services/catLifecycle';
import './index.less';

export default function CatPlayer() {
  const navSpace = useNavSpace();
  const router = useRouter();
  const catId = router.params.id || '';

  const [cat, setCat] = useState<CatInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  useShareAppMessage(() => ({
    title: cat ? `来看看${cat.name}的AI猫咪视频！` : 'Miao - AI猫咪视频',
    path: catId ? `/pages/cat-player/index?id=${catId}` : '/pages/home/index',
  }));

  useShareTimeline(() => ({
    title: cat ? `${cat.name}的AI猫咪视频` : 'Miao - AI猫咪视频',
  }));

  useEffect(() => {
    Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] } as any);
    if (!catId) {
      Taro.navigateBack();
      return;
    }
    const list = storage.getCatList();
    const found = list.find(c => c.id === catId);
    if (found) {
      setCat(found);
    } else {
      setErrorDetails('找不到该猫咪的数据记录');
    }

    // 视频加载超时保护
    const loadTimeout = setTimeout(() => {
      setIsLoading(prev => {
        if (prev) setErrorDetails('视频加载超时，请检查网络后重试');
        return false;
      });
    }, 30000);

    return () => {
      clearTimeout(loadTimeout);
    };
  }, [catId]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  const handleSaveToAlbum = () => {
    if (!cat?.videoPath && !cat?.remoteVideoUrl) {
      triggerToast('暂无可保存的视频');
      return;
    }

    const videoUrl = cat.videoPath || cat.remoteVideoUrl || '';
    if (videoUrl.startsWith('http')) {
      Taro.downloadFile({
        url: videoUrl,
        success: (downloadRes) => {
          if (downloadRes.statusCode === 200) {
            Taro.saveVideoToPhotosAlbum({
              filePath: downloadRes.tempFilePath,
              success: () => triggerToast('已保存到相册'),
              fail: () => triggerToast('保存失败，请检查相册权限'),
            });
          }
        },
        fail: () => triggerToast('下载视频失败'),
      });
    } else {
      Taro.saveVideoToPhotosAlbum({
        filePath: videoUrl,
        success: () => triggerToast('已保存到相册'),
        fail: () => triggerToast('保存失败，请检查相册权限'),
      });
    }
  };

  const handleShare = () => {
    Taro.showToast({ title: '点击右上角「转发」分享', icon: 'none' });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!catId) return;
    FileManager.deleteVideo(catId);
    setShowDeleteConfirm(false);
    Taro.navigateBack();
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleRetry = () => {
    setErrorDetails(null);
    setIsLoading(true);
  };

  if (!cat) {
    return (
      <View className="cat-player-page">
        <View className="loading-view">
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    );
  }

  const videoSrc = cat.videoPaths?.petting || getPrimaryVideoUrl(cat);
  const createdDate = cat.id.includes('_')
    ? new Date(parseInt(cat.id.split('_')[1])).toLocaleDateString()
    : '';

  return (
    <View className="cat-player-page" style={navSpace as React.CSSProperties}>
      {/* Toast */}
      {showToast && (
        <View className="toast">
          <Text className="toast-text">{showToast}</Text>
        </View>
      )}

      {/* 错误提示 */}
      {errorDetails && (
        <View className="error-overlay">
          <View className="error-dialog">
            <View className="error-icon-box">
              <Image className="icon-img" src={ALERTCIRCLE_RED2} mode="aspectFit" style={{ width: 32, height: 32 }} />
            </View>
            <Text className="error-title">视频加载失败</Text>
            <Text className="error-desc">网络波动或视频文件暂时无法访问，请重试。</Text>
            <View className="error-actions">
              <View className="error-btn primary" onClick={handleRetry}>
                <Text className="error-btn-text white">重试</Text>
              </View>
              <View className="error-btn secondary" onClick={() => Taro.reLaunch({ url: '/pages/home/index' })}>
                <Text className="error-btn-text dark">返回首页</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <View className="delete-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <View className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <View className="delete-icon-box">
              <Image className="icon-img" src={TRASH2_RED2} mode="aspectFit" style={{ width: 32, height: 32 }} />
            </View>
            <Text className="delete-title">确定要删除吗？</Text>
            <Text className="delete-desc">删除后将无法找回这个猫咪视频，确定要继续吗？</Text>
            <View className="delete-actions">
              <View className="delete-btn cancel" onClick={() => setShowDeleteConfirm(false)}>
                <Text className="delete-btn-text">取消</Text>
              </View>
              <View className="delete-btn confirm" onClick={confirmDelete}>
                <Text className="delete-btn-text white">确定删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 顶部导航栏 */}
      <PageHeader title="猫咪播放" />

      {/* 视频播放器 */}
      <View className="video-area" onClick={togglePlay}>
        {/* 背景模糊 */}
        {cat.avatar && (
          <View className="video-bg">
            <View className="video-bg-image" style={{ backgroundImage: `url(${cat.avatar})` }} />
            <View className="video-bg-overlay" />
          </View>
        )}

        {videoSrc ? (
          <Video
            className="player-video"
            src={videoSrc}
            autoplay
            loop
            muted
            showFullscreenBtn={false}
            showPlayBtn={false}
            showCenterPlayBtn={false}
            controls={false}
            objectFit="contain"
            onPlay={() => { setIsPlaying(true); setIsLoading(false); }}
            onPause={() => setIsPlaying(false)}
            onLoadedMetaData={() => { setIsLoading(false); setErrorDetails(null); }}
            onError={() => { setErrorDetails('视频格式不支持或链接失效'); setIsLoading(false); }}
          />
        ) : (
          <View className="no-video-placeholder">
            <Text className="no-video-text">暂无视频</Text>
          </View>
        )}

        {/* 加载指示器 */}
        {isLoading && videoSrc && (
          <View className="loading-indicator">
            <View className="loading-ring" />
          </View>
        )}

        {/* 暂停指示器 */}
        {!isPlaying && !isLoading && (
          <View className="pause-indicator">
            <View className="pause-btn-circle">
              <Image className="icon-img" src={PLAY_WHITE} mode="aspectFit" style={{ width: 32, height: 32 }} />
            </View>
          </View>
        )}
      </View>

      {/* 底部操作栏 */}
      <View className="player-footer">
        <View className="footer-info">
          <View className="footer-tags">
            <View className="breed-tag">
              <Text className="breed-tag-text">{cat.breed}</Text>
            </View>
            {createdDate && (
              <Text className="footer-date">生成于 {createdDate}</Text>
            )}
          </View>
          <Text className="footer-desc">这是您的专属 AI 猫咪，它会永远陪伴在您身边喵~</Text>
        </View>

        <View className="footer-actions-side">
          <View className="action-item" onClick={() => triggerToast('已喜欢')}>
            <View className="action-circle">
              <Image className="icon-img" src={HEART_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
            </View>
            <Text className="action-label">喜欢</Text>
          </View>
          <View className="action-item" onClick={handleShare}>
            <View className="action-circle">
              <Image className="icon-img" src={SHARE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
            </View>
            <Text className="action-label">分享</Text>
          </View>
        </View>

        <View className="footer-btns">
          <View className="footer-btn save" onClick={handleSaveToAlbum}>
            <Image className="icon-img" src={DOWNLOAD_PRIMARY} mode="aspectFit" style={{ width: 18, height: 18 }} />
            <Text className="footer-btn-text">保存到相册</Text>
          </View>
          <View className="footer-btn delete" onClick={handleDelete}>
            <Image className="icon-img" src={TRASH2_RED2} mode="aspectFit" style={{ width: 18, height: 18 }} />
            <Text className="footer-btn-text">删除记录</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
