# 微信小程序样式体系与组件复用优化方案

> 生成日期：2026-05-05
> 前置条件：不改变任何现有功能，仅做内部重构

---

## 一、现状诊断

### 1.1 与 PWA 的差距

| 维度 | 微信小程序 | PWA | 差距 |
|------|-----------|-----|------|
| 样式方案 | Less + rpx + 硬编码颜色 | Tailwind CSS 4 + 设计令牌 | PWA 用 Token 统一，小程序散落 |
| 硬编码颜色 | 86 种唯一色值，~700+ 处引用 | 36 种，~220 处引用 | 小程序是 PWA 的 3 倍 |
| 图标方案 | PNG 图片 + `.icon-img` 泄漏 32 文件 | Lucide React SVG 组件 | PWA 零泄漏 |
| 通用头部 | PageHeader 组件存在但 0 页面使用 | PageHeader 全局复用 | 小程序 25 页自建头部 |
| 确认弹窗 | 3 页独立实现，无共享组件 | Framer Motion ConfirmModal | 小程序零复用 |
| 日记卡片 | DiaryCard 组件存在但未使用 | DiaryCard 全局复用 | 小程序日记页 1094 行内联 |
| 评论组件 | CommentInput/CommentItem 存在但未使用 | 全局复用 | 同上 |
| 按钮样式 | 5+ 页重复实现 danger/cancel/primary | Tailwind 复合类 | 小程序无复用 |

### 1.2 核心问题清单

| # | 问题 | 影响范围 | 严重程度 |
|---|------|---------|---------|
| 1 | `.icon-img { display: block }` 在 32 个 .less 文件重复定义 | 32 文件 | 🟠 |
| 2 | PageHeader 组件存在但未被任何页面采用 | 25 页自建头部 | 🔴 |
| 3 | 86 种硬编码颜色值未走 CSS 变量 | ~700 处 | 🔴 |
| 4 | 无共享确认弹窗组件 | 3 页独立实现 | 🟠 |
| 5 | DiaryCard/CommentInput/CommentItem 组件未使用 | diary 页 1094 行 | 🔴 |
| 6 | 按钮样式（danger/cancel/primary）在 5+ 页重复 | 5+ 页 | 🟡 |
| 7 | 弹窗遮罩层模式在 14+ 处重复 | 14+ 处 | 🟡 |
| 8 | app.less 已有设计令牌但页面未使用 | 全局 | 🟠 |

---

## 二、优化方案（5 个阶段）

### 阶段一：消除全局污染（预估 30 分钟）

#### 1.1 将 `.icon-img` 收归 app.less

**现状**：32 个 .less 文件各自定义 `.icon-img { display: block; }`，存在样式覆盖风险。

**操作**：

1. 在 `app.less` 末尾添加：
```less
/* 全局图标图片基准样式 */
.icon-img {
  display: block;
}
```

2. 从 32 个文件中删除 `.icon-img` 规则（保留文件内其他样式不变）。涉及文件：

```
src/components/common/DiaryCard.less
src/components/common/CommentInput.less
src/components/common/ShareSheet.less
src/components/layout/PageHeader.less
src/pages/add-friend-qr/index.less
src/pages/cat-history/index.less
src/pages/cat-player/index.less
src/pages/change-password/index.less
src/pages/create-companion/index.less
src/pages/diary/index.less
src/pages/download/index.less
src/pages/edit-profile/index.less
src/pages/empty-cat/index.less
src/pages/feedback/index.less
src/pages/generation-progress/index.less
src/pages/home/index.less
src/pages/login/index.less
src/pages/notification-list/index.less
src/pages/notifications/index.less
src/pages/points/index.less
src/pages/privacy-policy/index.less
src/pages/privacy-settings/index.less
src/pages/profile/index.less
src/pages/register/index.less
src/pages/reset-password/index.less
src/pages/scan-friend/index.less
src/pages/switch-companion/index.less
src/pages/time-letters/index.less
src/pages/upload-material/index.less
src/pages/welcome/index.less
src/pages/accompany-milestone/index.less
src/pages/cat-start/index.less
```

3. 每删除一个文件的 `.icon-img` 规则后，确认该文件仍正常工作（`display: block` 已由 app.less 全局提供）。

#### 1.2 补全 app.less CSS 变量

当前 app.less 仅定义了 12 个变量，但页面大量使用未覆盖的颜色。需补充：

```less
:root {
  /* === 已有变量保持不变 === */

  /* === 新增：文字色阶 === */
  --text-primary: #1C1B1F;
  --text-secondary: #79747E;
  --text-hint: rgba(93, 64, 55, 0.5);
  --text-link: #E89F71;

  /* === 新增：功能色 === */
  --color-danger: #FF4D4F;
  --color-success: #4CAF50;
  --color-warning: #FF9800;

  /* === 新增：品牌辅助色 === */
  --color-warm-brown: #5D4037;
  --color-warm-brown-light: #D99B7A;
  --color-warm-brown-muted: rgba(93, 64, 55, 0.6);
  --color-warm-cream: #FEF6F0;
  --color-warm-cream-dark: #F5F0EB;
  --color-overlay: rgba(0, 0, 0, 0.5);
  --color-overlay-dark: rgba(0, 0, 0, 0.85);

  /* === 新增：圆角令牌 === */
  --radius-sm: 16rpx;
  --radius-md: 24rpx;
  --radius-lg: 32rpx;
  --radius-xl: 48rpx;
  --radius-full: 999rpx;

  /* === 新增：阴影令牌 === */
  --shadow-sm: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  --shadow-md: 0 12rpx 34rpx rgba(99, 62, 29, 0.08);
  --shadow-lg: 0 18rpx 48rpx rgba(99, 62, 29, 0.11);
}
```

**迁移策略**：逐页替换硬编码色值为变量引用，每改一页即编译验证。优先替换高频色值：

| 硬编码值 | 变量引用 | 出现次数（约） |
|---------|---------|-------------|
| `#5D4037` | `var(--color-warm-brown)` | ~60 |
| `#D99B7A` | `var(--color-warm-brown-light)` | ~40 |
| `#FF9D76` | `var(--primary-strong)` | ~30 |
| `#FEF6F0` | `var(--color-warm-cream)` | ~25 |
| `#1C1B1F` | `var(--text-primary)` | ~20 |
| `#FF4D4F` | `var(--color-danger)` | ~15 |
| `#79747E` | `var(--text-secondary)` | ~15 |

---

### 阶段二：复用 PageHeader 组件（预估 1 小时）

#### 2.1 重写 PageHeader 匹配现有设计

当前 PageHeader.less 使用 px 和硬编码颜色（#333、#666），与小程序设计语言不一致。需重写为 rpx + CSS 变量版本：

**`src/components/layout/PageHeader.less`**：
```less
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  padding-top: var(--nav-top, calc(env(safe-area-inset-top) + 20rpx));

  .header-left {
    width: 72rpx;
  }

  .back-btn {
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-warm-brown);
  }

  .header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .header-title {
    font-size: 36rpx;
    font-weight: 700;
    color: var(--color-warm-brown);
  }

  .header-subtitle {
    font-size: 22rpx;
    color: var(--text-hint);
    margin-top: 4rpx;
  }

  .header-right {
    width: 72rpx;
    display: flex;
    justify-content: flex-end;
  }
}
```

**`src/components/layout/PageHeader.tsx`** 增强：
```tsx
import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
const ARROWLEFT_PNG = require('../../assets/profile-icons/arrowleft-dark.png');
import './index.less';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightElement,
}: PageHeaderProps) {
  const navSpace = useNavSpace();

  return (
    <View className="page-header" style={navSpace as React.CSSProperties}>
      <View className="header-left">
        {showBack && (
          <View className="back-btn" onClick={() => onBack ? onBack() : navigateBack()}>
            <Image className="icon-img" src={ARROWLEFT_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
          </View>
        )}
      </View>
      <View className="header-center">
        <Text className="header-title">{title}</Text>
        {subtitle && <Text className="header-subtitle">{subtitle}</Text>}
      </View>
      <View className="header-right">
        {rightElement}
      </View>
    </View>
  );
}
```

#### 2.2 逐步替换页面头部

25 个页面有自建头部，按以下顺序替换（先简单后复杂）：

**第一批（结构完全匹配，直接替换）**：

| 页面 | 自建头部结构 | 替换方式 |
|------|------------|---------|
| `change-password` | 返回+标题+空右 | `<PageHeader title="修改密码" />` |
| `reset-password` | 返回+标题+空右 | `<PageHeader title="重置密码" />` |
| `cat-history` | 返回+标题+空右 | `<PageHeader title="猫咪历史" />` |
| `switch-companion` | 返回+标题+空右 | `<PageHeader title="切换猫咪" />` |
| `accompany-milestone` | 返回+标题+空右 | `<PageHeader title="陪伴里程碑" />` |
| `notification-list` | 返回+标题+空右 | `<PageHeader title="通知" />` |
| `privacy-policy` | 返回+标题+空右 | `<PageHeader title="隐私政策" />` |
| `terms-of-service` | 返回+标题+空右 | `<PageHeader title="服务条款" />` |
| `feedback` | 返回+标题+空右 | `<PageHeader title="反馈" />` |
| `download` | 返回+标题+空右 | `<PageHeader title="下载" />` |
| `cat-player` | 返回+标题+空右 | `<PageHeader title="猫咪播放" />` |
| `edit-profile` | 返回+标题+空右 | `<PageHeader title="编辑资料" />` |

**第二批（需要 subtitle 或 rightElement）**：

| 页面 | 特殊需求 | 替换方式 |
|------|---------|---------|
| `add-friend-qr` | title="面对面添加" subtitle="Face-to-Face" | `<PageHeader title="面对面添加" subtitle="Face-to-Face" />` |
| `scan-friend` | title="扫一扫" subtitle="Scan" | `<PageHeader title="扫一扫" subtitle="Scan" />` |
| `notifications` | 右侧有开关 | `<PageHeader title="通知设置" rightElement={...} />` |
| `create-companion` | 右侧有跳过 | `<PageHeader title="创建猫咪" rightElement={...} />` |

**第三批（头部结构特殊，暂不替换）**：

| 页面 | 原因 |
|------|------|
| `home` | 无传统头部（猫咪全屏互动） |
| `diary` | Tab 页，头部含 Tab 切换 |
| `time-letters` | Tab 页，头部含标题点击调试 |
| `points` | Tab 页，头部含标题点击调试 |
| `profile` | Tab 页，头部含头像+管理入口 |
| `login/register/welcome` | 全屏引导页，头部结构不同 |

每替换一个页面后：
1. 删除该页面 .less 中的 `.header`/`.back-btn`/`.header-title` 等头部样式
2. 删除 `.icon-img` 规则（已在阶段一处理）
3. 编译验证页面显示正常

---

### 阶段三：提取共享组件（预估 2 小时）

#### 3.1 ConfirmModal 确认弹窗组件

**现状**：`profile/index.tsx`、`time-letters/index.tsx`、`diary/index.tsx` 各自实现确认弹窗，结构相同但样式不同。

**新建 `src/components/common/ConfirmModal.tsx`**：
```tsx
import React from 'react';
import { View, Text } from '@tarojs/components';
import './ConfirmModal.less';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export default function ConfirmModal({
  visible,
  title,
  description,
  confirmText = '确定',
  cancelText = '取消',
  confirmStyle = 'primary',
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <View className="confirm-modal-overlay" onClick={onCancel}>
      <View className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        {children || (
          <>
            <Text className="confirm-modal-title">{title}</Text>
            {description && <Text className="confirm-modal-desc">{description}</Text>}
          </>
        )}
        <View className="confirm-modal-actions">
          <View className="confirm-modal-btn cancel" onClick={onCancel}>
            <Text>{cancelText}</Text>
          </View>
          <View className={`confirm-modal-btn ${confirmStyle}`} onClick={onConfirm}>
            <Text>{confirmText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
```

**新建 `src/components/common/ConfirmModal.less`**：
```less
.confirm-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-modal {
  width: 560rpx;
  background: var(--surface);
  border-radius: var(--radius-xl);
  padding: 56rpx 48rpx 40rpx;
  text-align: center;
}

.confirm-modal-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--color-warm-brown);
  margin-bottom: 16rpx;
}

.confirm-modal-desc {
  display: block;
  font-size: 28rpx;
  color: var(--text-hint);
  line-height: 1.5;
  margin-bottom: 48rpx;
}

.confirm-modal-actions {
  display: flex;
  gap: 24rpx;
}

.confirm-modal-btn {
  flex: 1;
  height: 88rpx;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
}

.confirm-modal-btn.cancel {
  background: var(--surface-container);
  color: var(--text-secondary);
}

.confirm-modal-btn.primary {
  background: var(--primary);
  color: #fff;
}

.confirm-modal-btn.danger {
  background: var(--color-danger);
  color: #fff;
}
```

**替换计划**：

| 页面 | 原有弹窗 | 替换为 |
|------|---------|-------|
| `profile/index.tsx` | `.modal-mask` + `.modal-content` | `<ConfirmModal>` |
| `time-letters/index.tsx` | `.modal-overlay` + 强制解锁弹窗 | `<ConfirmModal confirmStyle="danger">` |
| `diary/index.tsx` | 删除日记确认弹窗 | `<ConfirmModal confirmStyle="danger">` |

#### 3.2 启用 DiaryCard 组件

**现状**：`src/components/common/DiaryCard.tsx` 已存在但未被 `diary/index.tsx` 使用，日记页内联渲染每张卡片。

**操作步骤**：

1. 检查 `DiaryCard.tsx` 的 props 接口是否覆盖日记页当前渲染的所有字段
2. 补充缺失的 props（如好友日记标识、删除按钮等）
3. 在 `diary/index.tsx` 中将内联日记卡片替换为 `<DiaryCard>`
4. 预计 diary 页代码量从 ~1094 行减少至 ~700 行

#### 3.3 启用 CommentInput / CommentItem 组件

**现状**：`CommentInput.tsx` 和 `CommentItem.tsx` 已存在但未被日记页使用。

**操作步骤**：

1. 检查 CommentInput 是否支持当前的行内输入+发送按钮布局（阶段二已改造）
2. 检查 CommentItem 是否支持长按删除气泡菜单
3. 如果组件接口不匹配，扩展 props 而非修改调用方
4. 替换日记页中的内联评论渲染

---

### 阶段四：Less Mixins 消除重复模式（预估 1 小时）

#### 4.1 创建 `src/styles/mixins.less`

```less
/* === 遮罩层 === */
.backdrop-overlay() {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay);
  z-index: 1000;
}

/* === 卡片容器 === */
.miao-card() {
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}

/* === 底部弹出面板 === */
.bottom-sheet() {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 40rpx 32rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 40rpx);
  z-index: 1001;
}

/* === 主要按钮 === */
.btn-primary() {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%);
  color: #fff;
  border-radius: var(--radius-full);
  font-weight: 700;
  border: none;
}

/* === 危险按钮 === */
.btn-danger() {
  background: var(--color-danger);
  color: #fff;
  border-radius: var(--radius-full);
  font-weight: 600;
  border: none;
}

/* === 取消按钮 === */
.btn-cancel() {
  background: var(--surface-container);
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  border: none;
}

/* === 底部安全区 === */
.safe-bottom() {
  padding-bottom: calc(env(safe-area-inset-bottom) + 48rpx);
}

/* === 输入框 === */
.miao-input() {
  width: 100%;
  padding: 24rpx 32rpx;
  border-radius: var(--radius-full);
  border: 2rpx solid var(--outline);
  background: var(--surface);
  font-size: 28rpx;
  color: var(--color-warm-brown);

  &:focus {
    border-color: var(--primary);
  }

  &::placeholder {
    color: var(--on-surface-variant);
  }
}

/* === 列表项 === */
.list-item() {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: var(--surface);
  border-bottom: 1rpx solid var(--outline-variant);

  &:last-child {
    border-bottom: none;
  }
}
```

#### 4.2 在页面中引用 Mixins

```less
/* 替换前 — diary/index.less */
.comment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* 替换后 */
@import '../../styles/mixins.less';

.comment-modal-overlay {
  .backdrop-overlay();
}
```

**受影响页面**（使用遮罩层模式的）：

| 页面 | 当前遮罩实现 | 替换为 |
|------|------------|-------|
| `diary` | `.comment-modal-overlay` | `.backdrop-overlay()` |
| `profile` | `.modal-mask` | `.backdrop-overlay()` |
| `time-letters` | `.modal-overlay` | `.backdrop-overlay()` |
| `points` | `.modal-mask` | `.backdrop-overlay()` |
| `home` | `.compose-overlay` | `.backdrop-overlay()` |
| `create-companion` | 弹窗遮罩 | `.backdrop-overlay()` |
| `switch-companion` | 弹窗遮罩 | `.backdrop-overlay()` |

---

### 阶段五：颜色迁移（预估 2-3 小时，可渐进执行）

#### 5.1 迁移策略

采用「渐进替换」策略，不一次性全改，而是按页面分批替换：

**批次 1：高频色值全局替换**（风险最低，可批量 sed）

| 旧值 | 新值 | 出现文件数（约） |
|------|------|---------------|
| `#5D4037` | `var(--color-warm-brown)` | ~25 |
| `#D99B7A` | `var(--color-warm-brown-light)` | ~20 |
| `#FF9D76` | `var(--primary-strong)` | ~15 |
| `#FEF6F0` | `var(--color-warm-cream)` | ~15 |
| `#FFF9F5` | `var(--background)` | ~10 |
| `#1C1B1F` | `var(--text-primary)` | ~10 |
| `#FF4D4F` | `var(--color-danger)` | ~8 |
| `#79747E` | `var(--text-secondary)` | ~8 |

**批次 2：中频色值逐页替换**

| 旧值 | 新值 | 出现文件数（约） |
|------|------|---------------|
| `rgba(93, 64, 55, 0.5)` | `var(--text-hint)` | ~10 |
| `rgba(93, 64, 55, 0.6)` | `var(--color-warm-brown-muted)` | ~8 |
| `rgba(0, 0, 0, 0.5)` | `var(--color-overlay)` | ~7 |
| `rgba(0, 0, 0, 0.85)` | `var(--color-overlay-dark)` | ~3 |
| `#F5F0EB` | `var(--color-warm-cream-dark)` | ~5 |
| `#4CAF50` | `var(--color-success)` | ~3 |

**批次 3：低频/一次性色值**

剩余的低频色值（如特定页面的渐变色、动画色等）可暂不替换，保持原样。这些色值通常与特定视觉效果绑定，强行变量化反而降低可读性。

#### 5.2 替换验证

每个批次替换后：
1. 运行 `npm run build:weapp` 编译
2. 在微信开发者工具中逐页检查视觉是否一致
3. 特别注意渐变色、阴影、透明度混合的场景

---

## 三、预期收益

### 3.1 量化指标

| 指标 | 优化前 | 优化后 | 改善 |
|------|-------|-------|------|
| `.icon-img` 重复定义 | 32 文件 | 1 文件 (app.less) | -97% |
| PageHeader 使用率 | 0/25 页 | ~16/25 页 | +64% |
| 硬编码颜色引用 | ~700 处 | ~200 处（仅保留低频） | -71% |
| 确认弹窗实现 | 3 套独立 | 1 套共享 | -67% |
| diary/index.tsx 行数 | ~1094 行 | ~700 行 | -36% |
| 遮罩层重复代码 | 7+ 处 | 1 个 mixin | -85% |
| 按钮样式重复 | 5+ 页 | 1 个 mixin | -80% |

### 3.2 维护性提升

- **改一处在全局生效**：修改品牌色只需改 `:root` 变量，无需逐页搜索替换
- **组件复用减少 Bug**：确认弹窗、头部等共享组件的修复只需改一处
- **新页面开发加速**：使用 PageHeader + ConfirmModal + mixins，新页面只需关注业务逻辑
- **代码审查更聚焦**：日记页从 1094 行降至 ~700 行，可读性大幅提升

---

## 四、执行顺序与风险控制

### 4.1 推荐执行顺序

```
阶段一（icon-img + CSS变量补全） → 阶段四（mixins） → 阶段二（PageHeader） → 阶段三（共享组件） → 阶段五（颜色迁移）
```

理由：
- 阶段一风险最低，是后续所有工作的基础
- 阶段四（mixins）不改变任何页面行为，仅引入可复用的样式片段
- 阶段二（PageHeader）替换头部时可以同时使用 mixins
- 阶段三（共享组件）涉及 JSX 重构，应在样式基础设施稳定后执行
- 阶段五（颜色迁移）工作量最大，可分批渐进执行

### 4.2 风险控制

| 风险 | 缓解措施 |
|------|---------|
| CSS 变量在小程序端兼容性 | `:root` + `var()` 在微信小程序 WebView 中支持良好（基础库 2.x+），无兼容风险 |
| PageHeader 替换导致布局偏移 | 逐页替换，每页替换后编译+截图对比 |
| ConfirmModal 样式与原弹窗不一致 | 先统一弹窗样式令牌，再替换组件 |
| 颜色替换导致视觉差异 | 渐进替换，每批次编译验证；保留低频色值不替换 |
| DiaryCard 组件接口不匹配 | 先扩展组件 props，再替换调用方；保留原渲染逻辑作为 fallback |