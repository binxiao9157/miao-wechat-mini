import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import PageHeader from '../../components/layout/PageHeader';

const DOWNLOAD_PRIMARY = require('../../assets/profile-icons/download-primary.png');
const DOWNLOAD_WHITE = require('../../assets/profile-icons/download-white.png');
const FILM_GRAY = require('../../assets/profile-icons/film-gray.png');
const BELL_PRIMARY = require('../../assets/profile-icons/bell-primary.png');

import './index.less';

export default function DownloadPage() {
  return (
    <View className="download-page">
      <PageHeader title="下载" />

      <View className="content">
        <View className="qr-section">
          <Image
            className="qr-code"
            src={DOWNLOAD_PRIMARY}
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

        <Button className="download-btn" onClick={() => Taro.showToast({ title: '即将上线，敬请期待', icon: 'none' })}>
          <Image className="icon-img" src={DOWNLOAD_WHITE} mode="aspectFit" style={{ width: 20, height: 20 }} />
          iOS 下载
        </Button>
        <Button className="download-btn android" onClick={() => Taro.showToast({ title: '即将上线，敬请期待', icon: 'none' })}>
          <Image className="icon-img" src={DOWNLOAD_PRIMARY} mode="aspectFit" style={{ width: 20, height: 20 }} />
          Android 下载
        </Button>
      </View>
    </View>
  );
}