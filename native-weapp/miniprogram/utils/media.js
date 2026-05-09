function chooseImage() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success(res) {
        const path = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (!path) reject(new Error('选择图片失败'));
        else resolve(path);
      },
      fail() {
        wx.chooseImage({
          count: 1,
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          success(imgRes) {
            const path = imgRes.tempFilePaths && imgRes.tempFilePaths[0];
            if (!path) reject(new Error('选择图片失败'));
            else resolve(path);
          },
          fail: reject
        });
      }
    });
  });
}

function compressImage(src) {
  return new Promise((resolve) => {
    wx.compressImage({
      src,
      quality: 72,
      success(res) {
        resolve(res.tempFilePath || src);
      },
      fail() {
        resolve(src);
      }
    });
  });
}

module.exports = {
  chooseImage,
  compressImage
};
