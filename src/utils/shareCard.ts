/**
 * Generate a 1:1 share card image for WeChat Moments.
 * Uses Taro Canvas 2D API to draw a branded card with cat info + diary content.
 * Design matches Miao's warm terracotta/peach theme.
 */
import Taro from '@tarojs/taro';
import { drawQROnCanvas } from './qrCanvas';

// Miao design tokens
const COLORS = {
  primary: '#E89F71',
  primaryStrong: '#FF9D76',
  primaryGradientStart: '#FF9D76',
  primaryGradientEnd: '#FF6B3D',
  background: '#FFF9F5',
  surface: '#FFFFFF',
  surfaceContainer: '#FEF6F0',
  onSurface: '#633E1D',
  onSurfaceLight: '#5D4037',
  textPrimary: '#3C2710',
  textSecondary: 'rgba(99, 62, 29, 0.5)',
  textTertiary: 'rgba(99, 62, 29, 0.3)',
  border: '#F2E6DD',
  shadow: 'rgba(99, 62, 29, 0.08)',
};

interface ShareCardOptions {
  canvasId: string;
  catName: string;
  catAvatar?: string;
  content: string;
  mediaUrl?: string;
  width?: number;
  height?: number;
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx: any, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let currentLine = '';
  for (const char of text) {
    const testLine = currentLine + char;
    if (ctx.measureText(testLine).width > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = char;
      if (lines.length >= maxLines) break;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine && lines.length < maxLines) lines.push(currentLine);
  if (lines.length === maxLines && text.length > lines.join('').length) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…';
  }
  return lines;
}

function loadImage(canvas: any, src: string): Promise<any> {
  return new Promise((resolve) => {
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function queryCanvasNode(canvasId: string, retries = 3, delay = 200): Promise<any> {
  return new Promise((resolve, reject) => {
    const attempt = (remaining: number) => {
      const instance = Taro.getCurrentInstance();
      const query = Taro.createSelectorQuery().in(instance.page);
      query.select(`#${canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (res[0]?.node) {
            resolve(res[0].node);
          } else if (remaining > 0) {
            setTimeout(() => attempt(remaining - 1), delay);
          } else {
            reject(new Error('Canvas node not found after retries'));
          }
        });
    };
    attempt(retries);
  });
}

export async function generateShareCard(options: ShareCardOptions): Promise<string> {
  const {
    canvasId,
    catName,
    catAvatar,
    content,
    mediaUrl,
    width = 600,
    height = 600,
  } = options;

  const canvas = await queryCanvasNode(canvasId);
  const ctx = canvas.getContext('2d');
  const dpr = Taro.getSystemInfoSync().pixelRatio;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Warm cream background
  ctx.fillStyle = COLORS.background;
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.fill();

  // Top gradient accent bar
  const topBarGrad = ctx.createLinearGradient(0, 0, width, 0);
  topBarGrad.addColorStop(0, COLORS.primaryGradientStart);
  topBarGrad.addColorStop(1, COLORS.primaryGradientEnd);
  ctx.fillStyle = topBarGrad;
  roundRect(ctx, 0, 0, width, 6, 0);
  ctx.fill();

  let currentY = 36;

  // Cat avatar with subtle shadow
  const avatarSize = 52;
  const avatarX = 28;
  const avatarY = currentY;

  // Avatar shadow circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2 + 1, avatarY + avatarSize / 2 + 2, avatarSize / 2 + 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(99, 62, 29, 0.06)';
  ctx.fill();
  ctx.restore();

  // Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.clip();

  if (catAvatar) {
    const img = await loadImage(canvas, catAvatar);
    if (img) {
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      // Fallback: gradient circle
      const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      avatarGrad.addColorStop(0, COLORS.primaryGradientStart);
      avatarGrad.addColorStop(1, COLORS.primaryGradientEnd);
      ctx.fillStyle = avatarGrad;
      ctx.fill();
    }
  } else {
    const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    avatarGrad.addColorStop(0, COLORS.primaryGradientStart);
    avatarGrad.addColorStop(1, COLORS.primaryGradientEnd);
    ctx.fillStyle = avatarGrad;
    ctx.fill();
  }
  ctx.restore();

  // Avatar border ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.surface;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Cat name
  ctx.fillStyle = COLORS.onSurface;
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(catName, avatarX + avatarSize + 14, avatarY + 28);

  // Date with subtle styling
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '12px sans-serif';
  const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  ctx.fillText(dateStr, avatarX + avatarSize + 14, avatarY + 46);

  currentY = avatarY + avatarSize + 20;

  // Media image (if exists)
  if (mediaUrl) {
    const mediaX = 20;
    const mediaW = width - 40;
    const mediaH = 280;

    // Card shadow for media
    ctx.save();
    roundRect(ctx, mediaX + 2, currentY + 2, mediaW, mediaH, 16);
    ctx.fillStyle = COLORS.shadow;
    ctx.fill();
    ctx.restore();

    // Media card with rounded corners
    ctx.save();
    roundRect(ctx, mediaX, currentY, mediaW, mediaH, 16);
    ctx.clip();
    const img = await loadImage(canvas, mediaUrl);
    if (img) {
      const imgRatio = img.width / img.height;
      const boxRatio = mediaW / mediaH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > boxRatio) {
        sw = img.height * boxRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / boxRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, mediaX, currentY, mediaW, mediaH);
    } else {
      ctx.fillStyle = COLORS.surfaceContainer;
      ctx.fillRect(mediaX, currentY, mediaW, mediaH);
    }
    ctx.restore();
    currentY += mediaH + 16;
  }

  // Diary content text
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'left';
  const maxTextWidth = width - 56;
  const lineHeight = 24;
  const maxLines = mediaUrl ? 4 : 8;
  const lines = wrapText(ctx, content, maxTextWidth, maxLines);
  lines.forEach((line, i) => {
    ctx.fillText(line, 28, currentY + i * lineHeight);
  });
  currentY += lines.length * lineHeight + 16;

  // Bottom branding section
  const bottomY = height - 88;

  // Divider line with warm color
  const dividerGrad = ctx.createLinearGradient(28, bottomY - 12, width - 28, bottomY - 12);
  dividerGrad.addColorStop(0, 'rgba(232, 159, 113, 0.15)');
  dividerGrad.addColorStop(0.5, 'rgba(232, 159, 113, 0.3)');
  dividerGrad.addColorStop(1, 'rgba(232, 159, 113, 0.15)');
  ctx.fillStyle = dividerGrad;
  ctx.fillRect(28, bottomY - 12, width - 56, 1);

  // QR code with rounded background
  const qrSize = 56;
  const qrX = 28;
  const qrY = bottomY;

  // QR background card
  ctx.save();
  roundRect(ctx, qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 8);
  ctx.fillStyle = COLORS.surface;
  ctx.fill();
  ctx.restore();

  drawQROnCanvas(ctx, 'miao://diary', qrX, qrY, qrSize, COLORS.onSurface, COLORS.surface);

  // Branding text (right of QR)
  const brandX = qrX + qrSize + 16;
  ctx.fillStyle = COLORS.onSurfaceLight;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Miao', brandX, qrY + 22);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '11px sans-serif';
  ctx.fillText('长按识别小程序码', brandX, qrY + 40);
  ctx.fillStyle = COLORS.textTertiary;
  ctx.font = '10px sans-serif';
  ctx.fillText('记录猫咪的美好时光', brandX, qrY + 56);

  // Export
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Taro.canvasToTempFilePath({
        canvas,
        width,
        height,
        destWidth: width * 2,
        destHeight: height * 2,
        success: (tempRes) => resolve(tempRes.tempFilePath),
        fail: (err) => reject(err),
      });
    }, 200);
  });
}