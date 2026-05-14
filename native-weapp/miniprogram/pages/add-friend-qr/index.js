const { socialStore } = require('../../services/social-store');
const { safeBack } = require('../../utils/nav');
const { drawQROnCanvas } = require('../../utils/qr-canvas');

function decodeQueryValue(value) {
  try {
    return decodeURIComponent(value || '');
  } catch {
    return value || '';
  }
}

Page({
  data: {
    invite: null,
    invitePayload: '',
    qrImageUrl: '',
    qrReady: false,
    loading: false,
    errorText: '',
    toastText: '',
    toastType: '',
    catId: ''
  },

  onLoad(options = {}) {
    this.setData({
      catId: decodeQueryValue(options.catId)
    });
  },

  onShow() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    });
    if (!this.data.invite) this.createInvite();
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  async createInvite() {
    this.setData({ loading: true, errorText: '' });
    try {
      const invite = await socialStore.createInvite(this.data.catId);
      const invitePayload = invite && invite.code ? `miao://friend?invite=${encodeURIComponent(invite.code)}` : '';
      this.setData({ invite, invitePayload, qrImageUrl: '', qrReady: false }, () => this.drawQr());
    } catch (error) {
      this.setData({ errorText: error.message || '创建失败' });
      this.showToast(error.message || '创建失败', 'error');
    } finally {
      this.setData({ loading: false });
    }
  },

  showToast(message, type = 'success') {
    this.setData({ toastText: message, toastType: type });
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.setData({ toastText: '', toastType: '' });
    }, 2200);
  },

  drawQr() {
    const payload = this.data.invitePayload;
    if (!payload) return;
    wx.nextTick(() => {
      setTimeout(() => {
        const query = wx.createSelectorQuery().in(this);
        query.select('#qrCanvas').fields({ node: true, size: true }).exec((res) => {
          const node = res && res[0] && res[0].node;
          if (!node) return;
          const ctx = node.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio || 1;
          const size = 320;
          node.width = size * dpr;
          node.height = size * dpr;
          ctx.scale(dpr, dpr);
          drawQROnCanvas(ctx, payload, 0, 0, size, '#1C1B1F', '#FFFFFF');
          wx.canvasToTempFilePath({
            canvas: node,
            success: (tempRes) => this.setData({ qrImageUrl: tempRes.tempFilePath, qrReady: true, errorText: '' }),
            fail: () => this.setData({ qrReady: true })
          });
        });
      }, 120);
    });
  },

  saveQr() {
    const filePath = this.data.qrImageUrl;
    if (!filePath) {
      this.showToast('二维码生成中', 'error');
      return;
    }
    const save = () => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => this.showToast('已保存', 'success'),
        fail: () => {
          wx.showModal({
            title: '保存失败',
            content: '请确认已允许保存到相册，也可以直接截图分享。',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting({});
            }
          });
        }
      });
    };
    wx.getSetting({
      success: (setting) => {
        if (setting.authSetting && setting.authSetting['scope.writePhotosAlbum'] === false) {
          wx.openSetting({});
          return;
        }
        if (setting.authSetting && setting.authSetting['scope.writePhotosAlbum']) {
          save();
          return;
        }
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: save,
          fail: () => {
            wx.showModal({
              title: '需要相册权限',
              content: '允许保存到相册后，才能保存二维码。',
              confirmText: '去设置',
              success: (res) => {
                if (res.confirm) wx.openSetting({});
              }
            });
          }
        });
      }
    });
  },

  onShareAppMessage() {
    const code = this.data.invite && this.data.invite.code;
    return {
      title: '来 Miao 认识我的猫咪',
      path: code ? `/pages/join-friend/index?invite=${encodeURIComponent(code)}` : '/pages/home/index'
    };
  }
});
