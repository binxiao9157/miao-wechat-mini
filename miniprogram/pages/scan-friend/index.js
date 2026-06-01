const { socialStore } = require('../../services/social-store');
const { safeBack, navigateTo } = require('../../utils/nav');

Page({
  data: {
    scanning: false,
    showConfirm: false,
    friendInfo: null,
    inviteCode: '',
    showToast: ''
  },

  onLoad() {
    this.startScan();
  },

  triggerToast(message) {
    this.setData({ showToast: message });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.setData({ showToast: '' });
    }, 2500);
  },

  goBack() {
    safeBack('/pages/diary/index');
  },

  startScan() {
    this.setData({ scanning: true });
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        this.setData({ scanning: false });
        this.handleScanResult(res.result);
      },
      fail: () => {
        this.setData({ scanning: false });
      }
    });
  },

  async handleScanResult(result) {
    try {
      const code = socialStore.extractInviteCode(result);
      if (!code) {
        this.triggerToast('无效的邀请码');
        return;
      }
      const invite = await socialStore.getInvite(code);
      const inviter = invite && invite.inviter ? invite.inviter : {};
      const nickname = inviter.nickname || (invite && invite.ownerId) || '好友';
      this.setData({
        inviteCode: code,
        friendInfo: {
          id: invite && invite.ownerId,
          nickname,
          avatar: inviter.avatar || '',
          avatarText: nickname.slice(0, 1),
          catName: (invite && invite.catName) || '小猫',
          catAvatar: (invite && invite.catAvatar) || ''
        },
        showConfirm: true
      });
    } catch (error) {
      this.triggerToast((error && error.message) || '无法识别的二维码');
    }
  },

  closeConfirm() {
    this.setData({ showConfirm: false });
  },

  noop() {},

  async confirmAdd() {
    if (!this.data.inviteCode) return;
    try {
      await socialStore.acceptInvite(this.data.inviteCode);
      this.setData({ showConfirm: false });
      this.triggerToast('添加好友成功！');
      setTimeout(() => safeBack('/pages/diary/index'), 1500);
    } catch (error) {
      this.triggerToast((error && error.message) || '添加好友失败');
    }
  },

  openMyQr() {
    navigateTo('/pages/add-friend-qr/index');
  }
});
