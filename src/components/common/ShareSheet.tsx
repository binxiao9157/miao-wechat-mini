import { View, Text } from '@tarojs/components';
import { X } from '../../components/common/Icons';
import { shareService } from '../../services/shareService';
import './index.less';

interface ShareSheetProps {
  visible: boolean;
  title?: string;
  text?: string;
  url?: string;
  onClose: () => void;
}

export default function ShareSheet({ visible, title = '分享', text, url, onClose }: ShareSheetProps) {
  if (!visible) return null;

  const handleShare = async (method: 'wechat' | 'moments' | 'copy') => {
    if (method === 'copy') {
      await shareService.copyToClipboard(url || '');
    }
    onClose();
  };

  return (
    <View className="share-sheet-overlay" onClick={onClose}>
      <View className="share-sheet" onClick={(e) => e.stopPropagation()}>
        <View className="sheet-header">
          <Text className="title">{title}</Text>
          <View className="close-btn" onClick={onClose}>
            <X size={20} />
          </View>
        </View>

        <View className="share-options">
          <View className="share-option" onClick={() => handleShare('wechat')}>
            <View className="option-icon wechat">
              <Text>💬</Text>
            </View>
            <Text className="option-label">微信好友</Text>
          </View>

          <View className="share-option" onClick={() => handleShare('moments')}>
            <View className="option-icon moments">
              <Text>🌐</Text>
            </View>
            <Text className="option-label">朋友圈</Text>
          </View>

          <View className="share-option" onClick={() => handleShare('copy')}>
            <View className="option-icon link">
              <Text>🔗</Text>
            </View>
            <Text className="option-label">复制链接</Text>
          </View>
        </View>
      </View>
    </View>
  );
}