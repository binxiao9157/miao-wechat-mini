import { View, Text, Image, Button } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
const X_PNG = require('../../assets/profile-icons/x-dark.png');
import { storage, FriendInfo } from '../../services/storage';
import { shareService } from '../../services/shareService';
import { request } from '../../utils/httpAdapter';
import CatAvatar from './CatAvatar';
import SharePoster from './SharePoster';
import './ShareSheet.less';

interface ShareSheetProps {
  visible: boolean;
  title?: string;
  text?: string;
  url?: string;
  isTabPage?: boolean;
  catName?: string;
  catAvatar?: string;
  mediaUrl?: string;
  onClose: () => void;
}

export default function ShareSheet({
  visible,
  title = '分享',
  text,
  url,
  isTabPage = false,
  catName,
  catAvatar,
  mediaUrl,
  onClose,
}: ShareSheetProps) {
  const [showPoster, setShowPoster] = useState(false);

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

  const handleShareToMoments = () => {
    setShowPoster(true);
  };

  const handleClosePoster = () => {
    setShowPoster(false);
  };

  return (
    <>
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

      <SharePoster
        visible={showPoster}
        catName={catName}
        catAvatar={catAvatar}
        content={text}
        mediaUrl={mediaUrl}
        onClose={handleClosePoster}
      />
    </>
  );
}