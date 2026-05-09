function navigateTo(url) {
  return wx.navigateTo({ url });
}

function redirectTo(url) {
  return wx.redirectTo({ url });
}

function switchTab(url) {
  return wx.switchTab({ url });
}

function reLaunch(url) {
  return wx.reLaunch({ url });
}

function navigateBack(delta = 1) {
  return wx.navigateBack({ delta });
}

function safeBack(fallbackUrl = '/pages/bootstrap/index') {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    return navigateBack();
  }
  return reLaunch(fallbackUrl);
}

module.exports = {
  navigateTo,
  redirectTo,
  switchTab,
  reLaunch,
  navigateBack,
  safeBack
};
