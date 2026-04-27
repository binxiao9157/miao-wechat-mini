import { useState, useEffect } from 'react';
import { View, Text, Image, Button, Progress } from '@tarojs/components';
import { navigateTo } from '@tarojs/taro';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { VolcanoService } from '../../services/volcanoService';
import { storage } from '../../services/storage';
import './index.less';

export default function GenerationProgress() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'generating' | 'success' | 'error'>('generating');
  const [resultImage, setResultImage] = useState<string>('');

  useEffect(() => {
    // 模拟生成进度
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('success');
          setResultImage('https://picsum.photos/seed/cat/400/400');
          return 100;
        }
        return prev + 10;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleViewResult = () => {
    navigateTo({ url: '/pages/home/index' });
  };

  const handleRetry = () => {
    setProgress(0);
    setStatus('generating');
  };

  return (
    <View className="generation-page">
      <View className="content">
        {status === 'success' ? (
          <>
            <View className="success-icon">
              <CheckCircle size={64} />
            </View>
            <Text className="title">生成完成！</Text>
            <Image className="result-image" src={resultImage} mode="aspectFill" />
            <Button className="view-btn" onClick={handleViewResult}>
              查看我的猫咪
            </Button>
          </>
        ) : (
          <>
            <View className="progress-circle">
              <Text className="progress-text">{progress}%</Text>
            </View>
            <Text className="title">AI 正在生成中...</Text>
            <Text className="status">
              {progress < 30 && '正在分析照片...'}
              {progress >= 30 && progress < 60 && '正在生成猫咪形象...'}
              {progress >= 60 && progress < 90 && '正在优化细节...'}
              {progress >= 90 && '即将完成...'}
            </Text>
            {status === 'error' && (
              <Button className="retry-btn" onClick={handleRetry}>
                <RefreshCw size={16} />
                重试
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );
}