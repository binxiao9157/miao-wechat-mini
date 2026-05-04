import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro, { navigateTo, reLaunch, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import { storage, UserInfo, CatInfo } from '../../services/storage';
import { request } from '../../utils/httpAdapter';
import { friendService } from '../../services/friendService';
import './index.less';

// Lucide-style icon images (colored PNGs matching PWA)
const ICONS = {
  scan: require('../../assets/profile-icons/scan-header.png'),
  bell: require('../../assets/profile-icons/bell-header.png'),
  camera: require('../../assets/profile-icons/camera-white.png'),
  calendar: require('../../assets/profile-icons/calendar-stat.png'),
  image: require('../../assets/profile-icons/image-stat.png'),
  heart: require('../../assets/profile-icons/heart-cat.png'),
  user: require('../../assets/profile-icons/user-blue.png'),
  bellMenu: require('../../assets/profile-icons/bell-orange.png'),
  message: require('../../assets/profile-icons/message-purple.png'),
  logout: require('../../assets/profile-icons/logout-gray.png'),
  trash: require('../../assets/profile-icons/trash-red.png'),
};

type ProfileIconName = keyof typeof ICONS;

function ProfileIcon({ name, size, className = '' }: { name: ProfileIconName; size?: number; className?: string }) {
  return (
    <Image
      className={`profile-icon ${className}`}
      src={ICONS[name]}
      mode="aspectFit"
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    />
  );
}

function getUnreadNotificationCount() {
  const readIds = storage.getReadNotificationIds();
  let count = 0;

  const isFastForward = storage.getIsFastForward();
  const now = isFastForward ? Date.now() * 10 : Date.now();
  storage.getTimeLetters().forEach((letter) => {
    const id = `letter_${letter.id}`;
    if (letter.unlockAt <= now && !readIds.includes(id)) count += 1;
  });

  storage.getPoints().history?.slice(0, 5).forEach((tx) => {
    const id = `points_${tx.id}`;
    if (!readIds.includes(id)) count += 1;
  });

  const today = new Date().toISOString().slice(0, 10);
  if (!readIds.includes(`greeting_${today}`)) count += 1;

  // 服务端通知（好友分享等）
  const serverNotifications = storage.getCustomNotifications();
  for (const n of serverNotifications) {
    if (!n.read) count += 1;
  }

  return count;
}

export default function Profile() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeCat, setActiveCat] = useState<CatInfo | null>(null);
  const [stats, setStats] = useState({ days: 0, entries: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const adminTapCountRef = useRef(0);
  const adminTapTimerRef = useRef<any>(null);

  const navSpace = useNavSpace();
  const navStyle: React.CSSProperties = {
    '--profile-nav-top': navSpace['--nav-top'],
    '--profile-nav-height': navSpace['--nav-height'],
    '--profile-page-side': navSpace['--nav-side'],
  };

  useShareAppMessage(() => ({
    title: activeCat ? `来认识${activeCat.name}吧！` : 'Miao - 你的AI猫咪伙伴',
    path: '/pages/home/index',
  }));

  useShareTimeline(() => ({
    title: activeCat ? `${activeCat.name}在Miao等你` : 'Miao - 你的AI猫咪伙伴',
  }));

  useEffect(() => {
    Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] } as any);
    loadProfile();
    const handleNotificationsRead = () => setUnreadCount(getUnreadNotificationCount());
    Taro.eventCenter.on('notifications-read', handleNotificationsRead);
    return () => {
      Taro.eventCenter.off('notifications-read', handleNotificationsRead);
      if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current);
    };
  }, []);

  const loadProfile = () => {
    const userInfo = storage.getUserInfo();
    setUser(userInfo);

    const cat = storage.getActiveCat();
    setActiveCat(cat);

    if (cat) {
      const diaries = storage.getDiaries();
      const catDiaries = diaries.filter(d => d.catId === cat.id);

      let startTime = cat.createdAt;
      if (!startTime && catDiaries.length > 0) {
        startTime = Math.min(...catDiaries.map(d => d.createdAt));
      }

      const days = startTime
        ? Math.max(1, Math.ceil((Date.now() - startTime) / (1000 * 60 * 60 * 24)))
        : 1;

      setStats({
        days,
        entries: catDiaries.length
      });
    } else {
      setStats({ days: 0, entries: 0 });
    }

    setUnreadCount(getUnreadNotificationCount());

    // 从服务端同步通知，合并到本地后刷新红点
    request({ url: '/api/v1/notifications', method: 'GET' })
      .then((res) => {
        const serverNotifications = Array.isArray(res.data) ? res.data : [];
        for (const n of serverNotifications) {
          if (!n.read) {
            const existing = storage.getCustomNotifications();
            if (!existing.some(e => e.id === n.id)) {
              storage.addCustomNotification({ type: n.type, title: n.title, content: n.content, catAvatar: n.catAvatar });
            }
          }
        }
        setUnreadCount(getUnreadNotificationCount());
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    storage.clearCurrentUser();
    reLaunch({ url: '/pages/login/index' });
  };

  const handleClearLocalData = () => {
    storage.clearAll();
    storage.clearCurrentUser();
    reLaunch({ url: '/pages/register/index' });
  };

  const handleClearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '将清除临时文件、图片缓存和过期数据，不会删除您的账户、猫咪、日记和信件。确定清除吗？',
      confirmText: '清除',
      confirmColor: '#E89F71',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 1. 清除 Storage 中的临时 key，保留核心数据
            // 核心 key 可能带 u_xxx_ 前缀（用户级数据），所以用 includes 匹配
            const preservePatterns = [
              'miao_users', 'miao_current_user', 'miao_auth_token', 'miao_last_username',
              'miao_cat_list', 'miao_active_cat_id', 'miao_friends', 'miao_diaries',
              'miao_time_letters', 'miao_points', 'miao_settings', 'miao_ai_config',
              'miao_friend_diaries', 'miao_has_submitted_survey', 'miao_debug_fast_forward',
              'user_avatar_key', 'miao_login_time', 'miao_last_active_time',
              'miao_last_cat_image', 'miao_last_cat_breed', 'app_preset_cats',
              'miao_last_read_notifications', 'miao_read_notification_ids',
            ];
            const info = Taro.getStorageInfoSync();
            const allKeys = info.keys || [];
            let cleared = 0;
            allKeys.forEach((key: string) => {
              const shouldPreserve = preservePatterns.some(p => key.includes(p));
              if (!shouldPreserve) {
                try { Taro.removeStorageSync(key); cleared++; } catch {}
              }
            });

            // 2. 清除 USER_DATA_PATH 下的媒体缓存文件
            try {
              const fs = Taro.getFileSystemManager();
              const files = fs.readdirSync(Taro.env.USER_DATA_PATH);
              files.forEach((file: string) => {
                if (file.startsWith('media_') || file.startsWith('tmp_')) {
                  try { fs.unlinkSync(`${Taro.env.USER_DATA_PATH}/${file}`); cleared++; } catch {}
                }
              });
            } catch {}

            Taro.showToast({ title: `已清除 ${cleared} 项缓存`, icon: 'success' });
          } catch {
            Taro.showToast({ title: '清除失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleAdminTap = () => {
    adminTapCountRef.current += 1;
    if (adminTapTimerRef.current) clearTimeout(adminTapTimerRef.current);

    if (adminTapCountRef.current >= 5) {
      adminTapCountRef.current = 0;
      Taro.vibrateShort({ type: 'light' }).catch(() => {});
      navigateTo({ url: '/pages/admin-settings/index' });
      return;
    }

    adminTapTimerRef.current = setTimeout(() => {
      adminTapCountRef.current = 0;
    }, 2000);
  };

  const menuItems = [
    { icon: 'user' as const, label: '个人资料设置', url: '/pages/edit-profile/index', color: 'bg-blue-50' },
    { icon: 'bellMenu' as const, label: '通知设置', url: '/pages/notifications/index', color: 'bg-orange-50' },
    { icon: 'message' as const, label: '意见反馈', url: '/pages/feedback/index', color: 'bg-purple-50' },
    { icon: 'trash' as const, label: '清除缓存', url: '__clear_cache__', color: 'bg-gray-50' },
  ];

  const handleNotificationClick = () => {
    navigateTo({ url: '/pages/notification-list/index' });
  };

  const handleScanClick = () => {
    navigateTo({ url: '/pages/scan-friend/index' });
  };

  return (
    <View className="profile-page" style={navStyle}>
      {/* Header */}
      <View className="header">
        <View className="header-title">
          <Text className="title" onClick={handleAdminTap}>Miao</Text>
          <Text className="subtitle">MIAO SANCTUARY</Text>
        </View>
        <View className="header-actions">
          <View className="header-btn" onClick={handleScanClick}>
            <ProfileIcon name="scan" size={24} />
          </View>
          <View className="header-btn" onClick={handleNotificationClick}>
            <ProfileIcon name="bell" size={24} />
            {unreadCount > 0 && (
              <View className="unread-badge">
                <Text className="unread-text">{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="profile-content">
        {/* 头像区域 */}
        <View className="profile-header">
          <View className="avatar-wrapper">
            <Image
              className="avatar"
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
              mode="aspectFill"
            />
            <View className="avatar-edit-btn" onClick={(e) => { e.stopPropagation(); navigateTo({ url: '/pages/edit-profile/index' }); }}>
              <ProfileIcon name="camera" size={14} />
            </View>
          </View>
          <Text className="nickname">{user?.nickname || '未登录'}</Text>
          <Text className="username">ID: {user?.username || 'guest'}</Text>

          {/* 统计卡片 - 可点击 */}
          <View className="stats-row">
            <View className="stat-card" onClick={() => {
              const catName = activeCat?.name || '小猫';
              const days = stats.days;
              navigateTo({ url: `/pages/accompany-milestone/index?catName=${encodeURIComponent(catName)}&days=${days}` });
            }}>
              <ProfileIcon name="calendar" size={16} className="stat-icon" />
              <Text className="stat-value">{stats.days}</Text>
              <Text className="stat-label">陪伴天数</Text>
            </View>
            <View className="stat-card" onClick={() => Taro.switchTab({ url: '/pages/diary/index' })}>
              <ProfileIcon name="image" size={16} className="stat-icon" />
              <Text className="stat-value">{stats.entries}</Text>
              <Text className="stat-label">记录瞬间</Text>
            </View>
          </View>

          {/* 当前猫咪入口 */}
          <View className="cat-entry" onClick={() => navigateTo({ url: '/pages/switch-companion/index' })}>
            <View className="cat-entry-icon">
              <ProfileIcon name="heart" size={20} />
            </View>
            <View className="cat-entry-text">
              <Text className="cat-entry-label">我的伙伴</Text>
              <Text className="cat-entry-value">当前：{activeCat?.name || '未选择'}</Text>
            </View>
            <Text className="cat-entry-arrow">›</Text>
          </View>
        </View>

        {/* 菜单区域 */}
        <View className="menu-section">
          <Text className="menu-title">账户设置</Text>
          {menuItems.map((item, index) => (
            <View
              key={index}
              className="menu-item"
              onClick={() => {
                if (item.url === '__clear_cache__') {
                  handleClearCache();
                } else if (item.url) {
                  navigateTo({ url: item.url });
                }
              }}
            >
              <View className={`menu-icon ${item.color}`}>
                <ProfileIcon name={item.icon} size={20} />
              </View>
              <Text className="menu-label">{item.label}</Text>
              <Text className="menu-arrow">›</Text>
            </View>
          ))}

          {/* 退出登录 */}
          <View
            className="menu-item"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <View className="menu-icon bg-gray-50"><ProfileIcon name="logout" size={20} /></View>
            <Text className="menu-label">退出登录</Text>
            <Text className="menu-arrow">›</Text>
          </View>

          {/* 注销账户 */}
          <View
            className="menu-item danger"
            onClick={() => setShowClearConfirm(true)}
          >
            <View className="menu-icon bg-red-50"><ProfileIcon name="trash" size={20} /></View>
            <Text className="menu-label danger-text">注销账户</Text>
            <Text className="menu-arrow danger">›</Text>
          </View>
        </View>

        {/* Footer */}
        <View className="footer" onClick={handleAdminTap}>
          <Text className="footer-text">MIAO SANCTUARY</Text>
          <View className="footer-hearts">
            <View className="footer-dot heart-primary" />
            <View className="footer-dot heart-secondary" />
            <View className="footer-dot heart-primary" />
          </View>
          <Text className="footer-icp">浙ICP备2026026483号-1</Text>
        </View>
      </View>

      {/* 退出登录确认弹窗 */}
      {showLogoutConfirm && (
        <View className="modal-mask" onClick={() => setShowLogoutConfirm(false)}>
          <View className="modal-content" onClick={(e) => e.stopPropagation()}>
            <View className="modal-icon logout">
              <ProfileIcon name="logout" size={32} />
            </View>
            <Text className="modal-title">退出登录？</Text>
            <Text className="modal-desc">确定要退出登录吗？</Text>
            <View className="modal-actions">
              <Button className="modal-btn confirm" onClick={handleLogout}>确定退出</Button>
              <Button className="modal-btn cancel" onClick={() => setShowLogoutConfirm(false)}>取消</Button>
            </View>
          </View>
        </View>
      )}

      {/* 注销账户确认弹窗 */}
      {showClearConfirm && (
        <View className="modal-mask" onClick={() => setShowClearConfirm(false)}>
          <View className="modal-content" onClick={(e) => e.stopPropagation()}>
            <View className="modal-icon delete">
              <ProfileIcon name="trash" size={32} />
            </View>
            <Text className="modal-title danger">注销账户？</Text>
            <Text className="modal-desc">注销账户将永久删除您的所有数据（包括猫咪、日记、信件），此操作不可撤销。确定继续吗？</Text>
            <View className="modal-actions">
              <Button className="modal-btn danger" onClick={handleClearLocalData}>确定注销</Button>
              <Button className="modal-btn cancel" onClick={() => setShowClearConfirm(false)}>再想想</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
