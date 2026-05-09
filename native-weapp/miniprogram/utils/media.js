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

function chooseVideo() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      success(res) {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) {
          reject(new Error('选择视频失败'));
          return;
        }
        if (file.size && file.size > 20 * 1024 * 1024) {
          reject(new Error('视频不能超过20MB'));
          return;
        }
        resolve(file.tempFilePath);
      },
      fail: reject
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

function inferMimeType(path, mediaType) {
  if (mediaType === 'video' || /\.mp4(\?|$)/i.test(path || '')) return 'video/mp4';
  if (/\.png(\?|$)/i.test(path || '')) return 'image/png';
  if (/\.webp(\?|$)/i.test(path || '')) return 'image/webp';
  return 'image/jpeg';
}

function isLocalFile(path) {
  return !!path && !/^https?:\/\//i.test(path) && !/^data:/i.test(path);
}

function isDataUrl(path) {
  return /^data:/i.test(path || '');
}

function readFileAsDataUrl(filePath, mediaType) {
  if (!filePath) return Promise.resolve('');
  if (/^data:/i.test(filePath) || /^https?:\/\//i.test(filePath)) return Promise.resolve(filePath);
  return new Promise((resolve, reject) => {
    try {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success(res) {
          resolve(`data:${inferMimeType(filePath, mediaType)};base64,${res.data}`);
        },
        fail(error) {
          reject(new Error(error.errMsg || '媒体文件读取失败，请重新选择后再同步'));
        }
      });
    } catch (error) {
      reject(new Error(error.message || '媒体文件读取失败，请重新选择后再同步'));
    }
  });
}

function saveDataUrlToFile(id, dataUrl) {
  return new Promise((resolve) => {
    if (!/^data:[^;]+;base64,/.test(dataUrl || '')) {
      resolve(dataUrl || '');
      return;
    }
    try {
      const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
      const mimeType = mimeMatch && mimeMatch[1] ? mimeMatch[1] : 'image/jpeg';
      const extension = mimeType.startsWith('video/') ? 'mp4' : 'jpg';
      const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, '');
      const filePath = `${wx.env.USER_DATA_PATH}/media_${id}.${extension}`;
      wx.getFileSystemManager().writeFile({
        filePath,
        data: base64Data,
        encoding: 'base64',
        success() {
          resolve(filePath);
        },
        fail() {
          resolve(dataUrl);
        }
      });
    } catch {
      resolve(dataUrl || '');
    }
  });
}

function saveMediaFile(src) {
  return new Promise((resolve) => {
    if (!src || !/^wxfile:|^http:|^https:|^\/|^tmp\//.test(src)) {
      resolve(src || '');
      return;
    }
    try {
      wx.saveFile({
        tempFilePath: src,
        success(res) {
          resolve(res.savedFilePath || src);
        },
        fail() {
          resolve(src);
        }
      });
    } catch {
      resolve(src);
    }
  });
}

module.exports = {
  chooseImage,
  chooseVideo,
  compressImage,
  inferMimeType,
  isDataUrl,
  isLocalFile,
  readFileAsDataUrl,
  saveDataUrlToFile,
  saveMediaFile
};
