import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Image, Button, Input, Textarea, Video } from '@tarojs/components';
import CatAvatar from '../../components/common/CatAvatar';
import Taro from '@tarojs/taro';
import { storage, DiaryEntry, FriendDiaryEntry, mediaStorage } from '../../services/storage';

// Lucide-style PNG icons
const USERPLUS_GRAY = require('../../assets/profile-icons/userplus-gray.png');
const PLUS_WHITE = require('../../assets/profile-icons/plus-white.png');
const HEART_GRAY = require('../../assets/profile-icons/heart-gray.png');
const HEART_RED = require('../../assets/profile-icons/heart-red.png');
const MESSAGE_GRAY = require('../../assets/profile-icons/message-gray.png');
const SHARE_GRAY = require('../../assets/profile-icons/share-gray.png');
const TRASH2_GRAY = require('../../assets/profile-icons/trash2-gray.png');
const TRASH2_RED = require('../../assets/profile-icons/trash2-red.png');
const X_DARK = require('../../assets/profile-icons/x-dark.png');
const X_WHITE = require('../../assets/profile-icons/x-white.png');
const IMAGE_GRAY = require('../../assets/profile-icons/image-gray.png');
const FILM_GRAY = require('../../assets/profile-icons/film-gray.png');
import { friendService } from '../../services/friendService';
import './index.less';

interface DiaryWithMedia extends DiaryEntry {
  mediaUrl?: string;
}

type FriendDiaryWithMedia = FriendDiaryEntry & { mediaUrl?: string };

// 微信小程序分享配置
const shareConfig = {
  onShareAppMessage: function (res: any) {
    if (res.from === 'button') {
      // 来自页面内转发按钮
      console.log(res.target);
    }
    return {
      title: 'Miao - 记录猫咪的美好时光',
      path: '/pages/diary/index',
      imageUrl: '' // 可以设置分享图片
    };
  },
  onShareTimeline: function () {
    return {
      title: 'Miao - 记录猫咪的美好时光',
      query: '',
      imageUrl: ''
    };
  }
};

export default function Diary() {
  const [diaries, setDiaries] = useState<DiaryWithMedia[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [newContent, setNewContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video'; tempFilePath?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'friends'>('mine');
  const [friendDiaries, setFriendDiaries] = useState<FriendDiaryWithMedia[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  // 添加好友相关状态 - v2
  const [showAddFriendMenu, setShowAddFriendMenu] = useState<boolean>(false);
  const [addFriendStep, setAddFriendStep] = useState<number>(1);
  const [selectedCatForQR, setSelectedCatForQR] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [catList, setCatList] = useState<{ id: string; name: string; avatar: string }[]>([]);

  // 加载媒体文件
  const loadMediaForDiary = async <T extends DiaryEntry>(diary: T): Promise<T & { mediaUrl?: string }> => {
    if (!diary.media) {
      return { ...diary, mediaUrl: '' };
    }

    try {
      if (diary.media.startsWith('miao_media:')) {
        const mediaId = diary.media.replace('miao_media:', '');
        const mediaData = await mediaStorage.getMedia(mediaId);
        return { ...diary, mediaUrl: mediaData || '' };
      }

      if (diary.media.startsWith('data:')) {
        const cacheId = `remote_${diary.id}`;
        await mediaStorage.saveMedia(cacheId, diary.media);
        const mediaData = await mediaStorage.getMedia(cacheId);
        return { ...diary, mediaUrl: mediaData || diary.media };
      }

      return { ...diary, mediaUrl: diary.media };
    } catch (e) {
      console.error('加载媒体失败:', e);
      return { ...diary, mediaUrl: diary.media || '' };
    }
  };

  useEffect(() => {
    loadDiaries();
  }, []);

  useEffect(() => {
    if (!showCompose) {
      setKeyboardHeight(0);
      return;
    }

    const handleKeyboardHeightChange = (res: Taro.onKeyboardHeightChange.CallbackResult) => {
      setKeyboardHeight(Math.max(0, res.height || 0));
    };

    Taro.onKeyboardHeightChange(handleKeyboardHeightChange);
    return () => {
      Taro.offKeyboardHeightChange(handleKeyboardHeightChange);
      setKeyboardHeight(0);
    };
  }, [showCompose]);

  const loadDiaries = async () => {
    const activeCatId = storage.getActiveCatId();
    const catList = storage.getCatList();
    const currentCat = catList.find(c => c.id === activeCatId);
    setActiveCat(currentCat ? { id: currentCat.id, name: currentCat.name, avatar: currentCat.avatar } : null);
    setCatList(catList);

    const list = storage.getDiaries();
    if (list.some(d => d.media?.startsWith('miao_media:'))) {
      storage.saveDiaries(list);
    }

    // 按当前活跃猫咪过滤日记
    const filteredList = activeCatId ? list.filter(d => d.catId === activeCatId) : list;

    // 加载每个日记的媒体文件
    const diariesWithMedia = await Promise.all(filteredList.map(loadMediaForDiary));
    setDiaries(diariesWithMedia);

    try {
      await friendService.syncFriends();
      await friendService.syncFriendDiaries();
    } catch (error) {
      console.warn('同步好友动态失败:', error);
    }

    const friendsList = storage.getFriendDiaries();
    const friendsWithMedia = await Promise.all(friendsList.map(loadMediaForDiary));
    setFriendDiaries(friendsWithMedia);
  };

  // 选择图片
  const chooseImage = () => {
    Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        setSelectedMedia({
          url: tempFile.tempFilePath,
          type: 'image',
          tempFilePath: tempFile.tempFilePath
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        Taro.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  };

  // 选择视频
  const chooseVideo = () => {
    Taro.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success: (res) => {
        const tempFile = res.tempFiles[0];
        // 检查视频大小（限制 20MB）
        if (tempFile.size && tempFile.size > 20 * 1024 * 1024) {
          Taro.showToast({ title: '视频不能超过20MB', icon: 'none' });
          return;
        }
        setSelectedMedia({
          url: tempFile.tempFilePath,
          type: 'video',
          tempFilePath: tempFile.tempFilePath
        });
      },
      fail: (err) => {
        console.error('选择视频失败:', err);
        Taro.showToast({ title: '选择视频失败', icon: 'none' });
      }
    });
  };

  // 清除已选媒体
  const clearMedia = () => {
    setSelectedMedia(null);
  };

  const handleAddDiary = async () => {
    if (!newContent.trim() && !selectedMedia) {
      Taro.showToast({ title: '请填写内容或选择媒体', icon: 'none' });
      return;
    }

    setIsLoading(true);

    try {
      const diaryId = 'diary_' + Date.now();
      let mediaUrl: string | undefined;
      let mediaType: 'image' | 'video' | undefined;

      // 如果有媒体文件，保存到本地文件系统
      if (selectedMedia?.tempFilePath) {
        mediaType = selectedMedia.type;

        // 读取文件为 base64
        const fs = Taro.getFileSystemManager();
        const fileData = fs.readFileSync(selectedMedia.tempFilePath, 'base64');

        // 保存到媒体存储
        await mediaStorage.saveMedia(diaryId, `data:${selectedMedia.type === 'image' ? 'image/jpeg' : 'video/mp4'};base64,${fileData}`);
        mediaUrl = `miao_media:${diaryId}`;
      }

      const newDiary: DiaryEntry = {
        id: diaryId,
        catId: storage.getActiveCatId() || '',
        content: newContent,
        media: mediaUrl,
        mediaType: mediaType,
        createdAt: Date.now(),
        likes: 0,
        isLiked: false,
        comments: []
      };

      const updated = [newDiary, ...diaries];
      const success = storage.saveDiaries(updated);

      if (success) {
        setDiaries(updated);
        setNewContent('');
        setSelectedMedia(null);
        setShowCompose(false);
        Taro.showToast({ title: '发布成功', icon: 'success' });
        // 刷新日记列表
        loadDiaries();
      } else {
        Taro.showToast({ title: '存储空间不足', icon: 'none' });
      }
    } catch (error) {
      console.error('发布日记失败:', error);
      Taro.showToast({ title: '发布失败，请重试', icon: 'none' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = (diaryId: string) => {
    if (activeTab === 'mine') {
      const updated = diaries.map(d => {
        if (d.id === diaryId) {
          return {
            ...d,
            isLiked: !d.isLiked,
            likes: d.isLiked ? d.likes - 1 : d.likes + 1
          };
        }
        return d;
      });
      // 转换为 DiaryEntry 类型保存（去掉 mediaUrl）
      const toSave: DiaryEntry[] = updated.map(({ mediaUrl, ...rest }) => rest);
      storage.saveDiaries(toSave);
      setDiaries(updated);
    } else {
      // 好友动态点赞
      const updated = friendDiaries.map(d => {
        if (d.id === diaryId) {
          return {
            ...d,
            isLiked: !d.isLiked,
            likes: d.isLiked ? d.likes - 1 : d.likes + 1
          };
        }
        return d;
      });
      storage.saveFriendDiaries(updated);
      setFriendDiaries(updated);
    }
  };

  // 添加评论
  const handleAddComment = () => {
    if (!commentText.trim() || !commentingId) return;

    const newComment = {
      id: 'comment_' + Date.now(),
      content: commentText.trim()
    };

    if (activeTab === 'mine') {
      // 我的记录 - 更新本地存储
      const updated = diaries.map(d => {
        if (d.id === commentingId) {
          return {
            ...d,
            comments: [...d.comments, newComment]
          };
        }
        return d;
      });

      // 转换为 DiaryEntry 类型保存
      const toSave: DiaryEntry[] = updated.map(({ mediaUrl, ...rest }) => rest);
      storage.saveDiaries(toSave);
      setDiaries(updated);
    } else {
      // 好友动态 - 更新好友日记存储
      const updated = friendDiaries.map(d => {
        if (d.id === commentingId) {
          return {
            ...d,
            comments: [...d.comments, newComment]
          };
        }
        return d;
      });

      storage.saveFriendDiaries(updated);
      setFriendDiaries(updated);
    }

    setCommentText('');
    setCommentingId(null);
    Taro.showToast({ title: '评论成功', icon: 'success' });
  };

  // 删除日记
  const handleDeleteDiary = (diaryId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条日记吗？删除后无法恢复。',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          storage.deleteDiary(diaryId);
          setDiaries(prev => prev.filter(d => d.id !== diaryId));
          setDeletingId(null);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  // 删除评论
  const handleDeleteComment = (diaryId: string, commentId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      confirmColor: '#ff6b3d',
      success: (res) => {
        if (res.confirm) {
          const updated = diaries.map(d => {
            if (d.id === diaryId) {
              return {
                ...d,
                comments: d.comments.filter(c => c.id !== commentId)
              };
            }
            return d;
          });

          // 转换为 DiaryEntry 类型保存
          const toSave: DiaryEntry[] = updated.map(({ mediaUrl, ...rest }) => rest);
          storage.saveDiaries(toSave);
          setDiaries(updated);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 分享功能
  const handleShare = (diary: DiaryWithMedia) => {
    // 微信小程序分享
    Taro.showShareMenu({
      withShareTicket: true,
    });

    // 设置分享内容
    Taro.showToast({ title: '点击右上角分享', icon: 'none' });
    setSharingId(diary.id);
  };

  // 使用微信小程序原生分享
  useEffect(() => {
    if (sharingId) {
      // 配置分享参数
      Taro.showShareMenu({
        withShareTicket: true,
      });
    }
  }, [sharingId]);

  return (
    <View className="diary-page">
      <View className="header">
        <View className="header-title">
          <Text className="title">日常记录</Text>
          <Text className="subtitle">DAILY MOMENTS</Text>
        </View>
        <View className="header-actions">
          <View className="friend-btn" onClick={() => setShowAddFriendMenu(true)}>
            <Image className="icon-img" src={USERPLUS_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
          </View>
          <View className="add-btn" onClick={() => setShowCompose(true)}>
            <Image className="icon-img" src={PLUS_WHITE} mode="aspectFit" style={{ width: 28, height: 28 }} />
          </View>
        </View>
      </View>

      {/* Tab 切换 */}
      <View className="tab-bar">
        <View
          className={`tab-item ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          <Text className="tab-text">我的记录</Text>
          {activeTab === 'mine' && <View className="tab-indicator" />}
        </View>
        <View
          className={`tab-item ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          <Text className="tab-text">好友动态</Text>
          {activeTab === 'friends' && <View className="tab-indicator" />}
        </View>
      </View>

      <View className="diary-list">
        {activeTab === 'mine' ? (
          // 我的记录
          diaries.length === 0 ? (
            <View className="empty">
              <Text className="empty-text">还没有记录</Text>
              <Text className="empty-hint">
                还没有关于 {activeCat?.name || '猫咪'} 的记录，快去分享你们的第一个温暖瞬间吧～
              </Text>
            </View>
          ) : (
            diaries.map((diary) => (
              <View key={diary.id} className="diary-item">
                <View className="diary-header">
                  <Image className="avatar" src={storage.getUserInfo()?.avatar || ''} mode="aspectFill" />
                  <View className="user-info">
                    <Text className="username">{storage.getUserInfo()?.nickname || '未知'}</Text>
                    <Text className="time">{formatTime(diary.createdAt)}</Text>
                  </View>
                </View>

                <Text className="diary-content">{diary.content}</Text>

                {diary.mediaUrl && (
                  diary.mediaType === 'video' ? (
                    <Video
                      className="diary-media"
                      src={diary.mediaUrl}
                      poster={activeCat?.avatar || diary.mediaUrl}
                      controls
                      showPlayBtn
                      objectFit="cover"
                    />
                  ) : (
                    <Image
                      className="diary-media"
                      src={diary.mediaUrl}
                      mode="aspectFill"
                    />
                  )
                )}

                <View className="diary-actions">
                  <View className={`action-btn ${diary.isLiked ? 'liked' : ''}`} onClick={() => handleLike(diary.id)}>
                    <Image className="icon-img" src={diary.isLiked ? HEART_RED : HEART_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                    <Text>{diary.likes}</Text>
                  </View>
                  <View className="action-btn" onClick={() => setCommentingId(diary.id)}>
                    <Image className="icon-img" src={MESSAGE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                    <Text>{diary.comments.length}</Text>
                  </View>
                  <View className="action-btn" onClick={() => handleShare(diary)}>
                    <Image className="icon-img" src={SHARE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                  </View>
                  <View className="action-btn delete-btn" onClick={() => setDeletingId(diary.id)}>
                    <Image className="icon-img" src={TRASH2_GRAY} mode="aspectFit" style={{ width: 18, height: 18 }} />
                  </View>
                </View>

                {/* 评论列表 */}
                {diary.comments.length > 0 && (
                  <View className="comments-section">
                    {diary.comments.map((comment) => (
                      <View key={comment.id} className="comment-item">
                        <Text className="comment-content">{comment.content}</Text>
                        <View className="comment-delete" onClick={() => handleDeleteComment(diary.id, comment.id)}>
                          <Image className="icon-img" src={X_DARK} mode="aspectFit" style={{ width: 16, height: 16 }} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )
        ) : (
          // 好友动态
          friendDiaries.length === 0 ? (
            <View className="empty">
              <Text className="empty-text">还没有好友动态</Text>
              <Text className="empty-hint">快去添加好友，看看 TA 们的猫咪在做什么吧</Text>
            </View>
          ) : (
            friendDiaries.map((diary) => (
              <View key={diary.id} className="diary-item">
                <View className="diary-header">
                  <Image className="avatar" src={diary.authorAvatar || ''} mode="aspectFill" />
                  <View className="user-info">
                    <Text className="username">{diary.authorNickname || '好友'}</Text>
                    <Text className="time">{formatTime(diary.createdAt)}</Text>
                  </View>
                </View>

                <Text className="diary-content">{diary.content}</Text>

                {diary.mediaUrl && (
                  diary.mediaType === 'video' ? (
                    <Video
                      className="diary-media"
                      src={diary.mediaUrl}
                      poster={activeCat?.avatar || diary.mediaUrl}
                      controls
                      showPlayBtn
                      objectFit="cover"
                    />
                  ) : (
                    <Image
                      className="diary-media"
                      src={diary.mediaUrl}
                      mode="aspectFill"
                    />
                  )
                )}

                <View className="diary-actions">
                  <View className={`action-btn ${diary.isLiked ? 'liked' : ''}`} onClick={() => handleLike(diary.id)}>
                    <Image className="icon-img" src={diary.isLiked ? HEART_RED : HEART_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                    <Text>{diary.likes}</Text>
                  </View>
                  <View className="action-btn" onClick={() => setCommentingId(diary.id)}>
                    <Image className="icon-img" src={MESSAGE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                    <Text>{diary.comments.length}</Text>
                  </View>
                  <View className="action-btn" onClick={() => handleShare(diary)}>
                    <Image className="icon-img" src={SHARE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                  </View>
                </View>

                {/* 评论列表 */}
                {diary.comments.length > 0 && (
                  <View className="comments-section">
                    {diary.comments.map((comment) => (
                      <View key={comment.id} className="comment-item">
                        <Text className="comment-content">{comment.content}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          )
        )}
      </View>

      {showCompose && (
        <View className={`compose-modal ${keyboardHeight > 0 ? 'keyboard-open' : ''}`}>
          <View
            className="compose-content"
            style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px' }}
          >
            <View className="compose-header">
              <View className="compose-title-wrap">
                <Text className="compose-title">记录此刻</Text>
                <Text className="compose-subtitle">Capture the moment</Text>
              </View>
              <View className="close-btn" onClick={() => {
                setShowCompose(false);
                setSelectedMedia(null);
                setNewContent('');
              }}>
                <Image className="icon-img" src={X_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
              </View>
            </View>

            <View className="compose-body">
              <Textarea
                className="compose-input"
                placeholder="这一刻在想什么..."
                value={newContent}
                onInput={(e) => setNewContent(e.detail.value)}
                maxlength={500}
                focus
                autoFocus
                fixed
                adjustPosition={false}
                showConfirmBar={false}
                cursorSpacing={24}
                onFocus={(e) => setKeyboardHeight(Math.max(0, e.detail.height || 0))}
                onBlur={() => setKeyboardHeight(0)}
                onKeyboardHeightChange={(e) => setKeyboardHeight(Math.max(0, e.detail.height || 0))}
              />

              {/* 媒体预览区域 */}
              {selectedMedia && (
                <View className="media-preview">
                  {selectedMedia.type === 'video' ? (
                    <Video
                      className="preview-video"
                      src={selectedMedia.url}
                      controls={false}
                      showPlayBtn={false}
                      objectFit="cover"
                      autoplay
                      loop
                      muted
                    />
                  ) : (
                    <Image className="preview-image" src={selectedMedia.url} mode="aspectFill" />
                  )}
                  <View className="remove-media-btn" onClick={clearMedia}>
                    <Image className="icon-img" src={X_WHITE} mode="aspectFit" style={{ width: 16, height: 16 }} />
                  </View>
                </View>
              )}
            </View>

            <View className="compose-footer">
              {/* 媒体选择按钮 */}
              <View className="media-actions">
                <View className="media-btn" onClick={chooseImage}>
                  <Image className="icon-img" src={IMAGE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                </View>
                <View className="media-btn" onClick={chooseVideo}>
                  <Image className="icon-img" src={FILM_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                </View>
              </View>

              <Button
                className={`publish-btn ${isLoading ? 'loading' : ''}`}
                onClick={handleAddDiary}
                disabled={isLoading || (!newContent.trim() && !selectedMedia)}
              >
                {isLoading ? '发布中...' : '发布'}
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 删除确认弹窗 */}
      {deletingId && (
        <View className="delete-modal">
          <View className="delete-modal-mask" onClick={() => setDeletingId(null)} />
          <View className="delete-modal-content">
            <View className="delete-icon">
              <Image className="icon-img" src={TRASH2_RED} mode="aspectFit" style={{ width: 32, height: 32 }} />
            </View>
            <Text className="delete-title">确定删除吗？</Text>
            <Text className="delete-desc">确定要删除这条记录吗？删除后将无法找回。</Text>
            <View className="delete-actions">
              <Button className="delete-confirm-btn" onClick={() => handleDeleteDiary(deletingId)}>
                确定删除
              </Button>
              <Button className="delete-cancel-btn" onClick={() => setDeletingId(null)}>
                取消
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 评论输入弹窗 */}
      {commentingId && (
        <View className="comment-modal">
          <View className="comment-modal-mask" onClick={() => {
            setCommentingId(null);
            setCommentText('');
          }} />
          <View className="comment-modal-content">
            <View className="comment-modal-header">
              <Text className="comment-modal-title">写评论</Text>
              <View className="comment-modal-close" onClick={() => {
                setCommentingId(null);
                setCommentText('');
              }}>
                <Image className="icon-img" src={X_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
              </View>
            </View>
            <Input
              className="comment-input"
              placeholder="写下你的评论..."
              value={commentText}
              onInput={(e) => setCommentText(e.detail.value)}
              maxlength={100}
              focus
            />
            <View className="comment-modal-footer">
              <Text className="comment-count">{commentText.length}/100</Text>
              <Button
                className="comment-submit-btn"
                onClick={handleAddComment}
                disabled={!commentText.trim()}
              >
                发送
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 添加好友菜单 */}
      {showAddFriendMenu && (
        <View className="add-friend-modal">
          <View className="add-friend-mask" onClick={() => {
            setShowAddFriendMenu(false);
            setAddFriendStep(1);
          }} />
          <View className="add-friend-content">
            {addFriendStep === 1 ? (
              <>
                <View className="add-friend-header">
                  <Text className="add-friend-title">选择代表猫咪</Text>
                  <Text className="add-friend-subtitle">Select your cat representative</Text>
                </View>
                <View className="cat-grid">
                  {catList.length === 0 ? (
                    <View className="cat-empty">
                      <Text>还没有生成的猫咪哦</Text>
                    </View>
                  ) : (
                    catList.map((cat) => (
                      <View
                        key={cat.id}
                        className={`cat-item ${selectedCatForQR?.id === cat.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedCatForQR(cat);
                          setAddFriendStep(2);
                        }}
                      >
                        <CatAvatar src={cat.avatar} name={cat.name} className="cat-avatar" />
                        <Text className="cat-name">{cat.name}</Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            ) : (
              <>
                <View className="add-friend-header">
                  <Text className="add-friend-title">选择添加方式</Text>
                  <Text className="add-friend-subtitle">Choose addition method</Text>
                </View>
                <View className="add-method-grid">
                  <View
                    className="add-method-item"
                    onClick={() => {
                      setShowAddFriendMenu(false);
                      setAddFriendStep(1);
                      Taro.navigateTo({
                        url: `/pages/add-friend-qr/index?catId=${selectedCatForQR?.id}`
                      });
                    }}
                  >
                    <View className="add-method-icon qr-icon">
                      <Text className="method-icon-text">QR</Text>
                    </View>
                    <Text className="add-method-text">面对面添加</Text>
                  </View>
                </View>
                <View className="add-friend-back" onClick={() => setAddFriendStep(1)}>
                  <Text>返回上一步</Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}  
