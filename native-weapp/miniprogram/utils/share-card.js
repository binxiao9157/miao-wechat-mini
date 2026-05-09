const CARD_WIDTH = 600;
const CARD_HEIGHT = 820;
const COLORS = {
  background: '#FFF7F1',
  panel: '#FFFFFF',
  primary: '#E89F71',
  primaryDark: '#8A4B26',
  text: '#3C2710',
  muted: '#8E8E8E',
  soft: '#FEF1E8',
  border: '#F4DED0'
};

function queryCanvas(page, canvasId) {
  return new Promise((resolve, reject) => {
    const query = wx.createSelectorQuery().in(page);
    query.select(`#${canvasId}`).fields({ node: true, size: true }).exec((res) => {
      const canvas = res && res[0] && res[0].node;
      if (canvas) resolve(canvas);
      else reject(new Error('分享卡片画布未就绪'));
    });
  });
}

function getImagePath(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve('');
      return;
    }
    if (/^data:/i.test(src)) {
      resolve('');
      return;
    }
    wx.getImageInfo({
      src,
      success(res) {
        resolve(res.path || src);
      },
      fail() {
        resolve(src);
      }
    });
  });
}

function loadImage(canvas, src) {
  return new Promise((resolve) => {
    if (!src || !canvas.createImage) {
      resolve(null);
      return;
    }
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  const lines = [];
  let current = '';
  for (const char of value) {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
      if (lines.length >= maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && value.length > lines.join('').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}...`;
  }
  return lines;
}

function formatDate(timestamp) {
  const date = new Date(timestamp || Date.now());
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function drawCoverImage(ctx, img, x, y, width, height, radius) {
  if (!img) return false;
  const sourceRatio = img.width / img.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
  return true;
}

function toTempFilePath(canvas) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      fileType: 'jpg',
      quality: 0.92,
      success(res) {
        resolve(res.tempFilePath);
      },
      fail(error) {
        reject(new Error(error.errMsg || '分享卡片导出失败'));
      }
    });
  });
}

async function generateShareCard(page, options) {
  const canvas = await queryCanvas(page, options.canvasId || 'shareCardCanvas');
  const ctx = canvas.getContext('2d');
  const dpr = wx.getSystemInfoSync().pixelRatio || 1;
  canvas.width = CARD_WIDTH * dpr;
  canvas.height = CARD_HEIGHT * dpr;
  ctx.scale(dpr, dpr);

  const mediaPath = await getImagePath(options.mediaUrl);
  const avatarPath = await getImagePath(options.catAvatar || '/assets/logo.png');
  const mediaImg = await loadImage(canvas, mediaPath);
  const avatarImg = await loadImage(canvas, avatarPath);

  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = COLORS.soft;
  ctx.beginPath();
  ctx.arc(88, 112, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFDFB';
  ctx.beginPath();
  ctx.arc(528, 280, 130, 0, Math.PI * 2);
  ctx.fill();

  roundRect(ctx, 36, 34, CARD_WIDTH - 72, CARD_HEIGHT - 68, 34);
  ctx.fillStyle = COLORS.panel;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = COLORS.primaryDark;
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('Miao', 72, 92);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '22px sans-serif';
  ctx.fillText(formatDate(options.createdAt), 72, 126);

  const hasMedia = drawCoverImage(ctx, mediaImg, 72, 160, 456, 342, 28);
  if (!hasMedia) {
    roundRect(ctx, 72, 160, 456, 232, 28);
    ctx.fillStyle = COLORS.soft;
    ctx.fill();
    if (avatarImg) {
      drawCoverImage(ctx, avatarImg, 240, 206, 120, 120, 60);
    }
    ctx.fillStyle = COLORS.primaryDark;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(options.catName || 'Miao', 300, 354);
    ctx.textAlign = 'left';
  }

  const contentTop = hasMedia ? 546 : 436;
  ctx.fillStyle = COLORS.primaryDark;
  ctx.font = 'bold 30px sans-serif';
  const title = `${options.catName || '猫咪'}的日常`;
  ctx.fillText(title, 72, contentTop);

  ctx.fillStyle = COLORS.text;
  ctx.font = '26px sans-serif';
  const lines = wrapText(ctx, options.content || '分享一条猫咪日记', 456, hasMedia ? 4 : 7);
  lines.forEach((line, index) => {
    ctx.fillText(line, 72, contentTop + 46 + index * 38);
  });

  const footerY = CARD_HEIGHT - 132;
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, footerY - 28);
  ctx.lineTo(528, footerY - 28);
  ctx.stroke();

  if (avatarImg) drawCoverImage(ctx, avatarImg, 72, footerY, 62, 62, 31);
  ctx.fillStyle = COLORS.primaryDark;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(options.authorName || options.catName || 'Miao', 152, footerY + 24);
  ctx.fillStyle = COLORS.muted;
  ctx.font = '21px sans-serif';
  ctx.fillText('记录猫咪的美好时光', 152, footerY + 56);

  roundRect(ctx, 420, footerY + 6, 108, 50, 25);
  ctx.fillStyle = COLORS.primary;
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('去看看', 474, footerY + 39);
  ctx.textAlign = 'left';

  return toTempFilePath(canvas);
}

module.exports = {
  generateShareCard
};
