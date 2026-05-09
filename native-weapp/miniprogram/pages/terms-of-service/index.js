const { safeBack } = require('../../utils/nav');

Page({
  goBack() {
    safeBack('/pages/profile/index');
  }
});
