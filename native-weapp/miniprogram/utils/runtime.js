function getEnvVersion() {
  try {
    const info = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
    return info && info.miniProgram && info.miniProgram.envVersion
      ? info.miniProgram.envVersion
      : 'release';
  } catch {
    return 'release';
  }
}

function isDebugEnabled() {
  return getEnvVersion() !== 'release';
}

module.exports = {
  getEnvVersion,
  isDebugEnabled
};
