function getHeaderSafeTop(extraPx = 24) {
  try {
    const rect = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
    if (rect && rect.bottom) {
      return `${Math.ceil(rect.bottom + extraPx)}px`;
    }
  } catch (error) {
    console.warn('[native] get menu button rect failed:', error);
  }
  return `calc(var(--nav-top) + 96rpx)`;
}

module.exports = {
  getHeaderSafeTop
};
