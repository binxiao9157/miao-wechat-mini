/**
 * 图标组件 - 微信小程序兼容版
 * 使用 Text + Unicode/Emoji 渲染图标，避免 SVG 在小程序中不可用的问题
 */

import React from 'react';
import { Text, View } from '@tarojs/components';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

// 通用图标渲染器 - 使用 emoji/unicode 字符
function createTextIcon(emoji: string) {
  const IconComponent: React.FC<IconProps> = ({ size = 24, className }) => (
    <Text
      className={className}
      style={{ fontSize: size * 0.7, lineHeight: `${size}px`, display: 'inline-block', width: size, height: size, textAlign: 'center' }}
    >
      {emoji}
    </Text>
  );
  IconComponent.displayName = `Icon_${emoji}`;
  return IconComponent;
}

// 通用图标渲染器 - 使用 Unicode 箭头/符号（支持 color）
function createSymbolIcon(getSymbol: (color: string) => string) {
  const IconComponent: React.FC<IconProps> = ({ size = 24, color = 'currentColor', className }) => (
    <Text
      className={className}
      style={{ fontSize: size * 0.65, lineHeight: `${size}px`, display: 'inline-block', width: size, height: size, textAlign: 'center', color }}
    >
      {getSymbol(color)}
    </Text>
  );
  return IconComponent;
}

// === 图标定义 ===

// 眼睛图标（用于密码显示/隐藏）
export const Eye = createTextIcon('👁');
export const EyeOff = createTextIcon('🙈');

// 爪印图标（品牌图标）
export const PawPrint = createTextIcon('🐾');

// 分享图标
export const Share2 = createTextIcon('🔗');

// 更多图标
export const MoreVertical = createTextIcon('⋯');

// 心形图标
export const Heart = createTextIcon('❤️');

// 评论图标
export const MessageCircle = createTextIcon('💬');

// 删除图标
export const Trash2 = createTextIcon('🗑️');

// 编辑图标
export const Edit3 = createTextIcon('✏️');

// 加号图标
export const Plus = createTextIcon('➕');

// 返回图标
export const ArrowLeft = createSymbolIcon(() => '←');

// 设置图标
export const Settings = createTextIcon('⚙️');

// 用户图标
export const User = createTextIcon('👤');

// 铃铛图标（通知）
export const Bell = createTextIcon('🔔');

// 日历图标
export const Calendar = createTextIcon('📅');

// 时钟图标
export const Clock = createTextIcon('🕐');

// 星星图标
export const Star = createTextIcon('⭐');

// 相机图标
export const Camera = createTextIcon('📷');

// 视频图标
export const Video = createTextIcon('🎥');

// 图片图标
export const ImageIcon = createTextIcon('🖼️');

// 发送图标
export const Send = createTextIcon('➤');

// 关闭图标
export const X = createSymbolIcon(() => '✕');

// 右箭头图标
export const ChevronRight = createSymbolIcon(() => '›');

// 硬币图标
export const Coins = createTextIcon('🪙');

// 下载图标
export const Download = createTextIcon('📥');

// 礼物图标
export const Gift = createTextIcon('🎁');

// 退出图标
export const LogOut = createTextIcon('🚪');

// 闪光图标
export const Sparkles = createTextIcon('✨');

// 上升趋势图标
export const TrendingUp = createTextIcon('📈');

// 添加用户图标
export const UserPlus = createTextIcon('👤+');

// 多用户图标
export const Users = createTextIcon('👥');

// 二维码图标
export const QrCode = createTextIcon('📱');

// 播放图标
export const Play = createSymbolIcon(() => '▶');

// 暂停图标
export const Pause = createSymbolIcon(() => '⏸');

// 勾选图标
export const CheckCircle = createTextIcon('✅');

// 刷新图标
export const RefreshCw = createTextIcon('🔄');

// 锁图标
export const Lock = createTextIcon('🔒');

// 邮件图标
export const Mail = createTextIcon('✉️');

// 上传图标
export const Upload = createTextIcon('📤');

// 警告图标
export const AlertCircle = createTextIcon('⚠️');

// 右箭头图标
export const ArrowRight = createSymbolIcon(() => '→');

// 盾牌图标
export const ShieldCheck = createTextIcon('🛡️');

// 扫描图标
export const Scan = createTextIcon('📷');

// 导出所有图标
export default {
  Eye,
  EyeOff,
  PawPrint,
  Share2,
  MoreVertical,
  Heart,
  MessageCircle,
  Trash2,
  Edit3,
  Plus,
  ArrowLeft,
  Settings,
  User,
  Bell,
  Calendar,
  Clock,
  Star,
  Camera,
  Video,
  ImageIcon,
  Send,
  X,
  ChevronRight,
  Coins,
  Download,
  Gift,
  LogOut,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  QrCode,
  Play,
  Pause,
  CheckCircle,
  RefreshCw,
  Lock,
  Mail,
  Upload,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Scan,
};