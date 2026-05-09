const { authService } = require('../../services/auth');
const { dataStore } = require('../../services/data-store');
const { contentStore } = require('../../services/content-store');
const { del } = require('../../utils/request');
const { clear } = require('../../utils/storage');
const { safeBack, navigateTo, reLaunch } = require('../../utils/nav');

const ADMIN_TAP_WINDOW_MS = 1800;

Page({
  data: {
    user: null,
    displayName: 'Miao 用户',
    username: '',
    avatar: '',
    avatarLetter: 'M',
    cat: null,
    stats: {
      days: 0,
      videoCount: 0,
      catCount: 0
    },
    unreadCount: 0,
    messageLabel: '消息中心'
  },

  onLoad() {
    this.adminTapCount = 0;
  },

  onShow() {
    this.refresh();
    Promise.allSettled([
      contentStore.syncNotificationsFromServer(),
      contentStore.syncLettersFromServer(),
      contentStore.syncPointsFromServer()
    ]).finally(() => this.refresh());
  },

  refresh() {
    const user = authService.getCachedUser();
    const cat = dataStore.getActiveCat();
    const catStats = dataStore.getCatStats(cat);
    const unreadCount = contentStore.getUnreadNotificationCount();
    this.setData({
      user,
      displayName: (user && (user.nickname || user.username)) || 'Miao 用户',
      username: (user && user.username) || '未登录',
      avatar: (user && user.avatar) || '',
      avatarLetter: ((user && (user.nickname || user.username)) || 'M').slice(0, 1).toUpperCase(),
      cat,
      stats: {
        ...catStats,
        catCount: dataStore.getCats().length
      },
      unreadCount,
      messageLabel: unreadCount > 0
        ? `消息中心（${unreadCount}）`
        : '消息中心'
    });
  },

  goBack() {
    safeBack('/pages/home/index');
  },

  goSwitch() {
    navigateTo('/pages/switch-companion/index');
  },

  goEditProfile() {
    navigateTo('/pages/edit-profile/index');
  },

  goHistory() {
    navigateTo('/pages/cat-history/index');
  },

  goMilestone() {
    navigateTo('/pages/accompany-milestone/index');
  },

  goCreate() {
    navigateTo('/pages/empty-cat/index');
  },

  goDiary() {
    navigateTo('/pages/diary/index');
  },

  goLetters() {
    navigateTo('/pages/time-letters/index');
  },

  goPoints() {
    navigateTo('/pages/points/index');
  },

  goNotifications() {
    navigateTo('/pages/notifications/index');
  },

  goNotificationList() {
    navigateTo('/pages/notification-list/index');
  },

  goPrivacy() {
    navigateTo('/pages/privacy-settings/index');
  },

  goFriends() {
    navigateTo('/pages/scan-friend/index');
  },

  goInvite() {
    navigateTo('/pages/add-friend-qr/index');
  },

  goFeedback() {
    navigateTo('/pages/feedback/index');
  },

  goPrivacyPolicy() {
    navigateTo('/pages/privacy-policy/index');
  },

  goTerms() {
    navigateTo('/pages/terms-of-service/index');
  },

  handleAdminTap() {
    this.adminTapCount = (this.adminTapCount || 0) + 1;
    clearTimeout(this.adminTapTimer);
    if (this.adminTapCount >= 5) {
      this.adminTapCount = 0;
      wx.vibrateShort({ type: 'light' });
      navigateTo('/pages/admin-settings/index');
      return;
    }
    this.adminTapTimer = setTimeout(() => {
      this.adminTapCount = 0;
    }, ADMIN_TAP_WINDOW_MS);
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清理临时缓存，不会删除账号和猫咪数据。',
      confirmText: '清除',
      confirmColor: '#E89F71',
      success: (res) => {
        if (!res.confirm) return;
        const preserve = [
          'miao_users',
          'miao_auth_token',
          'miao_current_user',
          'miao_last_username',
          'miao_login_time',
          'miao_last_active_time',
          'miao_cat_list',
          'miao_active_cat_id',
          'miao_generation_tasks',
          'miao_friends',
          'miao_friend_diaries',
          'miao_diaries',
          'miao_time_letters',
          'miao_points',
          'miao_settings',
          'miao_ai_config',
          'miao_has_submitted_survey',
          'miao_debug_fast_forward',
          'miao_debug_points_cheat',
          'miao_last_cat_image',
          'miao_last_cat_breed',
          'app_preset_cats',
          'miao_last_read_notifications',
          'miao_read_notification_ids',
          'user_avatar_key'
        ];
        const info = wx.getStorageInfoSync();
        let count = 0;
        (info.keys || []).forEach((key) => {
          if (preserve.some((item) => key.includes(item))) return;
          try {
            wx.removeStorageSync(key);
            count += 1;
          } catch {}
        });
        wx.showToast({ title: `已清理 ${count} 项`, icon: 'success' });
      }
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      confirmColor: '#D64B4B',
      success: (res) => {
        if (!res.confirm) return;
        authService.logout();
        const app = getApp();
        app.globalData.user = null;
        app.globalData.isAuthenticated = false;
        reLaunch('/pages/login/index');
      }
    });
  },

  deleteAccount() {
    wx.showModal({
      title: '注销账户？',
      content: '注销账户将永久删除您的所有数据（包括猫咪、日记、信件），此操作不可撤销。确定继续吗？',
      confirmText: '确定注销',
      confirmColor: '#D64B4B',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '正在注销' });
        try {
          await del('/api/v1/me', { timeout: 15000 });
        } catch (error) {
          console.warn('[native] delete account failed, clearing local anyway:', error);
        } finally {
          clear();
          const app = getApp();
          app.globalData.user = null;
          app.globalData.isAuthenticated = false;
          wx.hideLoading();
          reLaunch('/pages/register/index');
        }
      }
    });
  }
});
