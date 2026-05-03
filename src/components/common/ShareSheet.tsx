import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
const X_PNG = require('../../assets/profile-icons/x-dark.png');
import { storage, FriendInfo } from '../../services/storage';
import { shareService } from '../../services/shareService';
import { request } from '../../utils/httpAdapter';
import CatAvatar from './CatAvatar';
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

  const friends: FriendInfo[] = storage.getFriends();
  const shareTitle = text || 'Miao - 猫咪陪伴';
  const sharePath = url || '/pages/home/index';

  const handleCopyLink = async () => {
    await shareService.copyToClipboard(sharePath);
    onClose();
  };

  const handleFriendShare = async (friend: FriendInfo) => {
    try {
      await request({
        url: '/api/v1/notifications',
        method: 'POST',
         data: {
          recipientId: friend.id,
          type: 'friend_share',
          title: '收到一条分享',
          content: `${friend.nickname} 向你分享了一篇日记`,
          catAvatar: friend.catAvatar || friend.avatar,
        },
      });
      Taro.showToast({ title: `已分享给 ${friend.nickname}`, icon: 'success' });
    } catch {
      Taro.showToast({ title: '分享失败，请重试', icon: 'none' });
    }
    onClose();
  };

  const handleShareToMoments = async () => {
    if (shareImagePath) {
      try {
        // showShareImageMenu 需要本地路径，如果是网络 URL 先下载
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
        console.warn('showShareImageMenu failed, fallback to guide:', err);
      }
    }
    // 无图片或 showShareImageMenu 失败时，引导用户使用右上角菜单
    Taro.showModal({
      title: '分享到朋友圈',
      content: '点击右上角 ··· 按钮，选择「分享到朋友圈」即可发布',
      showCancel: false,
      confirmText: '知道了',
    });
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

        {/* 好友列表 */}
        {friends.length > 0 && (
          <View className="friends-section">
            <Text className="section-label">分享给好友</Text>
            <View className="friends-scroll">
              {friends.slice(0, 8).map((friend) => (
                <View
                  key={friend.id}
                  className="friend-item"
                  onClick={() => handleFriendShare(friend)}
                >
                  <CatAvatar
                    src={friend.avatar}
                    name={friend.nickname}
                    className="friend-avatar"
                    mode="aspectFill"
                  />
                  <Text className="friend-name">{friend.nickname}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="share-divider" />

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
                <Text>💬</Text>
              </View>
              <Text className="option-label">微信好友</Text>
            </View>
          </Button>

          <View className="share-option" onClick={handleShareToMoments}>
            <View className="option-icon moments">
              <Text>🌐</Text>
            </View>
            <Text className="option-label">朋友圈</Text>
          </View>

          <View className="share-option" onClick={handleCopyLink}>
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