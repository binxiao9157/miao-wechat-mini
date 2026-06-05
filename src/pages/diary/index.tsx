import React, { useRef } from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Image, Button, Input, Textarea, Video, Canvas, ScrollView } from '@tarojs/components';
import CatAvatar from '../../components/common/CatAvatar';
import Taro, { useShareAppMessage, useShareTimeline, useDidShow } from '@tarojs/taro';
import { storage, DiaryEntry, FriendDiaryEntry, mediaStorage, persistDiaryMediaFileForPublish } from '../../services/storage';
import { useNavSpace } from '../../hooks/useNavSpace';
import { generateShareCard } from '../../utils/shareCard';
import ShareSheet from '../../components/common/ShareSheet';
import ConfirmModal from '../../components/common/ConfirmModal';
import DiaryCard from '../../components/common/DiaryCard';
import { useManagedTimeout } from '../../hooks/useManagedTimeout';
import { navigateTo, reLaunch } from '../../utils/navigateAdapter';
import { ensurePrivacyAuthorized } from '../../utils/privacyAuthorization';
import { checkMediaContent, checkTextContent } from '../../services/contentSafetyService';

// Lucide-style PNG icons
const USERPLUS_GRAY = require('../../assets/profile-icons/userplus-gray.png');
const PLUS_WHITE = require('../../assets/profile-icons/plus-white.png');
const TRASH2_RED = require('../../assets/profile-icons/trash2-red.png');
const X_DARK = require('../../assets/profile-icons/x-dark.png');
const X_WHITE = require('../../assets/profile-icons/x-white.png');
const IMAGE_GRAY = require('../../assets/profile-icons/image-outlined.svg');
const FILM_GRAY = require('../../assets/profile-icons/video-outlined.svg');
const SEND_ICON = require('../../assets/profile-icons/send-primary.png');
import { friendService } from '../../services/friendService';
import { del } from '../../utils/httpAdapter';
import './index.less';

interface DiaryWithMedia extends DiaryEntry {
  mediaUrl?: string;
  imageUrls?: string[];
  catName?: string;
}

type FriendDiaryWithMedia = FriendDiaryEntry & { mediaUrl?: string; imageUrls?: string[] };
type SelectedMedia = { url: string; type: 'image' | 'video'; tempFilePath?: string };

const getApiBaseURL = () => (process.env.TARO_APP_API_BASE_URL || 'https://www.mmdd10.tech').replace(/\/$/, '');

const normalizeRemoteMediaUrl = (url: string): string => {
  if (!url.startsWith('/')) return url;
  return `${getApiBaseURL()}${url}`;
};

export default function Diary() {
  const navSpace = useNavSpace();
  const [isSinglePage, setIsSinglePage] = useState(false);
  const [diaries, setDiaries] = useState<DiaryWithMedia[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [newContent, setNewContent] = useState('');
  const [selectedMediaList, setSelectedMediaList] = useState<SelectedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentActionSheet, setCommentActionSheet] = useState<{ diaryId: string; commentId: string; content: string; canDelete: boolean; top: number; left: number } | null>(null);
  const scrollViewRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'friends'>('mine');
  const [refreshing, setRefreshing] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [tabDirection, setTabDirection] = useState<'left' | 'right'>('right');
  const [friendDiaries, setFriendDiaries] = useState<FriendDiaryWithMedia[]>([]);
  const [activeCat, setActiveCat] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [sharingDiary, setSharingDiary] = useState<DiaryWithMedia | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareCardPath, setShareCardPath] = useState('');
  const { setManagedTimeout } = useManagedTimeout();

  // 用 ref 持久化分享数据，确保 useShareTimeline/useShareAppMessage 在 ShareSheet 关闭后仍能读取
  const sharingDiaryRef = useRef<DiaryWithMedia | null>(null);
  const activeCatRef = useRef<{ id: string; name: string; avatar?: string } | null>(null);
  const shareCardPathRef = useRef<string>('');

  // 同步 activeCat 到 ref
  useEffect(() => { activeCatRef.current = activeCat; }, [activeCat]);

  // 自定义 setSharingDiary：同时更新 ref
  const updateSharingDiary = (d: DiaryWithMedia | null) => {
    setSharingDiary(d);
    sharingDiaryRef.current = d;
  };

  // 生成分享卡片图片
  const generateShareCardImage = async (diary: DiaryWithMedia): Promise<string> => {
    try {
      const path = await generateShareCard({
        canvasId: 'diaryShareCard',
        catName: activeCat?.name || '猫咪',
        catAvatar: activeCat?.avatar,
        content: diary.content,
        mediaUrl: diary.mediaUrl,
        createdAt: diary.createdAt,
        logoUrl: require('../../assets/logo.png'),
      });
      shareCardPathRef.current = path;
      setShareCardPath(path);
      return path;
    } catch (err) {
      console.error('Generate share card failed:', err);
      const fallback = diary.mediaUrl || activeCat?.avatar || '';
      shareCardPathRef.current = fallback;
      setShareCardPath(fallback);
      return fallback;
    }
  };

  useShareAppMessage(() => {
    const d = sharingDiaryRef.current;
    if (d) {
      const content = d.content.length > 30 ? d.content.slice(0, 30) + '...' : d.content;
      return {
        title: `${d.catName || '猫咪'}的日常：${content}`,
        path: `/pages/diary/index?id=${d.id}`,
      };
    }
    return {
      title: 'Miao - 记录猫咪的美好时光',
      path: '/pages/diary/index',
    };
  });

  useShareTimeline(() => {
    const d = sharingDiaryRef.current;
    const cat = activeCatRef.current;
    if (d) {
      const content = d.content.length > 20 ? d.content.slice(0, 20) + '...' : d.content;
      const result: any = {
        title: `${d.catName || '猫咪'}的日常：${content}`,
        query: `id=${d.id}`,
      };
      // 优先使用 Canvas 生成的分享卡片图，其次用原图
      if (shareCardPathRef.current) {
        result.imageUrl = shareCardPathRef.current;
      } else if (d.mediaUrl) {
        result.imageUrl = d.mediaUrl;
      } else if (cat?.avatar) {
        result.imageUrl = cat.avatar;
      }
      return result;
    }
    const result: any = { title: cat ? `来和${cat.name}一起玩吧！` : 'Miao - 记录猫咪的美好时光' };
    if (cat?.avatar) result.imageUrl = cat.avatar;
    return result;
  });

  // 添加好友相关状态 - v2
  const [showAddFriendMenu, setShowAddFriendMenu] = useState<boolean>(false);
  const [addFriendStep, setAddFriendStep] = useState<number>(1);
  const [selectedCatForQR, setSelectedCatForQR] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [catList, setCatList] = useState<{ id: string; name: string; avatar: string }[]>([]);

  const resolveDiaryMediaUrl = async (media?: string, cacheId?: string): Promise<string> => {
    if (!media) return '';
    try {
      if (media.startsWith('miao_media:')) {
        const mediaId = media.replace('miao_media:', '');
        const mediaData = await mediaStorage.getMedia(mediaId);
        return mediaData || '';
      }

      if (media.startsWith('data:')) {
        const stableCacheId = cacheId || `remote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await mediaStorage.saveMedia(stableCacheId, media);
        const mediaData = await mediaStorage.getMedia(stableCacheId);
        return mediaData || media;
      }

      return normalizeRemoteMediaUrl(media);
    } catch (e) {
      console.error('加载媒体失败:', e);
      return media || '';
    }
  };

  // 加载媒体文件
  const loadMediaForDiary = async <T extends DiaryEntry>(diary: T): Promise<T & { mediaUrl?: string; imageUrls?: string[] }> => {
    const imageRefs = diary.images && diary.images.length > 0
      ? diary.images
      : (diary.mediaType !== 'video' && diary.media ? [diary.media] : []);
    const imageUrls = imageRefs.length > 0
      ? (await Promise.all(imageRefs.map((image, index) => resolveDiaryMediaUrl(image, `remote_${diary.id}_img_${index}`)))).filter(Boolean)
      : [];
    const mediaUrl = diary.mediaType === 'video'
      ? await resolveDiaryMediaUrl(diary.media, `remote_${diary.id}`)
      : (imageUrls[0] || '');

    return {
      ...diary,
      mediaUrl,
      imageUrls,
    };
  };

  const persistDisplayedDiaries = (updatedVisible: DiaryWithMedia[]): DiaryEntry[] => {
    const updatedById = new Map<string, DiaryEntry>(
      updatedVisible.map(({ mediaUrl, imageUrls, ...rest }) => [rest.id, rest])
    );
    const allDiaries = storage.getDiaries();
    const merged = allDiaries.map(d => updatedById.get(d.id) || d);
    for (const diary of updatedById.values()) {
      if (!allDiaries.some(d => d.id === diary.id)) {
        merged.unshift(diary);
      }
    }
    storage.saveDiaries(merged.sort((a, b) => b.createdAt - a.createdAt));
    return Array.from(updatedById.values());
  };

  // 静默同步好友动态（交互后刷新，不阻塞 UI）
  const syncFriendDiariesQuiet = () => {
    friendService.syncFriendDiaries().then(async () => {
      const fresh = storage.getFriendDiaries();
      const freshWithMedia = await Promise.all(fresh.map(loadMediaForDiary));
      setFriendDiaries(freshWithMedia);
    }).catch((error) => {
      console.warn('[Diary] quiet friend diary sync failed:', error);
    });
  };

  useEffect(() => {
    loadDiaries();
    Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] } as any);

    // 检测单页模式（从朋友圈点击进入，scene === 1154）
    try {
      const launchOptions = Taro.getLaunchOptionsSync();
      setIsSinglePage(launchOptions.scene === 1154);
    } catch (error) {
      console.warn('[Diary] get launch options failed:', error);
    }

    // 1 分钟轮询好友动态
    const intervalId = setInterval(() => {
      syncFriendDiariesQuiet();
    }, 60 * 1000);
    return () => clearInterval(intervalId);
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

  // 弹窗打开时隐藏 TabBar，关闭时恢复
  useEffect(() => {
    if (commentingId || showCompose || showShareSheet || deletingId !== null) {
      Taro.eventCenter.trigger('tabbar:hide');
    } else {
      Taro.eventCenter.trigger('tabbar:show');
    }
  }, [commentingId, showCompose, showShareSheet, deletingId]);

  // 页面卸载时恢复 TabBar
  useEffect(() => {
    return () => {
      Taro.eventCenter.trigger('tabbar:show');
    };
  }, []);

  // 切回页面时确保 TabBar 显示（overlay 层 z-index > tab bar 所以不影响）
  useDidShow(() => {
    Taro.eventCenter.trigger('tabbar:show');
    Taro.eventCenter.trigger('tabbar:route', 'pages/diary/index');
  });

  const loadDiaries = async () => {
    const activeCatId = storage.getActiveCatId();
    const catList = storage.getCatList();
    const currentCat = catList.find(c => c.id === activeCatId);
    setActiveCat(currentCat ? { id: currentCat.id, name: currentCat.name, avatar: currentCat.avatar } : null);
    setCatList(catList);

    const list = storage.getDiaries();

    // 按当前活跃猫咪过滤日记
    const filteredList = activeCatId ? list.filter(d => d.catId === activeCatId) : list;

    // 加载每个日记的媒体文件
    const diariesWithMedia = await Promise.all(filteredList.map(loadMediaForDiary));
    setDiaries(diariesWithMedia);

    try {
      // 同步自己的日记（获取最新 likes/comments）
      const username = storage.getUserInfo()?.username;
      if (username) {
        await storage.syncFromServer(username);
      }
      await friendService.syncFriends();
      await friendService.syncFriendDiaries();
    } catch (error) {
      console.warn('同步数据失败:', error);
    }

    // 同步后重新加载日记（likes/comments 已更新）
    const syncedDiaries = storage.getDiaries();
    const syncedFiltered = activeCatId ? syncedDiaries.filter(d => d.catId === activeCatId) : syncedDiaries;
    const syncedWithMedia = await Promise.all(syncedFiltered.map(loadMediaForDiary));
    setDiaries(syncedWithMedia);

    const friendsList = storage.getFriendDiaries();
    const friendsWithMedia = await Promise.all(friendsList.map(loadMediaForDiary));
    setFriendDiaries(friendsWithMedia);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDiaries();
    } finally {
      setRefreshing(false);
    }
  };

  // 选择图片
  const chooseImage = async () => {
    if (!await ensurePrivacyAuthorized('选择日记图片')) return;
    const currentImages = selectedMediaList.filter(item => item.type === 'image');
    const hasVideo = selectedMediaList.some(item => item.type === 'video');
    if (hasVideo) {
      Taro.showToast({ title: '已选择视频时不能添加图片', icon: 'none' });
      return;
    }
    const maxCount = 9 - currentImages.length;
    if (maxCount <= 0) {
      Taro.showToast({ title: '最多只能选择9张图片', icon: 'none' });
      return;
    }
    Taro.chooseMedia({
      count: maxCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const added = res.tempFiles.slice(0, maxCount).map((tempFile) => ({
          url: tempFile.tempFilePath,
          type: 'image' as const,
          tempFilePath: tempFile.tempFilePath,
        }));
        setSelectedMediaList([...currentImages, ...added]);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        Taro.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  };

  // 选择视频
  const chooseVideo = async () => {
    if (!await ensurePrivacyAuthorized('选择日记视频')) return;
    if (selectedMediaList.length > 0) {
      Taro.showToast({ title: selectedMediaList[0].type === 'image' ? '已选择图片时不能添加视频' : '已选择视频', icon: 'none' });
      return;
    }
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
        setSelectedMediaList([{
          url: tempFile.tempFilePath,
          type: 'video',
          tempFilePath: tempFile.tempFilePath
        }]);
      },
      fail: (err) => {
        console.error('选择视频失败:', err);
        Taro.showToast({ title: '选择视频失败', icon: 'none' });
      }
    });
  };

  // 清除已选媒体
  const clearMedia = () => {
    setSelectedMediaList([]);
  };

  const removeSelectedImage = (index: number) => {
    setSelectedMediaList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddDiary = async () => {
    if (!newContent.trim() && selectedMediaList.length === 0) {
      Taro.showToast({ title: '请填写内容或选择媒体', icon: 'none' });
      return;
    }

    setIsLoading(true);

    try {
      await checkTextContent(newContent, 'diary');
      for (const media of selectedMediaList) {
        if (media.tempFilePath) {
          await checkMediaContent(media.tempFilePath, media.type, 'diary');
        }
      }
      const diaryId = 'diary_' + Date.now();
      let mediaUrl: string | undefined;
      let mediaType: 'image' | 'video' | undefined;
      const images: string[] = [];

      // 如果有媒体文件，保存到本地文件系统
      if (selectedMediaList.length > 0) {
        const isVideo = selectedMediaList[0].type === 'video';
        mediaType = isVideo ? 'video' : 'image';

        if (isVideo) {
          const video = selectedMediaList[0];
          if (video.tempFilePath) {
            mediaUrl = await persistDiaryMediaFileForPublish(diaryId, video.tempFilePath, 'video/mp4');
          }
        } else {
          for (let i = 0; i < selectedMediaList.length; i += 1) {
            const image = selectedMediaList[i];
            if (!image.tempFilePath) continue;
            const mediaId = `${diaryId}_img_${i}`;
            const imageRef = await persistDiaryMediaFileForPublish(mediaId, image.tempFilePath, 'image/jpeg');
            images.push(imageRef);
          }
          mediaUrl = images[0];
        }
      }

      const newDiary: DiaryEntry = {
        id: diaryId,
        catId: storage.getActiveCatId() || '',
        content: newContent,
        media: mediaUrl,
        mediaType: mediaType,
        images: images.length > 0 ? images : undefined,
        createdAt: Date.now(),
        likes: 0,
        isLiked: false,
        comments: []
      };

      const allDiaries = storage.getDiaries();
      const updatedAll = [newDiary, ...allDiaries].sort((a, b) => b.createdAt - a.createdAt);
      const success = storage.saveDiaries(updatedAll);

      if (success) {
        const displayDiary = await loadMediaForDiary(newDiary);
        setDiaries(prev => [displayDiary, ...prev]);
        setNewContent('');
        setSelectedMediaList([]);
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

  const handleLike = async (diaryId: string) => {
    if (activeTab === 'mine') {
      // 自己的日记：乐观更新 + API 同步
      setDiaries(prev => {
        const updated = prev.map(d => {
          if (d.id === diaryId) {
            return { ...d, isLiked: !d.isLiked, likes: d.isLiked ? d.likes - 1 : d.likes + 1 };
          }
          return d;
        });
        persistDisplayedDiaries(updated);
        return updated;
      });
      try {
        const result = await friendService.likeDiary(diaryId);
        setDiaries(prev => {
          const corrected = prev.map(d => {
            if (d.id === diaryId) return { ...d, isLiked: result.liked, likes: result.likes };
            return d;
          });
          persistDisplayedDiaries(corrected);
          return corrected;
        });
        // 点赞成功后同步数据，获取好友的点赞/评论最新状态
        syncFriendDiariesQuiet();
      } catch {
        setDiaries(prev => {
          const rolled = prev.map(d => {
            if (d.id === diaryId) {
              return { ...d, isLiked: !d.isLiked, likes: d.isLiked ? d.likes - 1 : d.likes + 1 };
            }
            return d;
          });
          persistDisplayedDiaries(rolled);
          return rolled;
        });
      }
    } else {
      // 好友动态点赞：乐观更新 + API 同步
      setFriendDiaries(prev => {
        const updated = prev.map(d => {
          if (d.id === diaryId) {
            return { ...d, isLiked: !d.isLiked, likes: d.isLiked ? d.likes - 1 : d.likes + 1 };
          }
          return d;
        });
        storage.saveFriendDiaries(updated);
        return updated;
      });
      try {
        const result = await friendService.likeDiary(diaryId);
        setFriendDiaries(prev => {
          const corrected = prev.map(d => {
            if (d.id === diaryId) return { ...d, isLiked: result.liked, likes: result.likes };
            return d;
          });
          storage.saveFriendDiaries(corrected);
          return corrected;
        });
        // 点赞成功后同步好友动态，获取最新互动数据
        syncFriendDiariesQuiet();
      } catch {
        setFriendDiaries(prev => {
          const rolled = prev.map(d => {
            if (d.id === diaryId) {
              return { ...d, isLiked: !d.isLiked, likes: d.isLiked ? d.likes - 1 : d.likes + 1 };
            }
            return d;
          });
          storage.saveFriendDiaries(rolled);
          return rolled;
        });
      }
    }
  };

  // 添加评论
  const handleAddComment = async () => {
    if (!commentText.trim() || !commentingId) return;

    const content = commentText.trim();
    try {
      await checkTextContent(content, 'comment');
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '评论内容不合规', icon: 'none' });
      return;
    }
    const targetId = commentingId;
    setCommentText('');
    setCommentingId(null);
    resetScrollView();

    if (activeTab === 'mine') {
      try {
        const serverComment = await friendService.commentDiary(targetId, content);
        setDiaries(prev => {
          const updated = prev.map(d => {
            if (d.id === targetId) {
              return { ...d, comments: [...d.comments, serverComment || { id: `comment_${Date.now()}`, content }] };
            }
            return d;
          });
          persistDisplayedDiaries(updated);
          return updated;
        });
        Taro.showToast({ title: '评论成功', icon: 'success' });
        syncFriendDiariesQuiet();
      } catch {
        Taro.showToast({ title: '评论失败', icon: 'none' });
      }
    } else {
      try {
        const serverComment = await friendService.commentDiary(targetId, content);
        setFriendDiaries(prev => {
          const updated = prev.map(d => {
            if (d.id === targetId) {
              return { ...d, comments: [...d.comments, serverComment || { id: `comment_${Date.now()}`, content }] };
            }
            return d;
          });
          storage.saveFriendDiaries(updated);
          return updated;
        });
        Taro.showToast({ title: '评论成功', icon: 'success' });
        // 评论成功后同步好友动态，获取最新互动数据
        syncFriendDiariesQuiet();
      } catch {
        Taro.showToast({ title: '评论失败', icon: 'none' });
      }
    }
  };

  // 删除日记
  const handleDeleteDiary = (diaryId: string) => {
    storage.deleteDiary(diaryId);
    setDiaries(prev => prev.filter(d => d.id !== diaryId));
    setDeletingId(null);
    Taro.showToast({ title: '已删除', icon: 'success' });
    // 同步删除到服务端
    del(`/api/v1/diaries/${diaryId}`).catch(() => {});
  };

  // 删除评论
  const handleDeleteComment = (diaryId: string, commentId: string) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      confirmColor: '#ff6b3d',
      success: (res) => {
        if (res.confirm) {
          // 判断是我的日记还是好友动态
          if (activeTab === 'mine') {
            setDiaries(prev => {
              const updated = prev.map(d => {
                if (d.id === diaryId) {
                  return { ...d, comments: d.comments.filter(c => c.id !== commentId) };
                }
                return d;
              });
              persistDisplayedDiaries(updated);
              return updated;
            });
          } else {
            setFriendDiaries(prev => {
              const updated = prev.map(d => {
                if (d.id === diaryId) {
                  return { ...d, comments: d.comments.filter(c => c.id !== commentId) };
                }
                return d;
              });
              storage.saveFriendDiaries(updated);
              return updated;
            });
          }
          // 同步删除到服务端
          del(`/api/v1/diaries/${diaryId}/comments/${commentId}`).catch(() => {});
          // 删除后同步好友动态，确保对方也能看到评论更新
          syncFriendDiariesQuiet();
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 评论弹窗关闭后重置 ScrollView 滚动位置，防止布局错位
  const resetScrollView = () => {
    setScrollTop(1);
    setManagedTimeout(() => setScrollTop(0), 50);
  };

  // 分享功能
  const handleShare = async (diary: DiaryWithMedia) => {
    updateSharingDiary(diary);
    // 先生成分享卡片图，再打开面板，确保朋友圈按钮可用
    await generateShareCardImage(diary);
    setShowShareSheet(true);
  };

  return (
    <View className="diary-page" style={navSpace as React.CSSProperties}>
      <ScrollView
        className="diary-list"
        scrollY
        showScrollbar={false}
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={onRefresh}
        scrollTop={scrollTop}
        onScroll={() => { if (scrollTop !== 0) setScrollTop(0); }}
      >
        <View className="header">
          <View className="header-title">
            <Text className="title-main">日常记录</Text>
            <Text className="title-sub">DAILY MOMENTS</Text>
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
            onClick={() => { setTabDirection('left'); setActiveTab('mine'); }}
          >
            <Text className="tab-text">我的记录</Text>
            {activeTab === 'mine' && <View className="tab-indicator" />}
          </View>
          <View
            className={`tab-item ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => { setTabDirection('right'); setActiveTab('friends'); }}
          >
            <Text className="tab-text">好友动态</Text>
            {activeTab === 'friends' && <View className="tab-indicator" />}
          </View>
        </View>

        <View className={`tab-content tab-slide-${tabDirection}`}>
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
              <DiaryCard
                key={diary.id}
                diary={{
                  ...diary,
                  authorAvatar: storage.getUserInfo()?.avatar || '',
                  authorNickname: storage.getUserInfo()?.nickname || '未知',
                  isFriendDiary: false,
                }}
                currentUserId={storage.getUserInfo()?.username}
                activeCatAvatar={activeCat?.avatar}
                onLike={handleLike}
                onComment={setCommentingId}
                onShare={(id) => {
                  const d = diaries.find(d => d.id === id);
                  if (d) handleShare(d);
                }}
                onDelete={setDeletingId}
                onCommentLongPress={(diaryId, commentId, content, canDelete, top, left) => {
                  setCommentActionSheet({ diaryId, commentId, content, canDelete, top, left });
                }}
                formatTime={formatTime}
              />
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
              <DiaryCard
                key={diary.id}
                diary={{
                  ...diary,
                  isFriendDiary: true,
                }}
                currentUserId={storage.getUserInfo()?.username}
                activeCatAvatar={activeCat?.avatar}
                onLike={handleLike}
                onComment={setCommentingId}
                onShare={(id) => {
                  const d = friendDiaries.find(d => d.id === id);
                  if (d) handleShare(d);
                }}
                onCommentLongPress={(diaryId, commentId, content, canDelete, top, left) => {
                  setCommentActionSheet({ diaryId, commentId, content, canDelete, top, left });
                }}
                formatTime={formatTime}
              />
            ))
          )
        )}
        </View>
      </ScrollView>

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
                setSelectedMediaList([]);
                setNewContent('');
              }}>
                <Image className="icon-img" src={X_DARK} mode="aspectFit" style={{ width: 20, height: 20 }} />
              </View>
            </View>

            <View className="compose-body">
              <Textarea
                className="compose-input"
                placeholder="这一刻在想什么..."
                placeholderStyle="color: #8E8E8E"
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
              {selectedMediaList.length > 0 && (
                <View className={selectedMediaList[0].type === 'video' ? 'media-preview' : 'image-preview-grid'}>
                  {selectedMediaList[0].type === 'video' ? (
                    <Video
                      className="preview-video"
                      src={selectedMediaList[0].url}
                      controls={false}
                      showPlayBtn={false}
                      objectFit="cover"
                      autoplay
                      loop
                      muted
                    />
                  ) : (
                    selectedMediaList.map((media, idx) => (
                      <View key={`${media.url}-${idx}`} className="image-preview-item">
                        <Image className="preview-image" src={media.url} mode="aspectFill" />
                        <View className="remove-media-btn" onClick={() => removeSelectedImage(idx)}>
                          <Image className="icon-img" src={X_WHITE} mode="aspectFit" style={{ width: 14, height: 14 }} />
                        </View>
                      </View>
                    ))
                  )}
                  {selectedMediaList[0].type === 'video' && (
                    <View className="remove-media-btn" onClick={clearMedia}>
                      <Image className="icon-img" src={X_WHITE} mode="aspectFit" style={{ width: 16, height: 16 }} />
                    </View>
                  )}
                  {selectedMediaList[0].type === 'image' && selectedMediaList.length < 9 && (
                    <View className="add-image-tile" onClick={chooseImage}>
                      <Image className="icon-img" src={IMAGE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                      <Text>添加图片</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View className="compose-footer">
              {/* 媒体选择按钮 */}
              <View className="media-actions">
                <View className={`media-btn ${selectedMediaList.some(item => item.type === 'video') || selectedMediaList.length >= 9 ? 'disabled' : ''}`} onClick={chooseImage}>
                  <Image className="icon-img" src={IMAGE_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                </View>
                <View className={`media-btn ${selectedMediaList.length > 0 ? 'disabled' : ''}`} onClick={chooseVideo}>
                  <Image className="icon-img" src={FILM_GRAY} mode="aspectFit" style={{ width: 24, height: 24 }} />
                </View>
              </View>

              <Button
                className={`publish-btn ${isLoading ? 'loading' : ''}`}
                onClick={handleAddDiary}
                disabled={isLoading || (!newContent.trim() && selectedMediaList.length === 0)}
              >
                {isLoading ? '发布中...' : '发布'}
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmModal
        visible={deletingId !== null}
        title="确定删除吗？"
        description="确定要删除这条记录吗？删除后将无法找回。"
        confirmText="确定删除"
        cancelText="取消"
        confirmStyle="danger"
        icon={<Image className="icon-img" src={TRASH2_RED} mode="aspectFit" style={{ width: 32, height: 32 }} />}
        onConfirm={() => deletingId && handleDeleteDiary(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      {/* 评论输入弹窗 */}
      {commentingId && (
        <View className="comment-modal">
          <View className="comment-modal-mask" onClick={() => {
            setCommentingId(null);
            setCommentText('');
          }} />
          <View
            className="comment-modal-content"
            style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)` }}
          >
            <View className="comment-input-row">
              <Input
                className="comment-input"
                placeholder="写下你的评论..."
                placeholderStyle="color: #8E8E8E"
                value={commentText}
                onInput={(e) => setCommentText(e.detail.value)}
                onConfirm={handleAddComment}
                confirmType="send"
                maxlength={100}
                focus
                adjustPosition
              />
              <View
                className={`comment-send-btn ${!commentText.trim() ? 'disabled' : ''}`}
                onClick={() => commentText.trim() && handleAddComment()}
              >
                <Image className="icon-img" src={SEND_ICON} mode="aspectFit" style={{ width: 22, height: 22 }} />
              </View>
            </View>
            <Text className="comment-count">{commentText.length}/100</Text>
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
                      navigateTo(`/pages/add-friend-qr/index?catId=${selectedCatForQR?.id}`);
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

      {/* 分享面板 */}
      <ShareSheet
        visible={showShareSheet}
        title="分享日记"
        text={sharingDiary ? sharingDiary.content : 'Miao - 日常记录'}
        url="/pages/diary/index"
        isTabPage={true}
        shareImagePath={shareCardPath}
        onClose={() => { setShowShareSheet(false); setShareCardPath(''); setManagedTimeout(() => updateSharingDiary(null), 5000); }}
      />

      {/* 分享卡片 Canvas（不可见，用于生成朋友圈分享图） */}
      <Canvas
        type="2d"
        id="diaryShareCard"
        style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '600px', height: '1600px' }}
      />

      {/* 单页模式引导（从朋友圈进入） */}
      {isSinglePage && (
        <View className="single-page-banner" onClick={() => reLaunch('/pages/home/index')}>
          <Text className="single-page-text">进入 Miao 完整体验 →</Text>
        </View>
      )}

      {/* 评论长按操作菜单 - 浮动气泡 */}
      {commentActionSheet && (
        <View className="comment-tooltip-overlay" onClick={() => setCommentActionSheet(null)}>
          <View
            className="comment-tooltip"
            style={{ top: `${commentActionSheet.top}px`, left: `${commentActionSheet.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <View className="comment-tooltip-row">
              <View className="comment-tooltip-btn" onClick={() => {
                Taro.setClipboardData({ data: commentActionSheet.content });
                setCommentActionSheet(null);
              }}>
                <Text>复制</Text>
              </View>
              <View className="comment-tooltip-divider" />
              {commentActionSheet.canDelete && (
                <View className="comment-tooltip-btn danger" onClick={() => {
                  handleDeleteComment(commentActionSheet.diaryId, commentActionSheet.commentId);
                  setCommentActionSheet(null);
                }}>
                  <Text>删除</Text>
                </View>
              )}
            </View>
            <View className="comment-tooltip-arrow" />
          </View>
        </View>
      )}
    </View>
  );
}  
