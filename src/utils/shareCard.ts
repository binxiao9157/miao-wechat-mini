/**
 * Generate a 9:16 vertical share card image for WeChat Moments.
 * Uses Taro Canvas 2D API. Design based on Miao Journal social share mockup.
 */
import Taro from '@tarojs/taro';
import { drawQROnCanvas } from './qrCanvas';

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
  brandBrown: '#874D20',
  brandOrange: '#E69B67',
  brandBeige: '#FFF5F0',
  brandCream: '#FFE8D6',
  brandDark: '#1F1B17',
  borderWhite40: 'rgba(255, 255, 255, 0.4)',
  frostedWhite: 'rgba(255, 255, 255, 0.2)',
  frostedBorder: 'rgba(255, 255, 255, 0.3)',
};

interface ShareCardOptions {
  canvasId: string;
  catName: string;
  catAvatar?: string;
  content: string;
  mediaUrl?: string;
  createdAt?: number;
  logoUrl?: string;
  width?: number;
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

function roundRectTop(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
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

function extractTitle(content: string): { title: string; bodyContent: string } {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length >= 2 && firstLine.length <= 24) {
    const remaining = content.slice(firstLine.length).trim();
    if (remaining.length > 0) {
      return { title: firstLine, bodyContent: remaining };
    }
  }
  if (content.length > 0) {
    const truncated = content.slice(0, 20);
    return { title: truncated + (content.length > 20 ? '…' : ''), bodyContent: content };
  }
  return { title: '', bodyContent: content };
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp || Date.now());
  return `${date.getMonth() + 1}月${date.getDate()}日`;
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

function drawBlurOrb(ctx: any, x: number, y: number, radius: number, color: string) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255, 245, 240, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export async function generateShareCard(options: ShareCardOptions): Promise<string> {
  const {
    canvasId,
    catName,
    catAvatar,
    content,
    mediaUrl,
    createdAt,
    logoUrl,
    width = 600,
  } = options;

  const canvas = await queryCanvasNode(canvasId);
  const ctx = canvas.getContext('2d');
  const dpr = Taro.getSystemInfoSync().pixelRatio;

  const { title, bodyContent } = extractTitle(content);
  const dateStr = formatDate(createdAt || Date.now());
  const hasImage = !!mediaUrl;
  const footerH = 140;
  const bottomPadding = 24;
  const contentWidth = width - 48; // 552
  const textMaxWidth = width - 56; // 544

  // === Phase 1: Measure text to calculate dynamic height ===
  canvas.width = width * dpr;
  canvas.height = 3000 * dpr; // temporary large height for measurement
  ctx.scale(dpr, dpr);

  // Measure title lines
  ctx.font = 'bold 20px sans-serif';
  const titleLines = title ? wrapText(ctx, title, textMaxWidth, 2) : [];
  const maxBodyLines = hasImage ? 3 : 10;
  ctx.font = '14px sans-serif';
  const bodyLines = wrapText(ctx, bodyContent, textMaxWidth, maxBodyLines);

  // Calculate content height
  let measureY = 76; // after header

  if (hasImage) {
    measureY += Math.round(contentWidth * 5 / 4) + 20; // image + gap
  } else {
    measureY += 28 + 12; // date badge + gap
    // Cat avatar decorative area for text-only cards
    measureY += 80 + 20; // avatar circle + name + gap
  }

  if (title) {
    measureY += titleLines.length * 28 + 8;
  }

  measureY += 20; // heart divider

  measureY += bodyLines.length * 22 + 12; // body text

  measureY += 20; // gap before footer

  const height = Math.max(measureY + footerH + bottomPadding, 500);

  // === Phase 2: Reset canvas and draw with calculated height ===
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // === Outer shadow ===
  ctx.save();
  roundRect(ctx, 2, 4, width - 4, height - 4, 24);
  ctx.fillStyle = 'rgba(135, 77, 32, 0.12)';
  ctx.filter = 'blur(10px)';
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();

  // === Background gradient ===
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, COLORS.brandBeige);
  bgGrad.addColorStop(1, COLORS.brandCream);
  roundRect(ctx, 0, 0, width, height, 24);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // === Semi-transparent white border ===
  ctx.save();
  roundRect(ctx, 4, 4, width - 8, height - 8, 20);
  ctx.strokeStyle = COLORS.borderWhite40;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // === Decorative blur orbs (positioned relative to height) ===
  drawBlurOrb(ctx, 80, height * 0.23, 120, 'rgba(230, 155, 103, 0.06)');
  drawBlurOrb(ctx, 480, height * 0.51, 100, 'rgba(135, 77, 32, 0.04)');
  drawBlurOrb(ctx, 150, height * 0.79, 140, 'rgba(230, 155, 103, 0.05)');

  // === Header area ===
  let currentY = 28;

  // Miao logo image + text
  const logoSize = 28;
  const logoX = 28;
  const logoY = currentY + 4;
  const logoImg = logoUrl ? await loadImage(canvas, logoUrl) : null;
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    const logoGrad = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize);
    logoGrad.addColorStop(0, COLORS.primaryGradientStart);
    logoGrad.addColorStop(1, COLORS.primaryGradientEnd);
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = logoGrad;
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = COLORS.brandBrown;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Miao', logoX + logoSize + 8, currentY + 24);

  // "Daily Journal" capsule tag
  const tagText = 'Daily Journal';
  ctx.font = '11px sans-serif';
  const tagWidth = ctx.measureText(tagText).width + 20;
  const tagX = width - 28 - tagWidth;
  const tagY = currentY + 6;
  const tagH = 24;
  roundRect(ctx, tagX, tagY, tagWidth, tagH, 12);
  ctx.fillStyle = COLORS.frostedWhite;
  ctx.fill();
  ctx.fillStyle = COLORS.brandBrown;
  ctx.font = '11px sans-serif';
  ctx.fillText(tagText, tagX + 10, tagY + 16);

  currentY = 76;

  // === Main image (4:5 ratio) or text-only decorative area ===
  const mediaX = 24;

  if (hasImage) {
    const mediaH = Math.round(contentWidth * 5 / 4); // 690

    ctx.save();
    roundRect(ctx, mediaX, currentY, contentWidth, mediaH, 16);
    ctx.clip();

    const img = await loadImage(canvas, mediaUrl);
    if (img) {
      const imgRatio = img.width / img.height;
      const boxRatio = contentWidth / mediaH;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgRatio > boxRatio) {
        sw = img.height * boxRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / boxRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, mediaX, currentY, contentWidth, mediaH);
    } else {
      const imgGrad = ctx.createLinearGradient(mediaX, currentY, mediaX + contentWidth, currentY + mediaH);
      imgGrad.addColorStop(0, COLORS.primaryGradientStart);
      imgGrad.addColorStop(1, COLORS.primaryGradientEnd);
      ctx.fillStyle = imgGrad;
      ctx.fillRect(mediaX, currentY, contentWidth, mediaH);
    }

    // Date badge overlay (inside image, top-left)
    const badgeX = mediaX + 16;
    const badgeY = currentY + 16;
    ctx.font = '12px sans-serif';
    const badgeText = dateStr;
    const badgeTextWidth = ctx.measureText(badgeText).width;
    const badgeW = badgeTextWidth + 20;
    const badgeH = 28;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
    ctx.fillStyle = 'rgba(31, 27, 23, 0.6)';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px sans-serif';
    ctx.fillText(badgeText, badgeX + 10, badgeY + 19);

    ctx.restore();
    currentY += mediaH + 20;
  } else {
    // Text-only: date badge + centered cat avatar as decorative element
    ctx.font = '12px sans-serif';
    const badgeText = dateStr;
    const badgeTextWidth = ctx.measureText(badgeText).width;
    const badgeW = badgeTextWidth + 20;
    const badgeH = 28;
    roundRect(ctx, 28, currentY, badgeW, badgeH, 14);
    ctx.fillStyle = 'rgba(135, 77, 32, 0.08)';
    ctx.fill();
    ctx.fillStyle = COLORS.brandBrown;
    ctx.font = '12px sans-serif';
    ctx.fillText(badgeText, 38, currentY + 19);
    currentY += badgeH + 12;

    // Decorative cat avatar (larger, centered)
    const decoAvatarSize = 64;
    const decoAvatarX = (width - decoAvatarSize) / 2;
    const decoAvatarY = currentY;

    // Avatar shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(decoAvatarX + decoAvatarSize / 2 + 1, decoAvatarY + decoAvatarSize / 2 + 2, decoAvatarSize / 2 + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99, 62, 29, 0.08)';
    ctx.fill();
    ctx.restore();

    if (catAvatar) {
      const decoImg = await loadImage(canvas, catAvatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(decoAvatarX + decoAvatarSize / 2, decoAvatarY + decoAvatarSize / 2, decoAvatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      if (decoImg) {
        ctx.drawImage(decoImg, decoAvatarX, decoAvatarY, decoAvatarSize, decoAvatarSize);
      } else {
        const decoGrad = ctx.createLinearGradient(decoAvatarX, decoAvatarY, decoAvatarX + decoAvatarSize, decoAvatarY + decoAvatarSize);
        decoGrad.addColorStop(0, COLORS.primaryGradientStart);
        decoGrad.addColorStop(1, COLORS.primaryGradientEnd);
        ctx.fillStyle = decoGrad;
        ctx.fill();
      }
      ctx.restore();

      // Avatar white border
      ctx.save();
      ctx.beginPath();
      ctx.arc(decoAvatarX + decoAvatarSize / 2, decoAvatarY + decoAvatarSize / 2, decoAvatarSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.surface;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    } else {
      // No avatar: draw a gradient circle with paw icon
      const decoGrad = ctx.createLinearGradient(decoAvatarX, decoAvatarY, decoAvatarX + decoAvatarSize, decoAvatarY + decoAvatarSize);
      decoGrad.addColorStop(0, COLORS.primaryGradientStart);
      decoGrad.addColorStop(1, COLORS.primaryGradientEnd);
      ctx.save();
      ctx.beginPath();
      ctx.arc(decoAvatarX + decoAvatarSize / 2, decoAvatarY + decoAvatarSize / 2, decoAvatarSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = decoGrad;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(decoAvatarX + decoAvatarSize / 2, decoAvatarY + decoAvatarSize / 2, decoAvatarSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.surface;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Cat name below decorative avatar
    ctx.fillStyle = COLORS.brandBrown;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    const displayName = catName.length > 10 ? catName.slice(0, 10) + '…' : catName;
    ctx.fillText(displayName, width / 2, decoAvatarY + decoAvatarSize + 20);
    ctx.textAlign = 'left';

    currentY = decoAvatarY + decoAvatarSize + 36;
  }

  // === Title ===
  if (title) {
    ctx.fillStyle = COLORS.brandDark;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    const titleLinesDraw = wrapText(ctx, title, textMaxWidth, 2);
    const titleLineHeight = 28;
    titleLinesDraw.forEach((line, i) => {
      ctx.fillText(line, 28, currentY + i * titleLineHeight);
    });
    currentY += titleLinesDraw.length * titleLineHeight + 8;
  }

  // === Heart divider ===
  const divY = currentY + 4;
  const divGrad = ctx.createLinearGradient(36, divY, width - 36, divY);
  divGrad.addColorStop(0, 'rgba(230, 155, 103, 0)');
  divGrad.addColorStop(0.5, 'rgba(230, 155, 103, 0.3)');
  divGrad.addColorStop(1, 'rgba(230, 155, 103, 0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(36, divY, width - 72, 1);
  ctx.fillStyle = 'rgba(230, 155, 103, 0.5)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('♥', width / 2, divY + 4);
  ctx.textAlign = 'left';
  currentY = divY + 16;

  // === Body content text ===
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  const lines = wrapText(ctx, bodyContent, textMaxWidth, maxBodyLines);
  const lineHeight = 22;
  lines.forEach((line, i) => {
    ctx.fillText(line, 28, currentY + i * lineHeight);
  });
  currentY += lines.length * lineHeight + 12;

  // Add gap before footer
  currentY += 20;

  // === QR Footer ===
  const footerY = currentY;

  // Frosted glass background
  ctx.save();
  roundRectTop(ctx, 0, footerY, width, footerH, 16);
  ctx.fillStyle = COLORS.frostedWhite;
  ctx.fill();
  ctx.restore();

  // Top border of footer
  ctx.fillStyle = COLORS.frostedBorder;
  ctx.fillRect(24, footerY, width - 48, 1);

  // QR code with micro-rotation
  const qrSize = 80;
  const qrPad = 8;
  const qrX = 28;
  const qrY = footerY + (footerH - qrSize) / 2 - 4;

  ctx.save();
  const qrCenterX = qrX + qrSize / 2;
  const qrCenterY = qrY + qrSize / 2;
  ctx.translate(qrCenterX, qrCenterY);
  ctx.rotate(3 * Math.PI / 180);
  ctx.translate(-qrCenterX, -qrCenterY);

  roundRect(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 10);
  ctx.fillStyle = COLORS.surface;
  ctx.fill();
  ctx.save();
  roundRect(ctx, qrX - qrPad + 1, qrY - qrPad + 2, qrSize + qrPad * 2, qrSize + qrPad * 2, 10);
  ctx.fillStyle = 'rgba(135, 77, 32, 0.06)';
  ctx.fill();
  ctx.restore();

  drawQROnCanvas(ctx, 'miao://diary', qrX, qrY, qrSize, COLORS.brandBrown, COLORS.surface);
  ctx.restore();

  // Branding text (right of QR)
  const brandX = qrX + qrSize + qrPad * 2 + 16;
  const brandStartY = footerY + 28;

  ctx.fillStyle = COLORS.brandBrown;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Scan to meet', brandX, brandStartY);

  ctx.fillStyle = COLORS.onSurfaceLight;
  ctx.font = '12px sans-serif';
  ctx.fillText('My Digital Cat', brandX, brandStartY + 22);

  ctx.fillStyle = COLORS.textTertiary;
  ctx.font = '11px sans-serif';
  ctx.fillText('Miao Mini Program', brandX, brandStartY + 44);

  // === Cat avatar + name (bottom-right corner of footer) ===
  if (catAvatar && hasImage) {
    const avatarSize = 36;
    const avatarX = width - 28 - avatarSize;
    const avatarY = footerY + (footerH - avatarSize) / 2 - 6;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    const avatarImg = await loadImage(canvas, catAvatar);
    if (avatarImg) {
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      avatarGrad.addColorStop(0, COLORS.primaryGradientStart);
      avatarGrad.addColorStop(1, COLORS.primaryGradientEnd);
      ctx.fillStyle = avatarGrad;
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.surface;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = COLORS.brandBrown;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const displayName = catName.length > 6 ? catName.slice(0, 6) + '…' : catName;
    ctx.fillText(displayName, avatarX + avatarSize / 2, avatarY + avatarSize + 14);
    ctx.textAlign = 'left';
  }

  // === Export ===
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