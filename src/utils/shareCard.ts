/**
 * Generate a 1:1 share card image for WeChat Moments (onShareTimeline).
 * Uses Taro Canvas 2D API to draw a branded card with cat info + diary content.
 */
import Taro from '@tarojs/taro';
import { drawQROnCanvas } from './qrCanvas';

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

  return new Promise((resolve, reject) => {
    const instance = Taro.getCurrentInstance();
    const query = Taro.createSelectorQuery().in(instance.page);
    query.select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res[0]?.node) {
          reject(new Error('Canvas node not found'));
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = Taro.getSystemInfoSync().pixelRatio;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // White background with rounded corners
        ctx.fillStyle = '#FFFFFF';
        roundRect(ctx, 0, 0, width, height, 24);
        ctx.fill();

        // Top accent bar
        ctx.fillStyle = '#E89F71';
        roundRect(ctx, 0, 0, width, 6, 0);
        ctx.fill();

        let currentY = 40;

        // Cat avatar + name row
        const avatarSize = 48;
        const avatarX = 28;
        const avatarY = currentY;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();

        if (catAvatar) {
          const img = await loadImage(canvas, catAvatar);
          if (img) {
            ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
          } else {
            ctx.fillStyle = '#FEF6F0';
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#FEF6F0';
          ctx.fill();
        }
        ctx.restore();

        // Cat name
        ctx.fillStyle = '#633E1D';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(catName, avatarX + avatarSize + 12, avatarY + 30);

        // Date
        ctx.fillStyle = 'rgba(99, 62, 29, 0.4)';
        ctx.font = '12px sans-serif';
        const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        ctx.fillText(dateStr, avatarX + avatarSize + 12, avatarY + 46);

        currentY = avatarY + avatarSize + 20;

        // Media image (if exists)
        if (mediaUrl) {
          const mediaX = 28;
          const mediaW = width - 56;
          const mediaH = 280;
          ctx.save();
          roundRect(ctx, mediaX, currentY, mediaW, mediaH, 12);
          ctx.clip();
          const img = await loadImage(canvas, mediaUrl);
          if (img) {
            // Cover fit
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
            ctx.fillStyle = '#FEF6F0';
            ctx.fillRect(mediaX, currentY, mediaW, mediaH);
          }
          ctx.restore();
          currentY += mediaH + 16;
        }

        // Diary content text
        ctx.fillStyle = '#3C2710';
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'left';
        const maxTextWidth = width - 56;
        const lineHeight = 24;
        const maxLines = mediaUrl ? 4 : 8;
        const lines = wrapText(ctx, content, maxTextWidth, maxLines);
        lines.forEach((line, i) => {
          ctx.fillText(line, 28, currentY + i * lineHeight);
        });
        currentY += lines.length * lineHeight + 20;

        // Bottom section: QR code + branding
        const bottomY = height - 100;

        // Divider line
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.fillRect(28, bottomY - 12, width - 56, 1);

        // QR code (small, left side)
        const qrSize = 64;
        const qrX = 28;
        const qrY = bottomY;
        drawQROnCanvas(ctx, 'miao://diary', qrX, qrY, qrSize, '#633E1D', '#FFFFFF');

        // Branding text (right of QR)
        ctx.fillStyle = '#633E1D';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Miao', qrX + qrSize + 16, qrY + 24);
        ctx.fillStyle = 'rgba(99, 62, 29, 0.5)';
        ctx.font = '11px sans-serif';
        ctx.fillText('长按识别小程序码', qrX + qrSize + 16, qrY + 44);
        ctx.fillText('记录猫咪的美好时光', qrX + qrSize + 16, qrY + 60);

        // Export
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
  });
}