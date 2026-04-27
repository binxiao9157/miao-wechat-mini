import { View, Text, Image, Button } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { ArrowLeft, Download } from 'lucide-react';
import './index.less';

export default function DownloadPage() {
  return (
    <View className="download-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">下载 App</Text>
        <View className="placeholder" />
      </View>

      <View className="content">
        <View className="qr-section">
          <Image
            className="qr-code"
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=miao-app-download"
            mode="aspectFit"
          />
          <Text className="hint">扫码下载 Miao App</Text>
        </View>

        <View className="features">
          <Text className="section-title">App 专属功能</Text>
          <View className="feature-item">
            <Text className="feature-icon">🎬</Text>
            <View className="feature-text">
              <Text className="feature-title">高清视频</Text>
              <Text className="feature-desc">更流畅的猫咪视频体验</Text>
            </View>
          </View>
          <View className="feature-item">
            <Text className="feature-icon">🔔</Text>
            <View className="feature-text">
              <Text className="feature-title">推送通知</Text>
              <Text className="feature-desc">及时收到猫咪动态提醒</Text>
            </View>
          </View>
          <View className="feature-item">
            <Text className="feature-icon">📴</Text>
            <View className="feature-text">
              <Text className="feature-title">离线模式</Text>
              <Text className="feature-desc">无网络也能陪伴猫咪</Text>
            </View>
          </View>
        </View>

        <Button className="download-btn">
          <Download size={20} />
          iOS 下载
        </Button>
        <Button className="download-btn android">
          <Download size={20} />
          Android 下载
        </Button>
      </View>
    </View>
  );
}