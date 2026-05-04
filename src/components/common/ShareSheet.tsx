import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
const X_PNG = require('../../assets/profile-icons/x-dark.png');
const WECHAT_PNG = require('../../assets/profile-icons/wechat-flat.png');
const MOMENTS_PNG = require('../../assets/profile-icons/moments-flat.png');
import './ShareSheet.less';

interface ShareSheetProps {
  visible: boolean;
  title?: string;
  text?: string;
  url?: string;
  isTabPage?: boolean;
  shareImagePath?: string;
  onClose: () => void;
}

export default function ShareSheet({ visible, title = '分享', text, url, isTabPage = false, shareImagePath, onClose }: ShareSheetProps) {
  if (!visible) return null;

  const shareTitle = text || 'Miao - 猫咪陪伴';
  const sharePath = url || '/pages/home/index';

  const handleShareToMoments = async () => {
    if (shareImagePath) {
      try {
        let localPath = shareImagePath;
        if (shareImagePath.startsWith('http://') || shareImagePath.startsWith('https://')) {
          const downloadRes = await Taro.downloadFile({ url: shareImagePath });
          if (downloadRes.tempFilePath) {
            localPath = downloadRes.tempFilePath;
          } else {
            throw new Error('download failed');
          }
        }
        await Taro.showShareImageMenu({ path: localPath });
        onClose();
        return;
      } catch (err) {
        console.warn('showShareImageMenu failed:', err);
        Taro.showToast({ title: '分享失败，请重试', icon: 'none' });
      }
    } else {
      Taro.showToast({ title: '分享图生成中，请稍后重试', icon: 'none' });
    }
    onClose();
  };

  return (
    <View className="share-sheet-overlay" onClick={onClose}>
      <View className={`share-sheet ${isTabPage ? 'tab-bar-safe' : ''}`} onClick={(e) => e.stopPropagation()}>
        <View className="sheet-header">
          <Text className="title">{title}</Text>
          <View className="close-btn" onClick={onClose}>
            <Image className="icon-img" src={X_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
          </View>
        </View>

        {/* 分享方式 */}
        <View className="share-options">
          <Button
            className="share-option-btn"
            openType="share"
            data-title={shareTitle}
            data-path={sharePath}
          >
            <View className="share-option">
              <View className="option-icon wechat">
                <Image className="option-icon-img" src={WECHAT_PNG} mode="aspectFit" />
              </View>
              <Text className="option-label">微信好友</Text>
            </View>
          </Button>

          <View className="share-option" onClick={handleShareToMoments}>
            <View className="option-icon moments">
              <Image className="option-icon-img" src={MOMENTS_PNG} mode="aspectFit" />
            </View>
            <Text className="option-label">微信朋友圈</Text>
          </View>
        </View>
      </View>
    </View>
  );
}