import { View, Text, Image, Button } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';

const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const DOWNLOAD_PRIMARY = require('../../assets/profile-icons/download-primary.png');
const DOWNLOAD_WHITE = require('../../assets/profile-icons/download-white.png');
const FILM_GRAY = require('../../assets/profile-icons/film-gray.png');
const BELL_PRIMARY = require('../../assets/profile-icons/bell-primary.png');

import './index.less';

export default function DownloadPage() {
  return (
    <View className="download-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
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
            <View className="feature-icon"><Image className="icon-img" src={FILM_GRAY} mode="aspectFit" style={{ width: 28, height: 28 }} /></View>
            <View className="feature-text">
              <Text className="feature-title">高清视频</Text>
              <Text className="feature-desc">更流畅的猫咪视频体验</Text>
            </View>
          </View>
          <View className="feature-item">
            <View className="feature-icon"><Image className="icon-img" src={BELL_PRIMARY} mode="aspectFit" style={{ width: 28, height: 28 }} /></View>
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
          <Image className="icon-img" src={DOWNLOAD_WHITE} mode="aspectFit" style={{ width: 20, height: 20 }} />
          iOS 下载
        </Button>
        <Button className="download-btn android">
          <Image className="icon-img" src={DOWNLOAD_PRIMARY} mode="aspectFit" style={{ width: 20, height: 20 }} />
          Android 下载
        </Button>
      </View>
    </View>
  );
}