import { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Video, Button, RichText } from '@tarojs/components';
import { navigateBack, navigateTo } from '@tarojs/taro';
import { ArrowLeft, Play, Pause, Download, Trash2 } from 'lucide-react';
import { storage, CatInfo } from '../../services/storage';
import { FileManager } from '../../services/fileManager';
import './index.less';

export default function CatPlayer() {
  const [cat, setCat] = useState<CatInfo | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('idle');
  const videoRef = useRef<any>(null);

  useEffect(() => {
    const activeCat = storage.getActiveCat();
    if (activeCat) {
      setCat(activeCat);
    } else {
      navigateTo({ url: '/pages/emptyCat/index' });
    }
    setIsLoading(false);
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleActionChange = (action: string) => {
    setCurrentAction(action);
    const videoUrl = cat?.videoPaths?.[action] || cat?.videoPath;
    if (videoUrl) {
      setIsPlaying(true);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (cat) {
      FileManager.deleteVideo(cat.id);
    }
    navigateTo({ url: '/pages/home/index' });
  };

  const handleSaveToAlbum = () => {
    // 微信小程序保存到相册需要使用保存图片到相册API
    // 这里显示提示
    console.log('Save to album');
  };

  if (!cat) {
    return (
      <View className="cat-player-page">
        <Text>加载中...</Text>
      </View>
    );
  }

  const videoUrl = cat.videoPaths?.[currentAction] || cat.videoPath || cat.remoteVideoUrl;

  return (
    <View className="cat-player-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">{cat.name}</Text>
        <View className="more-btn" onClick={handleDelete}>
          <Trash2 size={20} />
        </View>
      </View>

      <View className="video-container" onClick={() => setShowControls(!showControls)}>
        {isLoading ? (
          <View className="loading">
            <Text>视频加载中...</Text>
          </View>
        ) : videoUrl ? (
          <Video
            ref={videoRef}
            className="video-player"
            src={videoUrl}
            autoplay={isPlaying}
            loop
            controls={showControls}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <Image
            className="cat-avatar"
            src={cat.avatar || cat.placeholderImage || ''}
            mode="aspectFill"
          />
        )}
      </View>

      <View className="actions-bar">
        <View className={`action-item ${currentAction === 'idle' ? 'active' : ''}`} onClick={() => handleActionChange('idle')}>
          <Text>🐱 待机</Text>
        </View>
        <View className={`action-item ${currentAction === 'tail' ? 'active' : ''}`} onClick={() => handleActionChange('tail')}>
          <Text>👋 摇尾</Text>
        </View>
        <View className={`action-item ${currentAction === 'rubbing' ? 'active' : ''}`} onClick={() => handleActionChange('rubbing')}>
          <Text>🐾 踩奶</Text>
        </View>
        <View className={`action-item ${currentAction === 'blink' ? 'active' : ''}`} onClick={() => handleActionChange('blink')}>
          <Text>👀 眨眼</Text>
        </View>
      </View>

      <View className="control-bar">
        <Button className="control-btn" onClick={togglePlay}>
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </Button>
        <Button className="control-btn" onClick={handleSaveToAlbum}>
          <Download size={24} />
        </Button>
      </View>

      <View className="cat-info">
        <Text className="cat-name">{cat.name}</Text>
        <Text className="cat-desc">{cat.breed} · {cat.color}</Text>
      </View>

      {showDeleteConfirm && (
        <View className="modal-overlay">
          <View className="modal-content">
            <Text className="modal-title">确认删除</Text>
            <Text className="modal-desc">确定要删除这只猫咪吗？此操作不可恢复。</Text>
            <View className="modal-actions">
              <Button className="modal-btn cancel" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
              <Button className="modal-btn confirm" onClick={confirmDelete}>删除</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}