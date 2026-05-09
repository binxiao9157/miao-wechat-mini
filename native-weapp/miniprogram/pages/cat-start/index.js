const { reLaunch, safeBack } = require('../../utils/nav');

Page({
  goBack() {
    safeBack('/pages/profile/index');
  },

  start() {
    reLaunch('/pages/empty-cat/index');
  }
});
