# 返回按钮一致性审计

> 生成日期：2026-05-05

---

## 一、实现方式分布

| 类型 | 页面数 | 说明 |
|------|--------|------|
| PageHeader 组件 | 16 页 | 统一组件，一致性最好 |
| 自定义箭头按钮 | 8 处 | 各自实现，样式差异大 |
| 文字按钮（"返回"） | 4 处 | 仅在错误/成功状态出现 |

---

## 二、PageHeader 统一实现的页面（16 页）

| 页面 | onBack | rightElement |
|------|--------|--------------|
| reset-password | 默认 navigateBack() | 无 |
| cat-player | 默认 navigateBack() | 无 |
| accompany-milestone | 默认 navigateBack() | 无 |
| notifications | 默认 navigateBack() | 无 |
| feedback | 默认 navigateBack() | 无 |
| edit-profile | 默认 navigateBack() | 保存按钮 |
| download | 默认 navigateBack() | 无 |
| change-password | 默认 navigateBack() | 无 |
| add-friend-qr | 默认 navigateBack() | 无 |
| create-companion | 默认 navigateBack() | 无 |
| scan-friend | 默认 navigateBack() | 无 |
| terms-of-service | 默认 navigateBack() | 无 |
| privacy-policy | 默认 navigateBack() | 无 |
| notification-list | 默认 navigateBack() | 设置齿轮图标 |
| switch-companion | 默认 navigateBack() | 积分徽章 |
| cat-history | 默认 navigateBack() | 无 |

PageHeader 返回按钮规格：
- 图标：`arrowleft-dark.png`，20×20px
- 容器：72rpx 圆形，无独立背景
- 颜色：`var(--color-warm-brown)`
- 行为：`navigateBack()`

---

## 三、自定义箭头按钮的页面（8 处）

### 3.1 register

- 图标：`arrowleft-dark.png`，20×20px
- 容器：80rpx 圆形，白色背景 `#FFFFFF`，`box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06)`
- 行为：`navigateBack()`
- import：`import { navigateBack } from '@tarojs/taro'`

### 3.2 admin-settings

- 图标：`arrowleft-dark.png`，**24×24px**
- 容器：40px 圆形，白色背景 `#fff`，`box-shadow: 0 4px 12px rgba(93,64,55,0.08)`
- 颜色：硬编码 `#5d4037`（未使用 CSS 变量）
- 行为：`navigateBack()`

### 3.3 privacy-settings

- 图标：`arrowleft-dark.png`，**24×24px**
- 容器：80rpx，无背景，`margin-left: -16rpx`（偏移）
- 行为：`navigateBack()`

### 3.4 upload-material

- 图标：`arrowleft-dark.png`，20×20px
- 容器：80rpx，无背景
- 行为：`navigateBack()`

### 3.5 cat-start

- 图标：`arrowleft-dark.png`，20×20px
- 容器：80rpx 圆形，白色背景，阴影，**绝对定位**（覆盖在全屏背景上）
- 行为：`Taro.navigateBack()`（命名空间写法不同）
- 有 `:active { transform: scale(0.9) }` 按压效果

### 3.6 empty-cat

- 图标：`arrowleft-dark.png`，20×20px
- 容器：80rpx 圆形，`var(--color-warm-cream-dark)` 背景，**绝对定位**
- 行为：**`reLaunch({ url: '/pages/cat-start/index' })`** — 不是返回，是重定向
- 有 `:active { transform: scale(0.9) }` 按压效果
- **⚠️ 功能问题：左箭头视觉暗示"返回"，实际清除页面栈跳转到 cat-start**

### 3.7 time-letters 写信视图

- 图标：`arrowleft-dark.png`，**24×24px**
- 容器：48px **方形圆角**（border-radius: 16px），白色背景
- 行为：`setView('list')` — 页面内视图切换，合理

### 3.8 time-letters 详情视图

- 图标：**`arrowleft-white.png`**，24×24px（唯一使用白色箭头的地方）
- 容器：48px **方形圆角**，`rgba(0,0,0,0.2)` 背景，`backdrop-filter: blur(20px)`
- 行为：`setView('list')` — 页面内视图切换，合理
- 深色覆盖层上使用白色箭头+半透明背景，视觉适配合理

---

## 四、文字返回按钮（4 处，错误/成功状态）

| 页面 | 文字 | 行为 | 样式 |
|------|------|------|------|
| add-friend-qr 错误态 | "返回" | `navigateBack()` | 240×88rpx 药丸，`var(--primary-strong)` 深橙色 |
| join-friend 成功态 | "返回" | `Taro.navigateBack()` | 填充药丸，`var(--primary)` |
| cat-player 错误态 | "返回首页" | `reLaunch` 到首页 | 描边药丸 |
| generation-progress 错误态 | "返回创建页" | `navigateTo` 到创建页 | 透明描边，`var(--primary)` |

---

## 五、不一致问题汇总

### 5.1 图标尺寸

| 尺寸 | 页面 |
|------|------|
| 20×20px | PageHeader（16页）、register、upload-material、cat-start、empty-cat |
| 24×24px | admin-settings、privacy-settings、time-letters（2处） |

### 5.2 按钮形状

| 形状 | 页面 |
|------|------|
| 圆形 | PageHeader、register、cat-start、empty-cat、admin-settings、privacy-settings、upload-material |
| 方形圆角 | time-letters 写信视图、time-letters 详情视图 |

### 5.3 背景样式

| 样式 | 页面 |
|------|------|
| 透明（无独立背景） | PageHeader（16页）、privacy-settings、upload-material |
| 白色圆形 + 阴影 | register、cat-start |
| 暖色调圆形 | empty-cat |
| 白色方形圆角 | time-letters 写信视图 |
| 半透明深色 + 毛玻璃 | time-letters 详情视图 |

### 5.4 颜色写法

| 写法 | 页面 |
|------|------|
| `var(--color-warm-brown)` | PageHeader、register、cat-start、empty-cat、privacy-settings、upload-material |
| 硬编码 `#5d4037` | admin-settings |

### 5.5 import 写法

| 写法 | 页面 |
|------|------|
| `import { navigateBack } from '@tarojs/taro'` | PageHeader、register、upload-material 等 |
| `Taro.navigateBack()` | cat-start、join-friend、cat-player |

### 5.6 导航行为（功能问题）

| 页面 | 行为 | 问题 |
|------|------|------|
| **empty-cat** | `reLaunch` 到 cat-start | ⚠️ 左箭头暗示返回，实际清除页面栈 |
| cat-start | `Taro.navigateBack()` | 写法不同但功能正常 |
| time-letters 写信 | `setView('list')` | 页面内切换，合理 |
| time-letters 详情 | `setView('list')` | 页面内切换，合理 |
| generation-progress 错误态 | `navigateTo` 到创建页 | 文字明确，合理 |
| cat-player 错误态 | `reLaunch` 到首页 | 文字明确，合理 |

---

## 六、改进建议

### P1：功能修复

**empty-cat 返回按钮行为误导**

左箭头视觉暗示"返回上一页"，但 `reLaunch` 会清除整个页面栈并跳转到 cat-start。

建议：
- 方案 A：改为 `navigateBack()`，如果页面栈有上一页则正常返回
- 方案 B：保留 `reLaunch` 但更换图标为"首页"语义，避免误导
- 方案 C：增加判断，有上一页时 `navigateBack()`，无上一页时 `reLaunch`

### P2：统一改用 PageHeader

以下 4 个页面的返回按钮可改用 `<PageHeader>` 组件，消除重复代码：

| 页面 | 改造说明 |
|------|---------|
| register | 当前自定义实现与 PageHeader 功能完全一致 |
| admin-settings | 当前自定义实现与 PageHeader 功能完全一致 |
| privacy-settings | 当前自定义实现与 PageHeader 功能完全一致，需调整 margin-left |
| upload-material | 当前自定义实现与 PageHeader 功能完全一致 |

### P3：保留自定义实现的页面

| 页面 | 保留原因 |
|------|---------|
| cat-start | 绝对定位在全屏视频背景上，需要白色圆形+阴影 |
| empty-cat | 绝对定位在全屏背景上，需要特殊背景色 |
| time-letters 写信 | 页面内视图切换，方形圆角样式适配写信 UI |
| time-letters 详情 | 深色覆盖层上需要白色箭头+毛玻璃效果 |

这些页面的自定义样式有合理原因，但应统一规格：
- 图标尺寸统一为 24×24px（更大触控区域）
- 绝对定位的按钮统一为 80rpx 圆形 + 白色背景 + 阴影
- cat-start 和 empty-cat 合并为相同样式

### P4：统一细节

1. **图标尺寸**：PageHeader 也改为 24×24px，全局统一
2. **颜色写法**：admin-settings 的 `#5d4037` 改为 `var(--color-warm-brown)`
3. **import 写法**：统一使用 `import { navigateBack } from '@tarojs/taro'` 解构导入
4. **按压效果**：有 `:active { transform: scale(0.9) }` 的页面（register、cat-start、empty-cat）应统一加入 PageHeader 的 `.back-btn` 样式中

---

## 七、涉及文件

| 文件 | 改动类型 |
|------|---------|
| `src/components/layout/PageHeader.tsx` | 图标尺寸 20→24，增加 :active 效果 |
| `src/components/layout/index.less` | PageHeader 样式更新 |
| `src/pages/register/index.tsx` | 移除自定义返回按钮，改用 PageHeader |
| `src/pages/register/index.less` | 删除 .back-btn 样式 |
| `src/pages/admin-settings/index.tsx` | 移除自定义返回按钮，改用 PageHeader |
| `src/pages/admin-settings/index.less` | 删除 .back-btn 样式 |
| `src/pages/privacy-settings/index.tsx` | 移除自定义返回按钮，改用 PageHeader |
| `src/pages/privacy-settings/index.less` | 删除 .back-btn 样式 |
| `src/pages/upload-material/index.tsx` | 移除自定义返回按钮，改用 PageHeader |
| `src/pages/upload-material/index.less` | 删除 .back-btn 样式 |
| `src/pages/empty-cat/index.tsx` | 修复导航行为，统一按钮样式 |
| `src/pages/empty-cat/index.less` | 样式对齐 cat-start |
| `src/pages/cat-start/index.tsx` | import 写法统一 |
| `src/pages/time-letters/index.tsx` | 图标尺寸确认（已是 24×24） |