const { authService } = require('../../services/auth');
const { reLaunch, safeBack } = require('../../utils/nav');
const { routeAfterAuth } = require('../../services/session-router');

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F780}-\u{1F7FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2B50}-\u{2B55}\u{2300}-\u{23FF}\u{00A9}-\u{00AE}\u{1F000}-\u{1F02F}]/gu;

function filterEmoji(text) {
  return String(text || '').replace(EMOJI_REGEX, '');
}

Page({
  data: {
    nickname: '',
    saving: false,
    canSave: false
  },

  onLoad() {
    const user = authService.getCachedUser();
    if (!user) {
      reLaunch('/pages/login/index');
      return;
    }
    const nickname = filterEmoji(user.nickname || '');
    this.setData({
      nickname,
      canSave: nickname.trim().length >= 2
    });
  },

  onInput(event) {
    const nickname = filterEmoji(event.detail.value).slice(0, 12);
    this.setData({
      nickname,
      canSave: nickname.trim().length >= 2
    });
  },

  goBack() {
    safeBack('/pages/login/index');
  },

  async submit() {
    const nickname = this.data.nickname.trim();
    if (!this.data.canSave || this.data.saving) return;
    if (nickname.length < 2 || nickname.length > 12) {
      wx.showToast({ title: '昵称需为 2-12 个字符', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await authService.updateProfile({ nickname });
      routeAfterAuth();
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },

  skip() {
    routeAfterAuth();
  }
});
