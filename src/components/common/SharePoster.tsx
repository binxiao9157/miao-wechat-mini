import { View, Text, Image, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { drawQROnCanvas } from '../../utils/qrCanvas';
import './SharePoster.less';

interface SharePosterProps {
  visible: boolean;
  catName?: string;
  catAvatar?: string;
  content?: string;
  mediaUrl?: string;
  onClose: () => void;
}

const LOGO_IMG = require('../../assets/logo.png');

export default function SharePoster({ visible, catName = '猫咪', catAvatar, content = '', mediaUrl, onClose }: SharePosterProps) {
  if (!visible) return null;

  const canvasId = 'sharePosterCanvas';
  const posterWidth = 540;
  const posterHeight = 800;

  const drawPoster = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const query = Taro.createSelectorQuery();
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

          canvas.width = posterWidth * dpr;
          canvas.height = posterHeight * dpr;
          ctx.scale(dpr, dpr);

          const w = posterWidth;
          const h = posterHeight;

          // Background gradient
          const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
          bgGrad.addColorStop(0, '#FFF9F5');
          bgGrad.addColorStop(1, '#FEF0E6');
          ctx.fillStyle = bgGrad;
          roundRect(ctx, 0, 0, w, h, 24);
          ctx.fill();

          // Top accent bar
          ctx.fillStyle = '#E89F71';
          roundRect(ctx, 0, 0, w, 6, 0);
          ctx.fill();

          // App branding area
          ctx.fillStyle = '#633E1D';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Miao', 28, 48);
          ctx.fillStyle = 'rgba(99, 62, 29, 0.5)';
          ctx.font = '12px sans-serif';
          ctx.fillText('记录猫咪的美好时光', 80, 48);

          // Cat avatar circle
          const avatarSize = 64;
          const avatarX = 28;
          const avatarY = 72;
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.clip();
          if (catAvatar) {
            try {
              const img = canvas.createImage();
              img.src = catAvatar;
              await new Promise<void>((imgResolve) => {
                img.onload = () => { ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize); imgResolve(); };
                img.onerror = () => { ctx.fillStyle = '#FEF6F0'; ctx.fill(); imgResolve(); };
              });
            } catch {
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
          ctx.fillText(catName, avatarX + avatarSize + 16, avatarY + 28);
          ctx.fillStyle = 'rgba(99, 62, 29, 0.5)';
          ctx.font = '13px sans-serif';
          const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
          ctx.fillText(dateStr, avatarX + avatarSize + 16, avatarY + 50);

          // Media area (if image exists)
          let contentStartY = avatarY + avatarSize + 24;
          if (mediaUrl) {
            const mediaX = 28;
            const mediaY = contentStartY;
            const mediaW = w - 56;
            const mediaH = 280;
            ctx.save();
            roundRect(ctx, mediaX, mediaY, mediaW, mediaH, 16);
            ctx.clip();
            try {
              const img = canvas.createImage();
              img.src = mediaUrl;
              await new Promise<void>((imgResolve) => {
                img.onload = () => { ctx.drawImage(img, mediaX, mediaY, mediaW, mediaH); imgResolve(); };
                img.onerror = () => { ctx.fillStyle = '#FEF6F0'; ctx.fillRect(mediaX, mediaY, mediaW, mediaH); imgResolve(); };
              });
            } catch {
              ctx.fillStyle = '#FEF6F0';
              ctx.fillRect(mediaX, mediaY, mediaW, mediaH);
            }
            ctx.restore();
            contentStartY = mediaY + mediaH + 20;
          }

          // Diary content text
          ctx.fillStyle = '#3C2710';
          ctx.font = '15px sans-serif';
          ctx.textAlign = 'left';
          const maxTextWidth = w - 56;
          const lineHeight = 24;
          const maxLines = mediaUrl ? 5 : 10;
          const lines = wrapText(ctx, content, maxTextWidth, maxLines);
          lines.forEach((line, i) => {
            ctx.fillText(line, 28, contentStartY + i * lineHeight);
          });

          // QR code area at bottom
          const qrSize = 100;
          const qrX = (w - qrSize) / 2;
          const qrY = h - 180;

          // QR background
          ctx.fillStyle = '#ffffff';
          roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 60, 12);
          ctx.fill();

          // Draw QR code (mini-program path)
          const qrContent = 'miao://diary';
          drawQROnCanvas(ctx, qrContent, qrX, qrY, qrSize, '#3C2710', '#ffffff');

          // QR label
          ctx.fillStyle = 'rgba(99, 62, 29, 0.6)';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('长按识别小程序码', w / 2, qrY + qrSize + 20);

          // Bottom text
          ctx.fillStyle = 'rgba(99, 62, 29, 0.3)';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Miao · 猫咪陪伴', w / 2, h - 24);

          // Export
          setTimeout(() => {
            Taro.canvasToTempFilePath({
              canvas,
              width: posterWidth,
              height: posterHeight,
              destWidth: posterWidth * 2,
              destHeight: posterHeight * 2,
              success: (tempRes) => resolve(tempRes.tempFilePath),
              fail: (err) => reject(err),
            });
          }, 200);
        });
    });
  };

  const handleSaveToAlbum = async () => {
    try {
      Taro.showLoading({ title: '生成海报中...' });
      const tempPath = await drawPoster();
      Taro.hideLoading();

      // Check permission
      const setting = await Taro.getSetting();
      if (!setting.authSetting['scope.writePhotosAlbum']) {
        try {
          await Taro.authorize({ scope: 'scope.writePhotosAlbum' });
        } catch {
          await Taro.showModal({
            title: '需要相册权限',
            content: '保存海报需要您授权访问相册，是否前往设置？',
          });
          Taro.openSetting();
          return;
        }
      }

      await Taro.saveImageToPhotosAlbum({ filePath: tempPath });
      Taro.showToast({ title: '已保存到相册', icon: 'success' });
    } catch (err) {
      Taro.hideLoading();
      console.error('Save poster failed:', err);
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  };

  const handleShareMoments = async () => {
    try {
      Taro.showLoading({ title: '生成海报中...' });
      const tempPath = await drawPoster();
      Taro.hideLoading();

      // Check permission
      const setting = await Taro.getSetting();
      if (!setting.authSetting['scope.writePhotosAlbum']) {
        try {
          await Taro.authorize({ scope: 'scope.writePhotosAlbum' });
        } catch {
          await Taro.showModal({
            title: '需要相册权限',
            content: '分享朋友圈需要保存海报到相册，是否前往设置？',
          });
          Taro.openSetting();
          return;
        }
      }

      await Taro.saveImageToPhotosAlbum({ filePath: tempPath });
      Taro.showModal({
        title: '海报已保存',
        content: '海报已保存到相册，请打开微信朋友圈，选择该图片发布即可',
        showCancel: false,
        confirmText: '去发布',
      });
    } catch (err) {
      Taro.hideLoading();
      console.error('Share moments failed:', err);
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  };

  return (
    <View className="poster-overlay" onClick={onClose}>
      <View className="poster-modal" onClick={(e) => e.stopPropagation()}>
        <View className="poster-header">
          <Text className="poster-title">分享到朋友圈</Text>
          <View className="poster-close" onClick={onClose}>
            <Text className="poster-close-text">✕</Text>
          </View>
        </View>

        {/* Canvas (off-screen for generation) */}
        <Canvas
          type="2d"
          id={canvasId}
          style={{ width: posterWidth + 'px', height: posterHeight + 'px', position: 'fixed', left: '-9999px', top: '-9999px' }}
        />

        {/* Poster preview placeholder */}
        <View className="poster-preview">
          <View className="poster-preview-card">
            <View className="poster-preview-top">
              <View className="poster-preview-avatar" style={catAvatar ? { backgroundImage: `url(${catAvatar})` } : {}} />
              <View className="poster-preview-info">
                <Text className="poster-preview-name">{catName}</Text>
                <Text className="poster-preview-date">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</Text>
              </View>
            </View>
            {mediaUrl && (
              <Image className="poster-preview-media" src={mediaUrl} mode="aspectFill" />
            )}
            <Text className="poster-preview-content">{content.length > 60 ? content.slice(0, 60) + '...' : content}</Text>
            <View className="poster-preview-bottom">
              <Text className="poster-preview-hint">长按识别小程序码</Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View className="poster-actions">
          <View className="poster-btn save" onClick={handleSaveToAlbum}>
            <Text className="poster-btn-text">保存到相册</Text>
          </View>
          <View className="poster-btn share" onClick={handleShareMoments}>
            <Text className="poster-btn-text share-text">分享朋友圈</Text>
          </View>
        </View>
      </View>
    </View>
  );
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
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '...';
  }
  return lines;
}