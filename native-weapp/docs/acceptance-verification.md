# Taro → Native 原生小程序迁移验收报告（代码复核版）

> 生成时间：2026-05-10（基于当前代码实际扫描）
> Taro 源：`/src/pages/`（React + TypeScript + Less）
> Native 目标：`/native-weapp/miniprogram/pages/`（WXML + WXSS + JS）
> 验收维度：UI 设计、布局、颜色、字体、图标、功能
> 状态标记：✅ 一致 / ⚠️ 轻微差异（可接受） / ❌ 需修复 / 🆕 Native 独有 / 🔶 产品决策 / ⏳ 需真机验证
> 代码复核更新：`53636b2` 后已移除 `bootstrap` 调试页入口；后台配置入口仍为 Miao 页 5 连击隐藏入口，调试能力保留用于迁移验收；自定义 Tab Bar 不再使用 `wx.switchTab`；后台配置页 UI 已按旧版重构；本轮继续补充首页视频重复刷新抑制。

---

## 1. 验收总览

### 1.1 页面覆盖

| 维度 | 数量 | 说明 |
|------|------|------|
| Taro 页面 | 32 | 全部业务页面 |
| Native 业务页面 | 32 | 1:1 对应 |
| Native 独有页面 | 0 | `bootstrap` 迁移期调试页已从 `app.json` 移除并删除文件 |
| 页面覆盖率 | 100% | 全部页面已迁移 |

### 1.2 全局状态汇总

| 验收维度 | ✅ | ⚠️ | ❌ | 🔶 | ⏳ | 说明 |
|----------|---|----|----|----|----|------|
| UI 设计 | 10 | 12 | 6 | 3 | 1 | accompany-milestone 已对齐为日历；diary 仍有多处差异 |
| 布局 | 14 | 8 | 6 | 2 | 2 | 胶囊避让 4 页已动态化，静态页继续使用全局 `--nav-top`；后台配置页已重构 |
| 颜色 | 18 | 6 | 5 | 2 | 1 | 积分页仍大量硬编码色值 |
| 字体 | 20 | 5 | 5 | 1 | 1 | 字重偏重仍为系统性问题 |
| 图标 | 16 | 6 | 7 | 2 | 1 | emoji→图片/文字替换需逐页确认 |
| 功能 | 16 | 8 | 4 | 4 | 0 | 部分增强已隐藏（legacy-hidden）；部分缺失待补 |

---

## 2. 全局样式验收

### 2.1 CSS 变量（设计令牌）

| 变量 | 状态 | 说明 |
|------|------|------|
| 27 个核心变量 | ✅ | 值完全一致 |
| `--nav-top` | ⚠️ | 当前值 `calc(env(safe-area-inset-top) + var(--wechat-capsule-safe-top-gap) + 16rpx)`，其中 `--wechat-capsule-safe-top-gap: 76rpx`≈38px，比旧版改进但仍为静态估算 |
| `--nav-height` | ✅ | 32px vs 64rpx，2x 下等价 |
| `--nav-side` | ✅ | 21px vs 42rpx，2x 下等价 |
| `--wechat-capsule-safe-right` | 🆕 | 184rpx |
| `--wechat-capsule-safe-top-gap` | 🆕 | 76rpx≈38px，接近胶囊实际高度 |

### 2.2 全局样式

| 项目 | 状态 | 说明 |
|------|------|------|
| `page` 颜色 | ✅ | Native 使用语义化 `var(--on-primary-container)`，优于 Taro 硬编码 |
| `page` min-height | 🆕 | Native 有 `min-height: 100%` |
| box-sizing 重置 | 🆕 | Native 有全局 `border-box` 重置 |
| 字体平滑 | ❌ | Taro 有 `-webkit-font-smoothing: antialiased`，Native 缺失 |
| 字体栈 | ⚠️ | Taro 完整（Roboto, Oxygen, Ubuntu 等），Native 精简（Apple, Segoe, Helvetica, Arial） |

### 2.3 全局工具类

| 项目 | 状态 | 说明 |
|------|------|------|
| Flex 布局类 | ⚠️ | Taro 有 `.flex`/`.flex-col` 等，Native 用内联样式和页面级类替代，功能等价但不统一 |
| 按钮系统 | 🔶 | Taro `.btn-primary` 纯色，Native `.miao-button-primary` 渐变+阴影——产品需确认哪种为准 |
| 大标题/图标按钮 | ⚠️ | Taro 有全局类，Native 各页面内联，功能等价但维护成本高 |
| Tab 安全间距 | ⚠️ | Taro `.miao-bottom-spacer` vs Native `.miao-tab-safe`，值可能不同 |

### 2.4 Mixin 内联漂移

| Mixin | 状态 | 漂移情况 |
|-------|------|---------|
| `.backdrop-overlay()` | ❌ | z-index 从 30 到 1400 不等，背景色不一致 |
| `.miao-card()` | ⚠️ | 圆角和阴影略有不同 |
| `.bottom-sheet()` | ⚠️ | 圆角、间距不一致 |
| `.btn-primary()`/`.btn-danger()` | ❌ | 颜色、圆角、字重不一致 |
| `.safe-bottom()` | ❌ | 值从 28rpx 到 220rpx 不等 |
| `.back-btn()` | ❌ | 尺寸 52rpx~96rpx，形状从圆形到方形 |
| `.page-header-nav()` | ❌ | padding、字重、字号不一致 |
| `.miao-input()` | ⚠️ | 聚焦态、图标位置不同 |

### 2.5 backdrop-filter 使用现状

| 页面/组件 | 状态 | 说明 |
|-----------|------|------|
| tab-bar | ✅ | `blur(24rpx)` |
| home | ✅ | `blur(8px)`/`blur(10px)` 3 处 |
| cat-history | ✅ | `blur(10px)` 删除遮罩 |
| scan-friend | ✅ | `blur(10px)` 2 处 |
| time-letters | ✅ | `saturate(180%) blur(12px)` + `blur(6px)` |
| upload-material | ❌ | Taro 有 `blur(20px)`/`blur(10px)`，Native 缺失 |
| generation-progress | ❌ | Taro 有 `blur(40px)`，Native 缺失 |
| diary | ⏳ | 需真机确认是否需要 |
| 其他页面 | ⚠️ | 大部分页面未使用，兼容性取舍 |

---

## 3. 组件架构验收

### 3.1 共享组件对照

| Taro 组件 | Native 等效 | 状态 | 说明 |
|-----------|------------|------|------|
| `PageHeader` | 各页面内联页头 | ❌ | Taro 箭头图标+副标题；Native `‹` 文字+无副标题 |
| `CatAvatar` | 纯 `<image>` | ❌ | Taro 有字母回退+模糊模式，Native 无回退 |
| `PawLogo` | `<image src="/assets/logo.png">` | ⚠️ | 功能等价，但尺寸硬编码 |
| `FrostedGlassBubble` | 首页内联 | ❌ | 缺少 `bubbleIn`/`bubbleOut` 动画关键帧 |
| `DiaryCard` | 日记页内联 | ⚠️ | 布局已接近（圆形头像、图标按钮），细节差异见第 9 节 |
| `ConfirmModal` | `wx.showModal` 或内联弹窗 | ⚠️ | 功能等价，视觉不同 |
| `ShareSheet` | `open-type="share"` | ⚠️ | 功能等价，交互方式不同 |
| `CommentInput`/`CommentItem` | 日记页内联 | ⚠️ | 当前为底部弹窗模式（非浮动药丸），已接近 Taro |
| `Icons` | PNG 图片 | ⚠️ | 功能等价，格式不同 |
| `SplashScreen` | 无 | 🆕 | Native 无启动屏 |
| `ErrorBoundary` | 无 | ✅ | React 专属，小程序无需 |

### 3.2 回退策略

| 场景 | Taro | Native | 状态 |
|------|------|--------|------|
| 图片加载失败 | `CatAvatar` 显示首字母 | 显示空白 | ❌ |
| 确认弹窗 | `ConfirmModal` 自定义 UI | `wx.showModal` 系统弹窗 | ⚠️ |
| 分享 | `ShareSheet` + Canvas 分享图 | `open-type="share"` + Canvas | ⚠️ |
| 页头避让 | `useNavSpace()` 动态计算 | 4 页动态 + 其余页面使用全局 `--nav-top` 静态变量 | ⚠️ |
| Tab Bar 显隐 | `Taro.eventCenter` 事件驱动 | 基础设施已搭建，但无页面触发 | ⚠️ |

---

## 4. Tab Bar 验收

| 项目 | 状态 | 说明 |
|------|------|------|
| 图标 | ✅ | — |
| 导航方式 | ✅ | 自定义 Tab Bar 使用 `redirectTo`，失败 fallback `reLaunch`；不再调用无原生 tabBar 时会失败的 `wx.switchTab` |
| 显隐控制 | ⚠️ | 基础设施已搭建（`tabbar:hide`/`tabbar:show` 事件监听），但当前无页面触发这些事件 |
| 中心标签文字 | ⏳ | 需真机确认活跃时是否隐藏 |
| `-webkit-backdrop-filter` | ✅ | 有 `blur(24rpx)` |
| 图标尺寸单位 | ⚠️ | rpx vs px，功能等价 |

---

## 5. 顶部安全区域（胶囊按钮避让）验收

### 5.1 当前策略

| 策略 | 说明 | 页面数 |
|------|------|--------|
| **动态** `getHeaderSafeTop()` | JS 运行时调用 `wx.getMenuButtonBoundingClientRect()`，inline style 覆盖 | 4 |
| **静态** `var(--nav-top)` | CSS 变量 `calc(env(safe-area-inset-top) + 76rpx + 16rpx)` ≈ statusBar+46px | 23 |
| **原始** `env(safe-area-inset-top)` | 仅避开状态栏，未避开胶囊 | 3 |
| **无避让** | 无安全区处理 | 2 |

### 5.2 动态避让页面 ✅

| 页面 | 绑定方式 |
|------|---------|
| profile | `style="padding-top: {{headerSafeTop}}"` on header |
| points | `style="padding-top: {{headerSafeTop}}"` on header |
| diary | `style="padding-top: {{headerSafeTop}}"` on header |
| time-letters | `style="padding-top: {{headerSafeTop}}"` on 3 个 header 元素 |

> 注意：这些页面的 WXSS 中仍有 `var(--nav-top)` 的 fallback 规则，但 inline style 优先级更高，实际生效的是动态值。

### 5.3 静态 `var(--nav-top)` 页面 ⚠️

当前 `--nav-top = calc(env(safe-area-inset-top) + 76rpx + 16rpx)` ≈ `statusBarHeight + 46px`，比旧版 `statusBarHeight + 8px` 有显著改进。在大部分设备上胶囊底部约为 `statusBarHeight + 38px~42px`，此值可覆盖。但在非标准设备（如折叠屏、平板）上可能有偏差。

| 页面 | CSS 用法 |
|------|---------|
| cat-player | `top: var(--nav-top, ...)` |
| create-companion | `padding-top: var(--nav-top, ...)` |
| upload-material | `top: var(--nav-top, ...)` + `padding: calc(var(--nav-top) + 80rpx)` |
| cat-start | `top: var(--nav-top, ...)` |
| empty-cat | `top: var(--nav-top, ...)` + `margin-top: calc(var(--nav-top) + 80rpx)` |
| download | `padding: var(--nav-top, ...) 40rpx` |
| switch-companion | `padding-top: var(--nav-top, ...)` |
| cat-history | `padding-top: var(--nav-top, ...)` |
| join-friend | `padding: var(--nav-top, ...) 0 24rpx` |
| accompany-milestone | `padding: var(--nav-top, ...) 32rpx 0` |
| privacy-settings | `padding: var(--nav-top, ...) 32rpx 56rpx` |
| notifications | `padding: var(--nav-top, ...) 32rpx 56rpx` |
| notification-list | `padding: var(--nav-top) 36rpx 56rpx` |
| scan-friend | `padding: var(--nav-top) 32rpx 0` |
| set-nickname | `padding: var(--nav-top) 24rpx 0` |
| feedback | `padding: var(--nav-top) 40rpx 24rpx` |
| add-friend-qr | `padding: var(--nav-top) 32rpx 20rpx` |
| edit-profile | `padding: var(--nav-top) 48rpx 24rpx` |
| change-password | `padding: var(--nav-top) 48rpx 24rpx` |
| reset-password | `padding: var(--nav-top) 48rpx 24rpx` |
| privacy-policy | `padding: var(--nav-top) 40rpx 24rpx` |
| terms-of-service | `padding: var(--nav-top) 40rpx 24rpx` |
| admin-settings | `page-header` 使用 `padding: var(--nav-top) 52rpx 18rpx`，底部操作区独立固定 |
| generation-progress | `top: var(--nav-top)` |

### 5.4 原始 `env(safe-area-inset-top)` 页面 ❌

| 页面 | CSS 用法 | 风险 |
|------|---------|------|
| home | `top: calc(env(safe-area-inset-top) + 28rpx)` | 沉浸式全屏页面，工具栏已隐藏，影响较小 |
| login | `padding: calc(env(safe-area-inset-top) + 24rpx) 48rpx 0` | 内容居中，影响较小 |
| register | `padding: calc(env(safe-area-inset-top) + 56rpx) 48rpx 0` | 内容居中，影响较小 |

### 5.5 无避让页面

| 页面 | 说明 |
|------|------|
| welcome | 居中内容，无顶部交互元素 |
| bootstrap | **[已移除]** 迁移期开发调试页已删除 |

### 5.6 混合用法页面

以下页面主元素使用 `var(--nav-top)` 或动态值，但次要元素使用原始 `env(safe-area-inset-top)`：

| 页面 | 次要元素用法 |
|------|-------------|
| add-friend-qr | toast 定位 `top: calc(env(safe-area-inset-top) + 92rpx)` |
| privacy-settings | 浮层 `top: calc(env(safe-area-inset-top) + 96rpx)` |
| privacy-policy | 容器高 `calc(100vh - 120rpx - env(safe-area-inset-top))` |
| terms-of-service | 容器高 `calc(100vh - 120rpx - env(safe-area-inset-top))` |
| diary | 滚动区 `padding: calc(env(safe-area-inset-top) + 36rpx)`（非 header 元素） |

### 5.7 修复建议

**推荐方案**：继续保留全局 `--nav-top` 作为基础兜底；对有右上角动作按钮或标题靠近胶囊的页面，逐页接入 `getHeaderSafeTop()` 做动态覆盖。

```javascript
const menuButton = wx.getMenuButtonBoundingClientRect();
const navTop = `${menuButton.top + menuButton.height + 8}px`;
// 注入到每个页面
```

这样能避免一次性改动全部页面造成视觉回归，同时优先解决真实遮挡风险最高的页面。

---

## 6. 页面逐页验收清单

> 以下每项标注状态。相比旧版报告的变化用 **[已过期]** / **[已修复]** / **[新发现]** 标注。

### 6.1 welcome/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | Native 多脉冲加载点动画；品牌色 `#5D4037` vs `#633E1D`；副标题色 `#999` vs `#8E8E8E` |
| 布局 | ⚠️ | Native 多 `padding: 0 48rpx` |
| 颜色 | ⚠️ | 品牌色和副标题色值不同 |
| 字体 | ⚠️ | 品牌字重 bold vs 900 |
| 图标 | ✅ | — |
| 功能 | ⚠️ | 认证架构不同：`storage` vs `authService`+事件驱动；Native 多 `didRoute` 防重复路由 |

### 6.2 login/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | Logo 尺寸 96rpx vs 66rpx |
| 布局 | ✅ | — |
| 颜色 | ❌ | 硬编码 `#e89f71`/`#8e8e8e`，未使用语义变量 |
| 字体 | ❌ | 字重全面偏重：忘记密码 500→700，勾选 700→900，版权 700→900 |
| 图标 | ✅ | — |
| 功能 | ⚠️ | 抖动动画 0.4s ease vs 0.25s linear；开发模式检测方式不同 |

### 6.3 register/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 返回按钮：箭头图片 vs `‹` 文字 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ❌ | 输入框字重 400→700；按钮字重 700→800 |
| 图标 | ✅ | — |
| 功能 | ❌ | 缺少重复用户名检查；输入标签无 uppercase+letter-spacing |

### 6.4 reset-password/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 继承全局 custom，无双页头；页头细节仍需视觉复核 |
| 布局 | ✅ | — |
| 颜色 | ⚠️ | 错误框背景 `rgba(255,77,79,0.08)` vs `#fff1f1` |
| 字体 | ✅ | — |
| 图标 | ✅ | — |
| 功能 | ✅ | **[已修复]** Native 已调用 send-reset-code/reset-password 链路 |

### 6.5 set-nickname/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 继承全局 custom，无双页头；页头细节仍需视觉复核 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ⚠️ | 保存按钮字重 600→800 |
| 图标 | ✅ | — |
| 功能 | ⚠️ | **[已修复]** 已有 Emoji 过滤、认证守卫和按钮启用状态；自动聚焦仍需真机确认 |

### 6.6 home/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ✅ | **[已修复]** 顶部工具栏和动作按钮已在 WXSS 中 `display: none` 隐藏 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ❌ | 气泡缺少 `bubbleIn`/`bubbleOut` 动画关键帧；猫咪头像无回退 |
| 功能 | ⚠️ | 缺少 `useShareAppMessage`/`useShareTimeline`；积分 toast 无动画 |

### 6.7 empty-cat/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ❌ | 返回按钮 WXML 缺失；主标题/描述文案不同；卡片标题/描述不同 |
| 布局 | ✅ | — |
| 颜色 | ❌ | Logo 渐变 `linear-gradient`+`background-clip:text` vs 纯色 |
| 字体 | ✅ | — |
| 图标 | ❌ | 卡片图标不同 |
| 功能 | 🔶 | Native 多兑换徽章（产品决策）；页脚退出登录 vs 版权信息 |

### 6.8 cat-start/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ❌ | 返回按钮圆形箭头 vs `‹` 文字；双层 Logo+闪光+动画 vs 静态 logo.png；背景装饰未渲染 |
| 布局 | ✅ | — |
| 颜色 | ⚠️ | 描述色语义变量 vs 硬编码；按钮纯色 vs 渐变 |
| 字体 | ❌ | 按钮文字 36rpx/900 vs 32rpx/700 |
| 图标 | ❌ | 插图从双层动画 Logo 缩减为静态单图 |
| 功能 | ⚠️ | 导航栏：自定义 vs 默认+标题；缺少动画 |

### 6.9 create-companion/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 表单标签中文 vs 英文；Native 多毛色输入 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ✅ | — |
| 功能 | ⚠️ | 预设猫自动选中第一个 vs null；生成按钮 `<View>` vs `<button>` |

### 6.10 upload-material/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 确认弹窗和加载遮罩缺少 `backdrop-filter` |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ⚠️ | 加载标题字号 40rpx→32rpx |
| 图标 | ✅ | — |
| 功能 | 🔶 | Native 多兑换徽章（产品决策）、积分检查、生成成功 toast |

### 6.11 generation-progress/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ❌ | 缺少返回按钮；完成图标图片 vs `✓` 文字；确认按钮水平 vs 垂直排列 |
| 布局 | ✅ | — |
| 颜色 | ❌ | 确认弹窗缺少 `backdrop-filter: blur(40px)` |
| 字体 | ✅ | — |
| 图标 | ❌ | `CHECKCIRCLE_GREEN` 图片 vs `✓` 文字 |
| 功能 | ⚠️ | 进度提示静态 vs 动态；错误页 2 按钮 vs 3 按钮；多动作队列逻辑不同 |

### 6.12 switch-companion/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ❌ | 活跃指示：绿色勾号 vs "当前"文字；删除按钮：圆形图标 vs 药丸文字 |
| 布局 | ❌ | 添加卡片布局：2列网格 vs 水平行 |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ❌ | AI 标记 sparkles 图标缺失；活跃勾号→文字；删除图标→文字 |
| 功能 | ⚠️ | 删除确认：自定义弹窗 vs `wx.showModal` |

### 6.13 cat-player/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | Native 多动作切换芯片；缺少暂停指示器 |
| 布局 | ⚠️ | 信息面板 padding 48rpx vs 44rpx |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ⚠️ | 返回按钮样式不同 |
| 功能 | ⚠️ | 删除确认方式不同；保存失败提示不同；视频超时 30s vs 无 |

### 6.14 cat-history/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ✅ | — |
| 布局 | ⚠️ | Flex `calc(50%-12rpx)` vs CSS Grid `repeat(2, 1fr)` |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ⚠️ | 猫咪头像 `CatAvatar` vs 纯 `<image>` |
| 功能 | ⚠️ | 日期格式不同；删除 API 不同 |

### 6.15 accompany-milestone/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | **[已修复]** 当前为日历视图（月历+爪印标记），已接近 Taro 设计 |
| 布局 | ⚠️ | 天数字号 96rpx/800 vs 92rpx/900；页头标题字号 36rpx/700 vs 42rpx/900 |
| 颜色 | ✅ | — |
| 字体 | ⚠️ | 字重偏重 |
| 图标 | ❌ | 返回按钮圆形箭头 vs 圆角方形 `‹` |
| 功能 | ⚠️ | 数据来源 URL 参数 vs dataStore；温馨留言待确认 |

> **旧版报告称此页面"完全不同设计（英雄卡片+统计+里程碑清单）"，当前代码已改为日历视图，与 Taro 基本对齐。**

### 6.16 diary/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | **[已修复]** 头像已为 72rpx 圆形（36rpx radius）；互动按钮已为图标+文字非药丸形 |
| 布局 | ⚠️ | 卡片内边距 32rpx vs 28rpx；圆角 48rpx vs 32rpx；媒体圆角 32rpx vs 24rpx |
| 颜色 | ⚠️ | 卡片背景 `var(--surface)` vs `#fff` 硬编码；用户名色变量 vs 变量但不同 key |
| 字体 | ⚠️ | 用户名字重 600 vs 待确认；内容字号 28rpx vs 29rpx |
| 图标 | ✅ | 互动按钮已为 heart/message/share 图标 |
| 功能 | ⚠️ | 评论输入为底部弹窗（已接近 Taro）；同步状态 UI 已隐藏（`display: none`）；Tab 切换动画已追踪方向；缺少下拉刷新和键盘适配 |

> **旧版报告称"头像 28rpx 圆角方形"、"药丸文字按钮"、"浮动药丸评论面板"，当前代码已修正。**

### 6.17 time-letters/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 详情页背景色不同；详情卡片圆角 32px vs 48rpx；详情引导对齐方式不同 |
| 布局 | ❌ | 多处 px/rpx 混用导致不同屏幕下布局偏移 |
| 颜色 | ⚠️ | 详情背景色不同；装饰圆色值不同 |
| 字体 | ⚠️ | 副标题小写 vs 大写；信件内容缺少 italic |
| 图标 | ✅ | — |
| 功能 | ❌ | 缺少长按解锁+振动；缺少实时倒计时；Native 多信件已读追踪；Native 多服务端同步 |

### 6.18 points/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 弹窗关闭按钮 88rpx vs 64rpx；弹窗项目背景不同 |
| 布局 | ⚠️ | 历史项间距不同 |
| 颜色 | ❌ | 大量硬编码色值：积分卡 `#e0a171`、任务项 `#FFFFFF`、任务图标 `rgba(232,159,113,0.05)`、完成图标 `rgba(82,196,26,0.1)`、完成徽章 `#52c41a`、兑换卡 `#fff`、遮罩 `rgba(0,0,0,0.36)` 等 |
| 字体 | ⚠️ | 兑换标题 36rpx/700 vs 34rpx/900 |
| 图标 | ✅ | — |
| 功能 | ⚠️ | 任务数据源 `contentStore.getPointTasks()`（3 个任务）；每日登录积分 `grantDailyLogin()` onShow |

### 6.19 profile/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ✅ | **[已修复]** 当前 6 个菜单项（非 13 个），标题"账户设置"（非"SETTINGS"），有扫码按钮 |
| 布局 | ⚠️ | 菜单项 `<View>` vs `<button>`；底部 safe-area 可能双重计算 |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ⚠️ | 菜单箭头文字 `>` vs 图片 `chevronright-gray.png` |
| 功能 | ⚠️ | 退出登录独立药丸按钮；管理员入口时间窗口 3s vs 1.8s |

> **旧版报告称"13 个菜单项"、"SETTINGS"、"无扫码按钮"，当前代码已修正为 6 项中文菜单+扫码按钮。**

### 6.20 edit-profile/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | Native 多头像 URL 输入字段 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ⚠️ | 头像占位 `DEFAULT_AVATAR` 常量 vs 首字母回退 |
| 功能 | ⚠️ | 昵称验证非空 vs 2-12 字符；成功提示方式不同；图片选择 API 不同 |

### 6.21 change-password/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 当前密码字段条件显示 vs 始终显示 |
| 布局 | ✅ | — |
| 颜色 | ❌ | Toast 颜色暖色 vs 暗色；错误框背景色不同 |
| 字体 | ✅ | — |
| 图标 | ✅ | — |
| 功能 | ❌ | 页面标题动态 vs 固定；错误显示内联 vs toast；缺少具体错误码 |

### 6.22 privacy-settings/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 清除缓存显示方式不同；清除遮罩样式不同 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ❌ | PNG 图片 vs 文字字符 |
| 功能 | ⚠️ | 缓存清除逻辑不同 |

### 6.23 notifications/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 英雄图标 emoji vs PNG；设置卡片透明度 0.5 vs 0.62 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ⚠️ | emoji vs PNG |
| 功能 | ⚠️ | 页脚文案不同；数据流不同 |

### 6.24 notification-list/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 通知图标 PNG vs 中文字符；图标尺寸不同 |
| 布局 | ✅ | — |
| 颜色 | ⚠️ | 未读点色 `var(--color-danger)` vs `#D64B4B` |
| 字体 | ✅ | — |
| 图标 | ❌ | 4 种 PNG 图标 vs 中文字符 |
| 功能 | ⚠️ | 页面标题 "Notifications" vs "Message Center" |

### 6.25 admin-settings/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ✅ | **[已修复]** 已恢复旧版居中标题、副标题、大圆角白卡、描边输入框、双列开关与底部固定操作栏 |
| 布局 | ✅ | **[已修复]** Native 页已统一为 rpx，并保留固定底栏滚动避让 |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ✅ | **[已修复]** 区段图标统一使用 `settings-dark.png` |
| 功能 | ✅ | 后台配置入口保持隐藏触发（Miao 页 5 连击），调试开关保留用于迁移验收 |

### 6.26 add-friend-qr/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 错误图标图片 vs 文字 |
| 布局 | ✅ | — |
| 颜色 | ⚠️ | Toast 变体不同 |
| 字体 | ✅ | — |
| 图标 | ⚠️ | 头像 `CatAvatar` vs 字母回退；错误图标不同 |
| 功能 | 🔶 | **[已修复]** 复制邀请码/链接/重新生成按钮已隐藏（`legacy-hidden`）；二维码预览待确认 |

> **旧版报告称"Native 多 3 个按钮"，当前代码已通过 `legacy-hidden` 类隐藏。**

### 6.27 join-friend/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 错误/成功图标 emoji vs 文字字符 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ❌ | 头像 `CatAvatar` vs 简单 view+首字母；emoji vs 文字 |
| 功能 | 🔶 | 手动邀请码输入（产品决策）；缺少未认证流程 |

### 6.28 scan-friend/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 页头左对齐 vs 居中+副标题；扫描图标裸图 vs 容器内；"我的二维码" emoji vs "QR" 文字 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ✅ | — |
| 图标 | ❌ | 手机 emoji vs "QR" 文字 |
| 功能 | 🔶 | 扫描允许相册（`onlyFromCamera: false`）——产品决策 |

### 6.29 download/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 二维码区域无卡片 vs 白色卡片+内边框；第三特性图标 emoji vs PNG |
| 布局 | ❌ | 内容区 padding px vs rpx 混用 |
| 颜色 | ⚠️ | 提示文字色不同；按钮样式不同 |
| 字体 | ✅ | — |
| 图标 | ⚠️ | emoji vs PNG |
| 功能 | 🆕 | Native 多副提示文字 |

### 6.30 feedback/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 页面标题 "反馈" vs "意见反馈"；返回按钮样式不同 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ❌ | 系统性字重偏重 |
| 图标 | ✅ | — |
| 功能 | ⚠️ | **[已修复]** 存储键为 `miao_has_submitted_survey`（无 `_native` 后缀）；文本域最大长度 500→800；提交后行为不同 |

> **旧版报告称存储键有 `_native` 后缀，当前代码已修正。**

### 6.31 privacy-policy/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 英雄图标 emoji vs 中文字符；字号不同 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ❌ | 副标题字重 700→900；条款标签字重 700→800 |
| 图标 | ❌ | emoji vs 中文字符 |
| 功能 | ⚠️ | 内容缩短版 |

### 6.32 terms-of-service/index

| 维度 | 状态 | 差异描述 |
|------|------|---------|
| UI 设计 | ⚠️ | 英雄图标 emoji vs 中文字符 |
| 布局 | ✅ | — |
| 颜色 | ✅ | — |
| 字体 | ❌ | 副标题字重 700→900 |
| 图标 | ❌ | emoji vs 中文字符 |
| 功能 | ⚠️ | 内容缩短版 |

---

## 7. 日记页"我的记录"UI 详细验收

> 基于当前代码复核，旧版报告中的多项结论已过期。

### 7.1 日记卡片

| 属性 | 状态 | Taro | Native（当前） |
|------|------|------|---------------|
| 头像尺寸 | ✅ | 72rpx | 72rpx |
| 头像圆角 | ✅ | 36rpx（圆形） | 36rpx（圆形） |
| 内边距 | ⚠️ | 32rpx | 28rpx |
| 圆角 | ⚠️ | 48rpx | 32rpx |
| 背景 | ⚠️ | `var(--surface)` | `#fff` 硬编码 |
| 用户名字重 | ⏳ | 600 | 需真机确认 |
| 内容字号 | ⚠️ | 28rpx | 29rpx |
| 媒体圆角 | ⚠️ | 32rpx | 24rpx |

### 7.2 互动按钮

| 属性 | 状态 | 说明 |
|------|------|------|
| 布局 | ✅ | **[已修复]** 当前为图标+文字按钮，非药丸形 |
| 点赞激活 | ⚠️ | 颜色变化方式不同 |
| 删除按钮 | ⚠️ | 仅非好友日记显示，图标样式不同 |
| 分享方式 | ⚠️ | `open-type="share"` 按钮 |

### 7.3 评论输入

| 属性 | 状态 | 说明 |
|------|------|------|
| 形态 | ✅ | **[已修复]** 当前为底部弹窗（`.comment-modal`），含遮罩和滑入动画 |
| 输入框 | ⚠️ | 单行 `<input>` vs Taro 可能用 `<textarea>` |
| 发送按钮 | ⚠️ | 圆形渐变按钮 vs Taro 图标按钮 |
| 字数统计 | ✅ | **[已修复]** 当前有字数统计（`commentText.length/100`） |

### 7.4 同步状态 UI

| 属性 | 状态 | 说明 |
|------|------|------|
| 同步徽章 | ⚠️ | WXML 中存在但 CSS `display: none` 隐藏 |
| 同步面板 | ⚠️ | WXML 中存在但 CSS `display: none` 隐藏 |

### 7.5 Tab 切换栏

| 属性 | 状态 | Taro | Native（当前） |
|------|------|------|---------------|
| 背景色/圆角/内边距 | ✅ | 一致 | 一致 |
| Tab 文字字号 | ⚠️ | 14px | 28rpx（单位不同） |
| 切换动画 | ✅ | **[已修复]** 当前已追踪 `tabDirection` 方向 |

---

## 8. Profile 页面验收

| 属性 | 状态 | 说明 |
|------|------|------|
| 菜单项数量 | ✅ | **[已修复]** 当前 6 项，与 Taro 一致 |
| 菜单区标题 | ✅ | **[已修复]** 当前"账户设置"，非"SETTINGS" |
| 扫码按钮 | ✅ | **[已修复]** 当前页头有扫码按钮 |
| 头像形状 | ✅ | **[已修复]** 当前为圆形（`border-radius: 50%`） |
| 菜单项元素 | ⚠️ | `<View>` vs `<button>` |
| 退出登录 | ⚠️ | 独立药丸按钮 vs Taro 菜单项样式 |
| `--nav-side` | ⚠️ | 动态计算 vs 固定 42rpx |
| 底部 safe-area | ❌ | 可能双重计算 |
| 页头避让 | ✅ | 使用 `getHeaderSafeTop()` 动态计算 |

---

## 9. 系统性差异验收

### 9.1 架构差异

| 维度 | 状态 | 说明 |
|------|------|------|
| 状态管理 | ✅ | React hooks vs Page data/setData，架构差异预期内 |
| 认证 | ✅ | useAuthContext vs authService |
| 数据存储 | ✅ | storage（本地同步）vs dataStore/contentStore/socialStore（异步+同步） |
| 路由 | ✅ | Taro API vs wx API + safeBack |
| 导航栏间距 | ⚠️ | 4 页动态，其余页面依赖全局 `--nav-top`；需继续结合真机逐页确认 |
| 分享 | ✅ | React hooks vs 页面方法 |
| 事件系统 | ✅ | Taro.eventCenter vs event-bus |

### 9.2 样式模式

| 模式 | 状态 | 说明 |
|------|------|------|
| 单位 | ⚠️ | Taro 源本身混用 rpx/px，Native 全部 rpx |
| CSS 变量 | ❌ | 部分页面硬编码色值（尤其 points 页） |
| 字重 | ❌ | 系统性偏重：Taro 600/700/800 → Native 700/800/900 |
| backdrop-filter | ⚠️ | 5 处已使用，upload-material/generation-progress 缺失 |
| 按钮渐变 | 🔶 | 产品决策：纯色 vs 渐变 |
| 字体平滑 | ❌ | 缺失 `-webkit-font-smoothing: antialiased` |

### 9.3 功能差异

| 功能 | 状态 | 说明 |
|------|------|------|
| Emoji 过滤 | ✅ | **[已修复]** set-nickname 已过滤 emoji |
| 认证守卫 | ✅ | **[已修复]** set-nickname 已添加登录检查 |
| 重复用户名检查 | ❌ | register 缺失 |
| 内联错误显示 | ⚠️ | 多页面用 wx.showToast 替代 |
| 输入自动聚焦 | ❌ | set-nickname 缺失 |
| 下拉刷新 | ❌ | diary 缺失 |
| 键盘适配 | ❌ | diary 缺失 |
| 单页模式 | ❌ | diary 缺失 |
| 好友轮询 | ⚠️ | 60s 间隔→仅 onShow |
| 长按解锁 | ❌ | time-letters 缺失 |
| 实时倒计时 | ❌ | time-letters 缺失 |
| 信件已读追踪 | 🆕 | time-letters Native 独有 |
| 服务端同步 | 🆕 | Native 更广泛 |
| 扫描相册 | 🔶 | scan-friend 允许，产品决策 |
| Tab Bar 显隐 | ⚠️ | 基础设施已搭建，无触发点 |
| 猫咪日历 | ✅ | **[已修复]** accompany-milestone 已有日历视图 |
| 媒体同步状态 | ⚠️ | diary WXML 中存在但 CSS 隐藏 |

---

## 10. 导航配置验收

| 页面 | Taro | Native | 状态 |
|------|------|--------|------|
| 全部页面 | custom / 部分 disableScroll | 继承 app.json `navigationStyle: custom` | ✅ 无原生双页头风险 |
| home / register 等 | disableScroll | 未逐页声明 disableScroll | ⚠️ 依赖页面自身 `height:100vh/overflow:hidden` 或滚动容器控制 |

---

## 11. 修复优先级建议

### P0 — 必须修复

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| 1 | 胶囊避让静态值 | 静态页头页面 | 优先对有右上角动作区的页面接入 `getHeaderSafeTop()` |
| 2 | 双页头风险 | 全部页面 | **[已确认]** app.json 全局 custom，无双页头风险 |
| 3 | 字重系统性偏重 | 全局 | 700→800, 800→900 需统一回 600/700/800 |
| 4 | 硬编码色值 | login, points 等 | 替换为 CSS 变量 |

### P1 — 应该修复

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| 5 | 字体平滑缺失 | 全局 | 添加 `-webkit-font-smoothing: antialiased` |
| 6 | Mixin 内联漂移 | 全局 | 提取公共 WXSS 类（safe-bottom, back-btn, page-header） |
| 7 | px/rpx 混用 | time-letters, download | admin-settings 已修复；其余页面继续逐页确认 |
| 8 | Profile 底部 safe-area 双重计算 | profile | 移除页面级 padding-bottom 中的 safe-area |
| 9 | 返回按钮不一致 | 多页面 | 统一为箭头图片或统一 `‹` 样式 |
| 10 | 缺少 backdrop-filter | upload-material, generation-progress | 按需添加 |
| 11 | Emoji 过滤 | set-nickname | 添加正则过滤 |
| 12 | 认证守卫 | set-nickname | 添加登录检查 |

### P2 — 可以改进

| # | 问题 | 影响范围 | 说明 |
|---|------|---------|------|
| 13 | 图片加载失败回退 | 全局 CatAvatar | 添加错误处理 |
| 14 | 缺少下拉刷新 | diary | 评估是否需要 |
| 15 | 缺少键盘适配 | diary | 评估是否需要 |
| 16 | Tab Bar 显隐触发 | 全局 | 评估哪些页面需要触发 `tabbar:hide/show` |
| 17 | 缺少动画关键帧 | home, cat-start | bubbleIn/bubbleOut 等 |
| 18 | 按钮样式统一 | 全局 | 确认主按钮纯色 or 渐变 |
| 19 | 同步状态 UI 隐藏 | diary | 决定是否启用 `.sync-badge`/`.sync-panel` |
| 20 | 首页工具栏/动作栏 | home | 当前 `display: none`，决定是否恢复 |
| 21 | 首页同步后视频重复刷新 | home | **[已修复]** 已增加猫咪渲染签名，相同视频/动作/状态不再重复 setData |

---

## 12. 与旧版报告的差异对照

以下列出旧版 `page-diff-report.md` 中的关键结论，标注当前代码状态：

| 旧版结论 | 当前状态 | 标注 |
|---------|---------|------|
| Native 主要依赖静态 `--nav-top` | 4 页已动态化，静态页仍需真机验证 | **部分过期** |
| Tab Bar 不支持显隐、用 reLaunch | 基础设施已搭建；自定义底栏使用 redirectTo/reLaunch，不再使用 switchTab | **已过期** |
| Profile 有 13 个菜单项 | 当前 6 项，标题"账户设置" | **已过期** |
| Profile 无扫码按钮 | 当前有扫码按钮 | **已过期** |
| Diary 头像 28rpx 圆角方形 | 当前 36rpx 圆形 | **已过期** |
| Diary 互动按钮为药丸文字 | 当前为图标+文字按钮 | **已过期** |
| Diary 评论输入为浮动药丸面板 | 当前为底部弹窗 | **已过期** |
| Diary 无字数统计 | 当前有字数统计 | **已过期** |
| Diary Tab 切换无方向动画 | 当前已追踪 tabDirection | **已过期** |
| accompany-milestone 为统计+里程碑 | 当前为日历视图 | **已过期** |
| Home 有顶部工具栏和动作按钮 | WXML 存在但 WXSS `display: none` | **已过期** |
| add-friend-qr 多 3 个按钮 | 当前 `legacy-hidden` 隐藏 | **已过期** |
| feedback 存储键有 `_native` 后缀 | 当前无后缀 | **已过期** |
| points 消费金额红色 vs 灰色 | 需真机确认当前色值 | **需验证** |
| 全局 `--nav-top` = statusBar+8px | 当前 = statusBar+76rpx+16rpx ≈ statusBar+46px | **已过期** |

---

*报告结束*
