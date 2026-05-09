# Taro vs Native 页面差异分析报告

> 生成时间：2026-05-10
> Taro 源：`/src/pages/`（React + TypeScript + Less）
> Native 目标：`/native-weapp/miniprogram/pages/`（WXML + WXSS + JS）

---

## 目录

1. [全局差异](#1-全局差异)
2. [组件架构差异](#2-组件架构差异)
3. [Tab Bar 差异](#3-tab-bar-差异)
4. [页面逐页对比](#4-页面逐页对比)
5. [系统性差异总结](#5-系统性差异总结)
6. [Native 独有页面](#6-native-独有页面)
7. [顶部安全区域（胶囊按钮避让）审计](#7-顶部安全区域胶囊按钮避让审计)
8. [容器宽度与水平对齐扫描](#8-容器宽度与水平对齐扫描)
9. [日记页"我的记录"UI 详细对比](#9-日记页我的记录ui-详细对比)
10. [Profile 页面宽度对齐详细对比](#10-profile-页面宽度对齐详细对比)

---

## 1. 全局差异

### 1.1 CSS 变量（设计令牌）

27 个变量值完全一致，无差异。以下为新增或单位不同的变量：

| 变量 | Taro | Native | 说明 |
|------|------|--------|------|
| `--nav-top` | `calc(env(safe-area-inset-top) + 8px)` | `calc(env(safe-area-inset-top) + 16rpx)` | 单位不同，2x 屏幕下等价 |
| `--nav-height` | `32px` | `64rpx` | 单位不同，2x 下等价 |
| `--nav-side` | `21px` | `42rpx` | 单位不同，2x 下等价 |
| `--wechat-capsule-safe-right` | 无 | `184rpx` | Native 新增 |
| `--wechat-capsule-safe-top-gap` | 无 | `76rpx` | Native 新增 |

### 1.2 全局样式差异

| 差异项 | Taro | Native |
|--------|------|--------|
| `page` 颜色写法 | `color: #633E1D`（硬编码） | `color: var(--on-primary-container)`（语义化） |
| `page` min-height | 未设置 | `min-height: 100%` |
| `page` box-sizing | 未设置 | `box-sizing: border-box` |
| 元素 box-sizing 重置 | 无 | `view, text, image, button, input, textarea { box-sizing: border-box }` |
| 字体平滑 | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` | 无 |
| 字体栈 | 完整（含 Roboto, Oxygen, Ubuntu 等） | 精简（仅 Apple, Segoe, Helvetica, Arial） |

### 1.3 全局工具类

**Taro 有但 Native 缺失的工具类：**

| 类名 | 用途 |
|------|------|
| `.container` | 全屏容器 |
| `.flex` / `.flex-col` / `.items-center` / `.justify-center` / `.justify-between` | Flex 布局 |
| `.text-center` / `.text-primary` / `.text-secondary` | 文本工具 |
| `.bg-primary` / `.bg-surface` | 背景色 |
| `.p-4` / `.px-4` / `.py-4` / `.m-0` / `.mt-4` / `.mb-4` | 间距 |
| `.btn` / `.btn-primary` / `.btn-secondary` | 按钮系统 |
| `.input` | 输入框 |
| `.card` | 卡片容器 |
| `.no-scrollbar` | 隐藏滚动条 |
| `.miao-large-header` / `.miao-large-title` / `.miao-large-subtitle` | 大标题布局 |
| `.miao-icon-button` / `.miao-icon-button.primary` | 图标按钮 |
| `.miao-bottom-spacer` | 底部安全间距 |

**Native 有但 Taro 缺失的全局类：**

| 类名 | 用途 |
|------|------|
| `.miao-page` | 全屏页面容器 |
| `.miao-tab-safe` | Tab Bar 底部安全间距 `padding-bottom: calc(166rpx + env(safe-area-inset-bottom))` |
| `.miao-button-primary` | 渐变主按钮（Taro 的 `.btn-primary` 是纯色） |
| `.miao-button-secondary` | 次级按钮 |
| `.page-header` / `.page-header .header-title` | 通用页头 |

**关键按钮差异：** Native `.miao-button-primary` 使用 `linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%)` 渐变 + 阴影；Taro `.btn-primary` 使用纯色 `background-color: var(--primary)` 无阴影。

### 1.4 Less Mixins（Taro）vs Native 内联

Taro 有 11 个 Mixin，Native 全部内联到各页面，存在值漂移：

| Mixin | Native 等效方式 | 值漂移情况 |
|-------|----------------|-----------|
| `.backdrop-overlay()` | 各页面内联 `.backdrop-overlay` / `.delete-overlay` 等 | z-index 从 30 到 1400 不等，背景色从 `rgba(0,0,0,0.42)` 到 `var(--color-overlay)` |
| `.miao-card()` | 各页面内联卡片样式 | 圆角和阴影略有不同 |
| `.bottom-sheet()` | 各页面内联底部弹窗 | 圆角、间距不一致 |
| `.btn-primary()` / `.btn-danger()` / `.btn-cancel()` | 各页面内联按钮 | 颜色、圆角、字重不一致 |
| `.safe-bottom()` | 各页面内联 `calc(env(safe-area-inset-bottom) + Xrpx)` | X 值从 28rpx 到 220rpx 不等 |
| `.miao-input()` | 各页面内联输入框 | 聚焦态、图标位置不同 |
| `.back-btn()` | 各页面内联返回按钮 | 尺寸从 52rpx 到 96rpx 不等，形状从圆形到圆角方形 |
| `.page-header-nav()` | 各页面内联页头 | padding、字重、字号不一致 |
| `.header-title-text()` / `.header-subtitle-text()` | 各页面内联 | 字号从 34rpx 到 60rpx 不等 |

---

## 2. 组件架构差异

### 2.1 共享组件对照表

| Taro 组件 | Native 等效 | 差异说明 |
|-----------|------------|---------|
| `PageHeader` | 无组件，各页面内联页头 | Taro：图片箭头返回键 + 三列布局 + 副标题支持；Native：文字 `‹` 返回键 + 无副标题 |
| `CatAvatar` | 无组件，各页面用 `<image>` | Taro：有字母回退 + 模糊模式；Native：纯 `<image>` 无回退 |
| `PawLogo` | 无组件，用 `<image src="/assets/logo.png">` | Taro：React 组件可传 size；Native：硬编码尺寸 |
| `FrostedGlassBubble` | 首页内联 | 结构相似，但 Native 缺少 `bubbleIn`/`bubbleOut` 动画关键帧 |
| `DiaryCard` | 日记页内联 | 布局完全不同：Taro 卡片式 + 图标按钮；Native 列表式 + 文字按钮 |
| `ConfirmModal` | `wx.showModal` 或内联弹窗 | Taro：可定制图标/样式/遮罩关闭；Native：系统对话框或简单内联 |
| `ShareSheet` | 无组件，用 `open-type="share"` | Taro：自定义分享面板；Native：微信原生分享按钮 |
| `CommentInput` / `CommentItem` | 日记页内联 | Taro 独立组件；Native 内联且交互不同（删除按钮 vs 长按） |
| `ErrorBoundary` | 无等效 | React 专属，小程序无需 |
| `SplashScreen` | 无等效 | Native 无启动屏组件 |
| `Icons` | 无组件，用 PNG 图片 | Taro：React 图标组件；Native：直接引用 PNG 路径 |

### 2.2 组件回退策略差异

| 模式 | Taro | Native |
|------|------|--------|
| 图片加载失败 | `CatAvatar` 显示首字母 | 无回退，显示空白 |
| 确认弹窗 | `ConfirmModal` 组件（自定义 UI） | `wx.showModal`（系统弹窗）或内联弹窗 |
| 分享 | `ShareSheet` 组件 + Canvas 生成分享图 | `open-type="share"` 按钮 + Canvas 生成分享图 |
| 页头导航 | `PageHeader` + `useNavSpace()` hook | 各页面内联 + CSS `var(--nav-top)` |
| Tab Bar | `Taro.eventCenter` 事件驱动显隐 | `<native-tab-bar>` 组件，页面手动引入 |

---

## 3. Tab Bar 差异

| 差异项 | Taro | Native |
|--------|------|--------|
| 导航方式 | `Taro.switchTab()`（保留页面栈） | `wx.reLaunch()`（销毁页面栈） |
| 活跃标签页检测 | 不检测，始终调用 switchTab | 检测 `key === active` 则跳过 |
| 显隐控制 | 支持 `tabbar:hide` / `tabbar:show` 事件 | 不支持显隐 |
| 中心标签文字 | 活跃时始终显示 | 活跃时也隐藏（与普通标签一致） |
| `-webkit-backdrop-filter` | 缺失 | 有 `-webkit-backdrop-filter: blur(24rpx)` |
| 注册方式 | Taro 自定义 TabBar 约定 | `app.json` 全局 `usingComponents` + 页面内 `<native-tab-bar>` |
| 图标尺寸 | 内联 style px 单位 | CSS rpx 单位 |

---

## 4. 页面逐页对比

### 4.1 welcome/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 加载动画 | 无 | 有脉冲加载点（`pulse` 动画） |
| 品牌文字颜色 | `#5D4037` | `#633E1D`（不同色值） |
| 副标题颜色 | `#999` | `#8E8E8E` |
| 品牌字重 | bold | 900 |
| 水平内边距 | 无 | `padding: 0 48rpx` |
| 认证架构 | `storage.getUserInfo()` + `storage.syncFromServer()` | `authService` + `session-router` + 事件驱动 |
| 路由守卫 | 无 | `didRoute` 防重复路由 |
| 事件监听 | 无 | `auth:ready` 事件 |

### 4.2 login/index

| 差异项 | Taro | Native |
|--------|------|--------|
| Logo 尺寸 | `PawLogo` 组件 48px（≈96rpx） | `<image>` 66rpx（更小） |
| 猫咪图片 | 始终渲染 | `wx:if` 条件渲染 |
| 颜色变量 | 使用 `var(--primary)` 等语义变量 | 硬编码 `#e89f71`、`#8e8e8e` 等 |
| 协议文本结构 | 嵌套 `<Text>` + `onClick` + `e.stopPropagation()` | `<view>` 包含 `<text>` + `catchtap` |
| 抖动动画 | `agreementShake` 0.4s ease | `shake` 0.25s linear |
| 字重差异 | 忘记密码 500 / 勾选 700 / 版权 700 | 忘记密码 700 / 勾选 900 / 版权 900 |
| 开发模式检测 | `process.env.NODE_ENV` | `wx.getAccountInfoSync().miniProgram.envVersion` |
| 登录按钮 | `<Button disabled={isLoading}>` | `<button loading="{{loading}}">`（原生 loading 属性） |

### 4.3 register/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 返回按钮 | PageHeader 组件 + 箭头图片 | 文字 `‹` 字符 |
| 输入框文字字重 | 默认（400） | 700（加粗） |
| 按钮文字字重 | 700 | 800 |
| 输入标签 | `text-transform: uppercase` + `letter-spacing: 0.2em` | 无 `text-transform` + `letter-spacing: 4rpx` |
| 重复用户名检查 | `storage.findUser()` 客户端预检 | 无 |
| disableScroll | 配置中有 | 配置中无 |
| 错误文字字重 | 500 | 600 |

### 4.4 reset-password/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 导航栏 | 自定义 PageHeader | 默认微信导航栏（但 WXML 也有自定义页头，可能双页头） |
| 错误显示 | 内联 `<View className="error-box">` | 仅用 `wx.showToast`，WXML 无 error-box |
| 发送验证码 | 调用 API `/api/v1/auth/send-reset-code` | 仅显示 toast，不调用 API |
| 成功提示 | 自定义绿色 toast | `wx.showToast` 黑色提示 |
| 错误框背景 | `rgba(255,77,79,0.08)` | `#fff1f1` |
| 提交按钮 | `<View>` + onClick | `<button>` + `loading` 属性 |

### 4.5 set-nickname/index

| 差异项 | Taro | Native |
|--------|------|--------|
| Emoji 过滤 | 完整 Emoji 1.0-15.0 正则 | 无 |
| 认证守卫 | 有（未登录跳转登录页） | 无 |
| 默认昵称 | 预填 `user.nickname` | 空字符串 |
| 自动聚焦 | 有 `focus` 属性 | 无 |
| 按钮禁用 | 昵称 < 2 字符时禁用 | 始终启用，提交时验证 |
| 保存按钮字重 | 600 | 800 |
| 导航栏 | 自定义 | 默认微信导航栏 + WXML 自定义页头（双页头风险） |

### 4.6 home/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 顶部工具栏 | 无 | 有（切换/历史/我的 三个按钮） |
| 动作按钮栏 | 无（纯手势交互） | 有（蹭蹭/摸头/踩奶/逗猫 4 个按钮 + 补齐按钮） |
| 猫咪头像 | `CatAvatar` 组件（有回退） | 纯 `<image>` 无回退 |
| 气泡动画 | `FrostedGlassBubble` 组件（有 enter/exit 动画） | 内联标记，缺少 `bubbleIn`/`bubbleOut` 关键帧 |
| 问候语 | 有（早安/晚安等时间段问候） | 无 |
| 互动提示事件 | `home:show-interaction-hint` | 无 |
| 视频重试 | 重置状态 | 递增 `videoRetryKey` 强制重挂载 |
| 积分逻辑 | 内联 `storage` 计算 | 委托 `contentStore` |
| 分享 | `useShareAppMessage` / `useShareTimeline` | 无 |
| Tab Bar | 不在模板中（事件控制） | `<native-tab-bar active="home" />` |
| 积分 toast 动画 | `pointsToastIn`/`pointsToastOut` 关键帧 | 无动画，直接显隐 |

### 4.7 empty-cat/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 返回按钮 | 有（白色圆形 + 箭头图片） | WXML 中缺失（CSS 存在但未渲染） |
| 主标题 | "遇见你的数字猫咪"（换行） | "遇见你的数字猫咪伙伴"（单行，不同文案） |
| 描述文案 | "开启一段温暖的治愈旅程..." | "上传真实照片生成专属形象..." |
| 卡片标题 | "我有猫咪" / "我想养猫" | "上传猫咪照片" / "选择预设猫咪" |
| 卡片描述 | 不同 | 不同 |
| 上传提示文字 | "点击上传照片或视频" | "RECOMMENDED" |
| 兑换徽章 | 无 | 有（`isRedemption` 条件显示） |
| 页脚 | 版权信息 "© 2026 MIAO" | 退出登录按钮 |
| Logo 渐变 | `linear-gradient` + `background-clip: text` | 纯色 `var(--color-warm-brown)` |
| 卡片图标 | `camera-primary.png` + `PawLogo` | `upload-primary.png` + `sparkles-primary.png` |

### 4.8 cat-start/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 返回按钮 | 白色圆形 + 箭头图片 | 文字 `‹`，无背景圆 |
| 插图 | 双层 `PawLogo` + 闪光 emoji + float/sparkle 动画 | 单个静态 logo.png 220rpx |
| 背景装饰 | 两个脉冲动画圆 | CSS 存在但 WXML 未渲染 |
| 描述文案 | "每一个温暖的灵魂都在等待相遇。开启一段专属缘分，领养你的第一只数字猫咪吧。" | "开启一段专属缘分，领养你的第一只数字猫咪。"（缩短） |
| 开始按钮 | 纯色 `var(--primary)` + 箭头动画 | 渐变 `var(--primary)` → `var(--primary-strong)` + 无箭头 |
| 按钮高度 | 112rpx | 96rpx |
| 按钮圆角 | 56rpx | 48rpx |
| 按钮文字 | 36rpx / 900 | 32rpx / 700 |
| 描述颜色 | `var(--color-warm-brown-muted)` | `#6E5844`（不同色值） |
| 导航栏 | 自定义 | 默认微信导航栏 + 标题 "开启缘分" |
| 动画 | pulse / float / sparkle-pulse / arrow-move | 全部缺失 |

### 4.9 create-companion/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 表单标签 | 中文 "猫咪昵称" | 英文 "CAT NAME" |
| 毛色输入 | 无 | 有（第三表单段 "FUR COLOR"） |
| 兑换提示 | 无 | 有 |
| 错误显示 | 自定义 toast（顶部定位） | 内联错误文字 + toast（底部定位） |
| 生成按钮 | `<View>` + sparkles 图标 | `<button>` + `loading` 属性 |
| 预设猫自动选择 | 无（初始 null） | 自动选中第一个 |
| 数据服务 | `storage.getPresetCats()` / `storage.saveCatInfo()` | `dataStore.getPresetCats()` / `dataStore.createDraftCat()` |

### 4.10 upload-material/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 兑换徽章 | 无 | 有 |
| 错误显示 | 无 | 有（内联红色文字） |
| 确认弹窗 | `backdrop-filter: blur(20px)` | 无 `backdrop-filter` |
| 加载遮罩 | `backdrop-filter: blur(10px)` | 无 `backdrop-filter` |
| 加载标题字号 | 40rpx | 32rpx（更小） |
| 积分检查 | 无 | 生成前检查 `contentStore.getEffectivePoints()` |
| 图片选择 | `Taro.chooseMedia` + `Taro.chooseImage` 回退 | `chooseImage()` + `compressImage()` 工具函数 |
| 生成成功提示 | 无 | `wx.showToast({ title: '形象已生成' })` |

### 4.11 generation-progress/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 生成中返回按钮 | 有（白色箭头） | 无 |
| 进度提示 | 静态文字 "请耐心等待..." | 动态 `{{currentIndex}} / {{totalCount}} · {{actionLabel}}` |
| 完成步骤图标 | `CHECKCIRCLE_GREEN` 图片 | `✓` 文字字符 |
| 确认弹窗 | `backdrop-filter: blur(40px)` | 无 `backdrop-filter` |
| 确认按钮布局 | 水平排列 | 垂直排列 |
| 错误页面按钮 | 2 个（重试 + 返回） | 3 个（重试 + 返回创建 + 稍后再说） |
| 任务持久化 | 无 | `generationTasks` 服务 |
| 多动作队列 | 仅 idle 后解锁 | 支持 `action=all` 生成全部动作 |
| 积分管理 | `storage.deductPoints()` / `storage.addPoints()` | `contentStore.spendPoints()` / `contentStore.refundPoints()` |

### 4.12 switch-companion/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 活跃猫咪指示 | 绿色勾号图标 | "当前" 文字标签 |
| AI 标记 | 有（sparkles 图标） | 无 |
| 删除按钮 | 圆形图标按钮 | 药丸形文字按钮 "删除" |
| 删除确认 | 自定义弹窗 | `wx.showModal` |
| 添加按钮 | 仅卡片形式 | 页头 + 卡片两处 |
| 添加卡片布局 | 垂直（2 列网格） | 水平行 |
| 积分提示文案 | 有 "喵~" | 无 "喵~" |
| 积分数据 | `storage.getPoints()` 原始值 | `contentStore.getEffectivePoints()` 含作弊调整 |
| 页头 | PageHeader + 积分徽章 | 内联页头 + 积分徽章 + 圆形添加按钮 |

### 4.13 cat-player/index

| 差异项 | Taro | Native |
|--------|------|--------|
| 暂停指示器 | 有（点击暂停/播放） | 无 |
| 动作切换 | 无（固定播放 petting 视频） | 有（苏醒/摸头/踩奶/逗猫 4 个动作芯片） |
| 删除确认 | 自定义弹窗 | `wx.showModal` |
| 视频错误 | 自定义弹窗覆盖层 | 内联面板 |
| 保存失败提示 | toast "保存失败，请长按图片手动保存" | `wx.showModal` 含 "去设置" 按钮 |
| 视频超时 | 30 秒 | 无 |
| 页头 | PageHeader | 内联页头 + 猫名标题 + 白色箭头 |
| 动作按钮背景 | `backdrop-filter: blur(10px)` | 无 `backdrop-filter` |

### 4.14 cat-history/index

| 差异项 | Taro | Native |
|--------|------|------|
| 网格布局 | Flex `width: calc(50% - 12rpx)` | CSS Grid `grid-template-columns: repeat(2, 1fr)` |
| 猫咪头像 | `CatAvatar` 组件 | 纯 `<image>` |
| 日期格式 | `toLocaleDateString()` | 自定义 `formatDate()`（YYYY-MM-DD） |
| 删除确认 | 自定义弹窗 | 自定义弹窗（相同模式） |
| 删除操作 | `FileManager.deleteVideo(id)` | `dataStore.deleteCatById(id)` |
| ID 传递 | 直接传递 | `encodeURIComponent(id)` |
| 播放按钮背景 | `backdrop-filter: blur(10px)` | 无 `backdrop-filter` |

### 4.15 accompany-milestone/index

| 差异项 | Taro | Native |
|--------|------|------|
| **页面结构** | 日历视图 + 温馨留言 | 英雄卡片 + 统计 + 里程碑清单 |
| 日历 | 有（完整月历 + 爪印标记） | 无 |
| 统计区 | 无 | 有（日记数 + 视频数 2 列） |
| 里程碑清单 | 无 | 有（初次相遇/7天/30天/10篇日记） |
| 温馨留言 | 有 | 无 |
| 天数卡片副标题 | 无 | 有 "你们已经一起走过这些小小节点。" |
| 天数字号 | 96rpx / 800 | 92rpx / 900 |
| 页头标题字号 | 36rpx / 700 | 42rpx / 900 |
| 返回按钮 | PageHeader 圆形箭头图标 | 84rpx 圆角方形 + `‹` 文字 |
| 数据来源 | URL 参数 | `dataStore.getActiveCat()` + `dataStore.getCatStats()` |

> **这是差异最大的页面，两个版本几乎是完全不同的设计。**

### 4.16 diary/index

| 差异项 | Taro | Native |
|--------|------|------|
| 日记卡片 | `DiaryCard` 共享组件 | 内联 `.diary-item` 列表 |
| 头像圆角 | 36rpx（圆形） | 28rpx（圆角矩形） |
| 互动按钮 | 图片图标（heart/message/share） | 文字按钮（已赞/评论/分享） |
| 同步状态 UI | 无 | 有（sync-badge + sync-panel） |
| 长按评论 | 浮动提示框（复制/删除） | 内联删除按钮 |
| 分享 | `ShareSheet` 组件 | `open-type="share"` 按钮 |
| 删除确认 | `ConfirmModal` 组件 | `wx.showModal` |
| 单页模式 | 有（场景 1154 横幅） | 无 |
| 好友轮询 | 60 秒间隔 | 仅 onShow 时同步 |
| 下拉刷新 | 有（ScrollView refresherEnabled） | 无 |
| 键盘适配 | `Taro.onKeyboardHeightChange` 动态偏移 | 无 |
| 媒体图标 | SVG（image-outlined.svg, video-outlined.svg） | PNG（image-gray.png, film-gray.png） |
| 评论输入字号 | 14px | 27rpx |
| Tab 切换动画 | 方向性滑动（左/右） | 仅右滑 |
| Tab Bar | 事件控制显隐 | `<native-tab-bar active="diary" />` |

### 4.17 time-letters/index

| 差异项 | Taro | Native |
|--------|------|------|
| 详情页背景 | `var(--text-primary)` + 透明渐变 | `#2d211d` + 暖色渐变 `rgba(43,28,20,0.22/0.68)` → `var(--background)` |
| 详情卡片 | `var(--surface-container)` + `border-radius: 32px 32px 0 0` | `var(--background)` + `border-radius: 48rpx 48rpx 0 0` + 底部阴影 |
| 长按强制解锁 | 有（振动 + `Taro.showModal`） | 无（仅点击查看已解锁信件） |
| 实时倒计时 | 有（10 秒间隔更新） | 无（渲染时设置一次） |
| 信件已读追踪 | 无 | 有（`contentStore.markLetterRead`） |
| 副标题大小写 | 小写 "Write to future" / "Echo from past" | 大写 "WRITE TO FUTURE" / "ECHO FROM PAST" |
| 信件内容样式 | `font-style: italic` | 无 italic |
| 删除确认 | `ConfirmModal` 组件 | 内联自定义弹窗 |
| 服务端同步 | 无（仅本地存储） | `contentStore.syncLettersFromServer()` onShow |
| 详情页引导对齐 | 左对齐 | 居中 |
| 装饰圆颜色 | `rgba(255,157,118,0.05)` | `rgba(232,159,113,0.08)` |

### 4.18 points/index

| 差异项 | Taro | Native |
|--------|------|------|
| 兑换卡片边框（锁定） | `3rpx dashed rgba(93,64,55,0.2)` + opacity 0.8 | `4rpx dashed rgba(232,159,113,0.3)` |
| 兑换卡片边框（激活） | `3rpx solid rgba(232,159,113,0.2)` + opacity 1.0 | `border-color: var(--primary)` 无透明度变化 |
| 消费金额颜色 | `var(--color-danger)`（红色） | `var(--on-surface-variant)`（中性灰） |
| 兑换提示颜色 | `var(--primary)`（橙色） | `var(--color-danger)`（红色） |
| 弹窗关闭按钮 | 88rpx | 64rpx |
| 弹窗项目背景 | `#F9FAFB` | `var(--surface-container-low)` |
| 任务数据源 | 硬编码 3 个任务 | `contentStore.getPointTasks()`（服务端驱动） |
| 每日登录积分 | 页面不触发 | `contentStore.grantDailyLogin()` onShow |
| 弹窗结构 | `slideUp` 动画 | `bottom-sheet` 类 + `<scroll-view>` |
| 历史项间距 | 32rpx padding + 32rpx gap | 24rpx padding + 18rpx gap |
| 任务描述字号 | 18rpx | 20rpx |
| 兑换标题 | 36rpx / 700 | 34rpx / 900 |

### 4.19 profile/index

| 差异项 | Taro | Native |
|--------|------|------|
| 扫码按钮 | 页头有 | 页头无 |
| 菜单项数量 | 6 个 | 13 个（含切换猫咪/里程碑/创建猫咪/时光信件/邀请/消息中心/隐私设置/隐私政策/服务条款） |
| 快捷网格 | 无 | 有（4 个快捷入口，但 CSS 隐藏） |
| 退出登录 | 菜单项 | 独立 `miao-button-secondary` 按钮 |
| 删除确认 | `ConfirmModal` 组件 | `wx.showModal` |
| 管理员入口 | 5 次点击 / 3 秒窗口 | 5 次点击 / 1.8 秒窗口 |
| 菜单区标题 | "Account Settings" | "SETTINGS" |
| 菜单箭头 | 文字 `>` | 图片 `chevronright-gray.png` |
| ScrollView | 有 | 无（整页滚动） |
| Tab Bar | 事件控制 | `<native-tab-bar active="profile" />` |

### 4.20 edit-profile/index

| 差异项 | Taro | Native |
|--------|------|------|
| 头像 URL 输入 | 无 | 有（手动输入 URL 字段） |
| 手机号显示 | 有（条件显示） | 无 |
| 昵称验证 | 非空 | 2-12 字符 |
| 成功提示 | 顶部绿色 toast | `wx.showToast` + 底部暗色 toast |
| 头像占位 | `DEFAULT_AVATAR` 常量 | 首字母回退 |
| 输入 maxlength | 无 | `maxlength="12"` |
| 图片选择 | `Taro.chooseImage` | `wx.chooseMedia` + `wx.chooseImage` 回退 |

### 4.21 change-password/index

| 差异项 | Taro | Native |
|--------|------|------|
| 当前密码字段 | 条件显示（`user.passwordSet`） | 始终显示 |
| 页面标题 | 动态（"Security Verification" / "Cross-device Login"） | 固定 "Security Verification" |
| 错误显示 | 内联 error-box | `wx.showToast` |
| 错误框背景 | `rgba(255,77,79,0.08)` | `#fff1f1` |
| Toast 颜色 | `var(--primary-strong)`（暖色） | `rgba(0,0,0,0.72)`（暗色） |
| 具体错误码 | 有（INVALID_CURRENT_PASSWORD 等） | 无 |

### 4.22 privacy-settings/index

| 差异项 | Taro | Native |
|--------|------|------|
| 图标 | PNG 图片（trash2-red2.png, shieldcheck-primary.png） | 文字字符（`x`, `checkmark`） |
| 清除缓存显示 | 仅存储大小 | 存储大小 + 文件数（"1.2 MB . 3 media cache"） |
| 清除遮罩 | 全屏居中旋转器 | 白色卡片 + 旋转器 |
| 旋转器尺寸 | 80rpx | 56rpx |
| 缓存清除逻辑 | `storage.clearMediaCache()` | 文件级清理（tmp_*, upload_*, 未引用 media_*） |

### 4.23 notifications/index

| 差异项 | Taro | Native |
|--------|------|------|
| 英雄图标 | emoji `🔔` | PNG 图片 `bell-primary.png` |
| 设置卡片透明度 | 0.5 | 0.62 |
| 页脚文案 | "in-app" | "in mini-program message center" |
| 数据流 | `storage` + 直接 API | `contentStore` 抽象 |

### 4.24 notification-list/index

| 差异项 | Taro | Native |
|--------|------|------|
| 通知图标 | PNG 图片（sparkles/coins/heart/bell） | 中文字符（point/letter/meow/news） |
| 图标尺寸 | 96rpx 圆 + 22px 图片 | 60rpx 圆 + 24rpx 文字 |
| 页面标题 | "Notifications" | "Message Center" |
| 通知构建 | 页面内计算 | `contentStore.buildNotificationItems()` |
| 未读点颜色 | `var(--color-danger)` | `#D64B4B` |

### 4.25 admin-settings/index

| 差异项 | Taro | Native |
|--------|------|------|
| 按钮定位 | 固定底栏 | 内联在区域内 |
| 区段图标 | 有（settings-dark.png） | 无 |
| 预设猫删除 | X 图标按钮 | 红色文字 "删除" 按钮 |
| 预设猫上传 | 图片预览 + 上传图标 | 文字 "Select Image" / "Processing" |
| 预设猫重置 | 无 | 有独立重置按钮 |
| 开关描述 | 无 | 有（passexpand_param / for local QA） |
| 提示框 | 有 | 无 |
| 单位系统 | 大量 px | 全部 rpx |
| 区段标题 | "Debug Tools" | "Debug Switches" |

### 4.26 add-friend-qr/index

| 差异项 | Taro | Native |
|--------|------|------|
| 额外操作 | 无 | 有（复制邀请码/复制链接/重新生成 3 个按钮） |
| 二维码预览 | 无 | 有（点击全屏预览） |
| Toast 变体 | 单一暗色 | 成功/错误/暗色 3 种 |
| 头像 | `CatAvatar` 组件 | 字母回退 |
| 分享 | `useShareAppMessage` | `onShareAppMessage` 页面方法 |
| 错误图标 | `alertcircle-primary.png` | 文字 `!` |
| 渲染延迟 | 300ms | 120ms |

### 4.27 join-friend/index

| 差异项 | Taro | Native |
|--------|------|------|
| 手动邀请码输入 | 无 | 有 |
| 未认证流程 | 有（登录 + 注册按钮） | 无 |
| 按钮加载态 | 无 | 有（"Adding..."） |
| 错误内容 | "Invalid Link" + 猫咪 emoji | "Enter Invite Code" + 手动输入表单 |
| 头像 | `CatAvatar` 组件 | 简单 view + 文字首字母 |
| 错误/成功图标 | emoji（😿/🎉） | 文字字符（!/checkmark） |

### 4.28 scan-friend/index

| 差异项 | Taro | Native |
|--------|------|------|
| 页头 | PageHeader（左对齐） | 居中标题 + 副标题 "SCAN FRIEND QR" |
| 扫描图标 | 裸图片 | 112rpx 圆角方形容器内 |
| "我的二维码"图标 | 手机 emoji | "QR" 文字 |
| 扫描配置 | `onlyFromCamera: true` | `onlyFromCamera: false`（允许相册） |
| 返回导航 | `safeBack()` 通用 | `goBack()` → 日记页 |

### 4.29 download/index

| 差异项 | Taro | Native |
|--------|------|------|
| 二维码区域 | 无包装卡片 | 白色卡片 + `qr-frame` 内边框 |
| 副提示文字 | 无 | 有 "App 版本即将上线，小程序数据将持续兼容。" |
| 第三特性图标 | emoji `📴` | `download-primary.png` 图片 |
| 特性图标容器 | 无 | 72rpx 圆角方形容器 |
| 按钮样式 | 深色 iOS + 白色边框 Android | 渐变主色 + 暖白次色（`miao-button-*`） |
| 提示文字颜色 | `var(--text-secondary)` | `var(--text-primary)` |

### 4.30 feedback/index

| 差异项 | Taro | Native |
|--------|------|------|
| 页面标题 | "反馈" | "意见反馈" |
| 返回按钮 | PageHeader 箭头图片 | 文字 `‹` |
| 问卷文字 | 完整版 | 缩短版（去括号/简化措辞） |
| 反馈类型标签 | "问题类型" | "反馈类型" |
| 文本域占位符 | "请详细描述您遇到的问题或建议...（至少 10 个字）" | "告诉我们哪里不好用，或者你想要什么功能" |
| 文本域最大长度 | 500 | 800（简单反馈）
| 提交按钮文字 | "发送反馈" | "提交反馈" |
| 成功后行为 | 2 秒后自动返回 | 停留在成功页 |
| 加载状态 | 无 | `loading="{{saving}}"` |
| API 错误处理 | 静默 catch | `wx.showToast` 显示错误 |
| 存储键 | `miao_has_submitted_survey` | `miao_has_submitted_survey_native`（不同键！） |
| 字重差异 | 多处 600/700/800 | 对应 700/800/900（系统偏重） |

### 4.31 privacy-policy/index

| 差异项 | Taro | Native |
|--------|------|------|
| 英雄图标 | emoji `🛡️` | 中文字符 `盾` |
| 英雄图标字号 | 64rpx | 44rpx / 900 / `var(--primary-strong)` |
| 内容差异 | 完整版 | 缩短版：移除"设备权限请求"整个章节，简化第三方接入说明，删除火山引擎/字节跳动名称 |
| 副标题字重 | 700 | 900 |
| 条款标签字重 | 700 | 800 |

### 4.32 terms-of-service/index

| 差异项 | Taro | Native |
|--------|------|------|
| 英雄图标 | emoji `⚖️` | 中文字符 `约` |
| 内容差异 | 完整版 | 缩短版：移除第 2.3 节（用户责任），简化使用限制，删除火山引擎名称，删除具体示例 |
| 副标题字重 | 700 | 900 |

---

## 5. 系统性差异总结

### 5.1 架构差异

| 维度 | Taro | Native |
|------|------|--------|
| 状态管理 | React `useState`/`useEffect`/`useRef` | Page `data` + `setData()` |
| 认证 | `useAuthContext()` hook | `authService` 模块 |
| 数据存储 | `storage`（本地同步） | `dataStore`/`contentStore`/`socialStore`（异步 + 服务端同步） |
| 路由 | `Taro.navigateTo`/`reLaunch`/`switchTab` | `navigateTo()`/`reLaunch()`/`safeBack()` from utils |
| 导航栏间距 | `useNavSpace()` hook | CSS `var(--nav-top)` 直接使用 |
| 分享 | `useShareAppMessage`/`useShareTimeline` hooks | `onShareAppMessage`/`onShareTimeline` 页面方法 |
| 事件系统 | `Taro.eventCenter` + `eventAdapter` | `event-bus` 工具模块 |

### 5.2 样式模式差异

| 模式 | Taro | Native |
|------|------|--------|
| 单位 | 混用 rpx 和 px | 全部 rpx |
| CSS 变量 | 广泛使用 `var(--*)` | 混合使用变量和硬编码值 |
| 字重 | 偏轻（600/700/800） | 偏重（700/800/900） |
| `backdrop-filter` | 广泛使用 | 大部分缺失（兼容性考虑） |
| `letter-spacing` | `em` 单位 | `rpx` 单位 |
| `text-transform` | 使用 `uppercase` | 直接在 WXML 中写大写 |
| 行高 | 较少显式设置 | 频繁显式设置 |
| 按钮渐变 | 主按钮纯色 | 主按钮渐变 |
| 按钮重置 | 不需要 | `button::after { border: 0 }` + `margin: 0; padding: 0` |

### 5.3 功能差异汇总

| 功能 | Taro | Native |
|------|------|--------|
| Emoji 过滤 | set-nickname 有完整正则 | 无 |
| 认证守卫 | set-nickname 有 | 无 |
| 重复用户名检查 | register 有 | 无 |
| 内联错误显示 | 多页面有 error-box | 多页面用 `wx.showToast` |
| 自定义成功 Toast | reset-password 等 | 用 `wx.showToast` |
| 按钮禁用态 | 多处有 | 较少，多用 `loading` 属性 |
| 输入自动聚焦 | set-nickname 有 | 无 |
| 下拉刷新 | diary 有 | 无 |
| 键盘适配 | diary 有 | 无 |
| 单页模式 | diary 有 | 无 |
| 好友轮询 | diary 60 秒 | 仅 onShow |
| 长按解锁 | time-letters 有 | 无 |
| 实时倒计时 | time-letters 10 秒 | 无 |
| 信件已读 | time-letters 无 | 有 |
| 服务端同步 | 部分页面 | 广泛使用（contentStore/dataStore） |
| 动作切换 UI | home 无（纯手势） | home 有（4 个按钮） |
| 顶部工具栏 | home 无 | home 有 |
| 手动邀请码 | join-friend 无 | 有 |
| 二维码预览 | add-friend-qr 无 | 有 |
| 复制邀请链接 | add-friend-qr 无 | 有 |
| 扫描相册 | scan-friend 不允许 | 允许 |
| 猫咪日历 | accompany-milestone 有 | 无 |
| 里程碑清单 | accompany-milestone 无 | 有 |
| 统计区 | accompany-milestone 无 | 有 |
| 媒体同步状态 | diary 无 | 有 |
| Tab Bar 显隐 | 事件控制 | 不支持 |

### 5.4 导航配置差异

| 页面 | Taro | Native |
|------|------|--------|
| welcome | 无配置（默认） | `navigationStyle: 'custom'` |
| login | `custom` | `custom` |
| register | `custom` + `disableScroll` | `custom` |
| home | `custom` + `disableScroll` | `custom` |
| diary | `custom` | 默认 + `navigationBarTitleText: "日记"` |
| time-letters | `custom` | 默认 + `navigationBarTitleText: "时光信"` |
| points | `custom` + `disableScroll` | 默认 + `navigationBarTitleText: "积分"` |
| profile | `custom` + `disableScroll` | 默认 + `navigationBarTitleText: "我的"` |
| reset-password | `custom` + `disableScroll` | 默认 + `navigationBarTitleText: "重置密码"` ⚠️ |
| set-nickname | `custom` | 默认 + `navigationBarTitleText: "设置昵称"` ⚠️ |
| cat-start | 无配置 | 默认 + `navigationBarTitleText: "开启缘分"` |
| feedback | `custom` + `disableScroll` | 默认 + `navigationBarTitleText: "意见反馈"` |

> ⚠️ reset-password 和 set-nickname 的 Native 版本同时有默认导航栏 + WXML 自定义页头，可能导致双页头。

---

## 6. Native 独有页面

### bootstrap/index

Native 项目有一个 Taro 中不存在的诊断页面：

- **路径**: `pages/bootstrap/index`
- **功能**: 显示后端 API URL、认证状态、同步状态；提供"检查服务"和"同步基础数据"按钮
- **导航**: `navigationStyle: 'custom'`
- **用途**: 开发调试，检查后端连接和强制同步
- **依赖**: `config/env`, `utils/request`, `services/auth`, `services/sync-manager`, `utils/event-bus`

---

## 7. 顶部安全区域（胶囊按钮避让）审计

### 7.1 根本原因

**Taro 的正确做法：** `useNavSpace()` hook 在运行时调用 `Taro.getMenuButtonBoundingClientRect()` 动态计算 `--nav-top = capsuleTop + capsuleHeight + 8px`，确保内容始终在微信右上角胶囊按钮下方。

**Native 的问题：** 全局 `--nav-top` 定义为 `calc(env(safe-area-inset-top) + 16rpx)` ≈ `statusBarHeight + 8px`，而微信胶囊按钮底部约为 `statusBarHeight + 38px`，留下约 **30px 重叠区域**。且 `--nav-top` 已全局定义，导致 `var(--nav-top, fallback)` 中的 fallback 永远不生效。

### 7.2 各页面顶部安全区域状态

#### ❌ 严重 — 完全未处理安全区域（内容会与状态栏和胶囊重叠）

| 页面 | Native 顶部处理 | Taro 处理 | 风险 |
|------|----------------|-----------|------|
| admin-settings | `padding: 56rpx 36rpx`（无状态栏偏移） | PageHeader + useNavSpace | ❌ 内容从 28px 开始，与状态栏重叠 |
| notification-list | `padding: 56rpx 36rpx`（无状态栏偏移） | PageHeader + useNavSpace | ❌ 同上 |
| bootstrap | `padding-top: 72rpx`（无状态栏偏移） | 无 Taro 等效 | ⚠️ 开发调试页 |

#### ⚠️ 高 — 仅清除状态栏但未避开胶囊按钮

| 页面 | Native 顶部值 | 胶囊重叠量 |
|------|-------------|-----------|
| add-friend-qr | `calc(env(safe-area-inset-top) + 20rpx)` ≈ statusBar+10px | ~28px |
| change-password | `calc(env(safe-area-inset-top) + 20rpx)` | ~28px |
| edit-profile | `calc(env(safe-area-inset-top) + 20rpx)` | ~28px |
| feedback | `calc(env(safe-area-inset-top) + 20rpx)` | ~28px |
| generation-progress | back btn `top: calc(env(safe-area-inset-top) + 32rpx)` | ~22px |
| privacy-policy | `calc(env(safe-area-inset-top) + 20rpx)` | ~28px |
| reset-password | `calc(env(safe-area-inset-top) + 20rpx)` | ~28px |
| set-nickname | `calc(env(safe-area-inset-top) + 20rpx)` | ~28px |
| terms-of-service | `calc(env(safe-area-inset-top) + 20rpx)` | ~28px |
| diary | `calc(env(safe-area-inset-top) + 36rpx)` ≈ statusBar+18px | ~20px |
| register | `calc(env(safe-area-inset-top) + 56rpx)` ≈ statusBar+28px | ~10px |

#### ⚠️ 中 — 使用 `var(--nav-top)` 但全局值过小（fallback 不生效）

| 页面 | Native CSS 模式 | fallback（永不触发） |
|------|----------------|---------------------|
| accompany-milestone | `padding: var(--nav-top, ...)` | `env(safe-area-inset-top) + 36rpx` |
| cat-history | `padding-top: var(--nav-top, ...)` | `env(safe-area-inset-top) + 20rpx` |
| cat-player | `top: var(--nav-top, ...)` | `env(safe-area-inset-top) + 20rpx` |
| cat-start | `top: var(--nav-top, ...)` | `env(safe-area-inset-top) + 36rpx` |
| create-companion | `padding-top: var(--nav-top, ...)` | `env(safe-area-inset-top) + 20rpx` |
| download | `padding: var(--nav-top, ...)` | `env(safe-area-inset-top) + 56rpx` |
| empty-cat | `top: var(--nav-top, ...)` | `env(safe-area-inset-top) + 36rpx` |
| join-friend | `padding: var(--nav-top, ...)` | `env(safe-area-inset-top) + 20rpx` |
| notifications | `padding: var(--nav-top, ...)` | `env(safe-area-inset-top) + 56rpx` |
| points | `padding: var(--nav-top, ...)` | `env(safe-area-inset-top) + 76rpx` |
| privacy-settings | `padding: var(--nav-top, ...)` | `env(safe-area-inset-top) + 56rpx` |
| profile | `padding: var(--nav-top, ...)` | `env(safe-area-inset-top) + 76rpx` |
| switch-companion | `padding-top: var(--nav-top, ...)` | `env(safe-area-inset-top) + 20rpx` |
| upload-material | `top: var(--nav-top, ...)` | `env(safe-area-inset-top) + 36rpx` |

#### ✅ 较好 — 使用 `--wechat-capsule-safe-top-gap`（76rpx ≈ 38px，接近正确值）

| 页面 | Native CSS 模式 |
|------|----------------|
| diary（header overlay） | `calc(env(safe-area-inset-top) + var(--wechat-capsule-safe-top-gap))` |
| time-letters | `calc(env(safe-area-inset-top) + var(--wechat-capsule-safe-top-gap))` |
| scan-friend | `calc(env(safe-area-inset-top) + var(--wechat-capsule-safe-top-gap))` |

#### ✅ 无影响 — 沉浸式页面或居中内容

| 页面 | 说明 |
|------|------|
| home | 全屏沉浸式视频，顶部工具栏使用独立定位 |
| login | 内容居中，顶部元素与胶囊无明显冲突 |
| welcome | 内容居中，无顶部交互元素 |

### 7.3 修复建议

在 `app.js` 的 `onLaunch` 中动态计算并注入 `--nav-top`：

```javascript
const menuButton = wx.getMenuButtonBoundingClientRect();
const navTop = `${menuButton.top + menuButton.height + 8}px`;
const navHeight = `${menuButton.height}px`;
const navSide = `${Math.max(21, wx.getSystemInfoSync().windowWidth - menuButton.right + 21)}px`;
// 在每个页面 onShow 时设置到 page 元素上
```

---

## 8. 容器宽度与水平对齐扫描

### 8.1 存在宽度/对齐问题的页面

#### ❌ time-letters/index — 多处 px/rpx 混用

| 元素 | Taro | Native | 差异 |
|------|------|--------|------|
| 猫咪筛选区 padding | `0 24px` | `0 48rpx` | px vs rpx，375px 屏幕上 24px ≈ 48rpx，其他屏幕不同 |
| 信件列表 padding-top | `16px` | `32rpx` | px vs rpx |
| 详情页头 padding | `24px` | `32rpx` | px vs rpx |
| 详情引导区 padding | `0 32px 32px` | 无水平 padding（margin-top） | 不同方式 |
| 详情卡片 padding | `40px` | `48rpx 40rpx` | px vs rpx |

#### ❌ admin-settings/index — 全页 px 单位

| 元素 | Taro | Native | 差异 |
|------|------|--------|------|
| 滚动区 padding | `16px` | `36rpx`（页面级） | px vs rpx |
| 区段 padding | `20px` | `28rpx` | px vs rpx |
| 输入框高度 | `48px` | `76rpx` | px vs rpx |
| 输入框 padding | `0 16px` | `0 24rpx` | px vs rpx |
| 输入框圆角 | `18px` | `20rpx` | px vs rpx |
| 底部操作栏 | `padding: 16rpx 32rpx calc(safe+16rpx)` | `padding: 32rpx`（无 safe-area） | 值和 safe-area 处理不同 |

#### ❌ download/index — px vs rpx

| 元素 | Taro | Native | 差异 |
|------|------|--------|------|
| 内容区 padding | `20px`（全方向） | `36rpx`（水平） | px vs rpx，375px 屏幕上 20px ≈ 40rpx > 36rpx |

#### ❌ cat-player/index — 底部区域 padding 不同

| 元素 | Taro | Native | 差异 |
|------|------|--------|------|
| 信息面板 padding | `48rpx 48rpx` | `40rpx 44rpx` | 水平 48rpx vs 44rpx |

#### ⚠️ switch-companion/index — 添加卡片布局差异

| 元素 | Taro | Native | 差异 |
|------|------|--------|------|
| 添加卡片 | `width: calc(50% - 16rpx)` 网格卡片 | `margin: 0 32rpx` 全宽水平条 | 完全不同的布局模型 |

#### ⚠️ generation-progress/index — 确认弹窗宽度

| 元素 | Taro | Native | 差异 |
|------|------|--------|------|
| 确认弹窗宽度 | `85%` | `calc(100% - 96rpx)` | 不同计算方式，375px 屏幕上约 85% ≈ calc(100% - 112rpx) |

### 8.2 对齐正确的页面 ✅

以下页面水平内边距完全一致：home, points, accompany-milestone, cat-history, create-companion, upload-material, feedback, privacy-policy, terms-of-service, notifications, notification-list

### 8.3 Profile 页面宽度对齐详细分析

| 区域 | Taro | Native | 是否一致 |
|------|------|--------|---------|
| 页面容器 padding-bottom | 无 | `calc(220rpx + env(safe-area-inset-bottom))` | ❌ Native 多了 safe-area 双重计算 |
| 页头 padding | `var(--nav-top) var(--nav-side) 18rpx var(--nav-side)` | `var(--nav-top) var(--nav-side) 18rpx` | ✅ 等效 |
| 内容包装器 | `.profile-content` padding `0 42rpx 220rpx` | 无包装器，各区段独立 `margin: X 42rpx` | ⚠️ 不同架构，等效结果 |
| 头像区域 padding | `32rpx 0`（继承父级 42rpx） | `32rpx 42rpx`（自含） | ✅ 等效 |
| 统计行 margin | `64rpx 0 32rpx`（继承父级 42rpx） | `64rpx 42rpx 32rpx` | ✅ 等效 |
| 猫咪入口 margin | `32rpx 0`（继承父级 42rpx） | `32rpx 42rpx` | ✅ 等效 |
| 菜单区 margin | `48rpx 0`（继承父级 42rpx） | `48rpx 42rpx` | ✅ 等效 |
| 菜单项元素 | `<View>` | `<button>` | ❌ 可能受微信默认按钮样式影响 |
| 退出登录 | 菜单项样式（卡片） | 独立 `.miao-button-secondary` 药丸按钮 | ❌ 完全不同的视觉样式 |
| 页脚约束 | 受 `.profile-content` 42rpx padding 限制 | 全宽（直接子元素） | ⚠️ 短文本无影响，长文本有差异 |
| 隐藏快捷网格 | 无 | 有（`display: none`） | 无视觉影响 |
| `--nav-side` | 动态计算（基于胶囊右侧位置） | 固定 `42rpx` | ⚠️ 非标准设备可能不同 |
| 底部 safe-area | 仅页脚 `env(safe-area-inset-bottom) + 80rpx` | 页面级 `220rpx + safe-area` + 页脚 `safe-area + 80rpx` | ❌ Native 可能双重计算 safe-area |

---

## 9. 日记页"我的记录"UI 详细对比

### 9.1 日记卡片/列表项布局

| 属性 | Taro（DiaryCard 组件） | Native（内联 .diary-item） |
|------|----------------------|--------------------------|
| 内边距 | `32rpx` | `28rpx` ❌ |
| 圆角 | `var(--radius-xl)` = 48rpx | `32rpx` ❌ |
| 背景 | `var(--surface)` | `#fff`（硬编码） |
| 阴影 | `var(--shadow-sm)` | `0 12rpx 34rpx rgba(99,62,29,0.08)`（硬编码） |
| 头像尺寸 | `72rpx` | `84rpx` ❌ |
| 头像圆角 | `36rpx`（圆形） | `28rpx`（圆角方形）❌ |
| 头像背景 | `var(--surface-container)` | `var(--color-warm-cream)` |
| 用户名字重 | `600` | `900` ❌ |
| 用户名颜色 | `var(--color-warm-brown)` | `var(--on-primary-container)` ❌ |
| 时间字号 | `22rpx` | `23rpx` ❌ |
| 内容字号 | `28rpx` | `29rpx` ❌ |
| 内容颜色 | `var(--color-warm-brown)` | `var(--on-primary-container)` ❌ |
| 媒体高度 | 自适应 | 固定 `360rpx` ❌ |
| 媒体圆角 | `var(--radius-lg)` = 32rpx | `24rpx` ❌ |

### 9.2 互动按钮 — 完全不同的设计

| 属性 | Taro | Native |
|------|------|--------|
| **布局** | 图标按钮行（heart/message/share/trash） | 全宽药丸文字按钮行 |
| **分隔线** | 有 `border-top: 1rpx solid var(--outline-variant)` | 无 |
| **间距** | `gap: 40rpx` | `gap: 14rpx` |
| **按钮样式** | 图标 24x24px + 文字 24rpx | 药丸 `flex:1; height:58rpx; border-radius:29rpx; background:var(--color-warm-cream)` |
| **点赞激活** | `color: var(--color-danger)` | `background: #fff0ec; color: #d64b4b` |
| **按钮字重** | 默认 | `900` |
| **按钮字号** | `24rpx` | `23rpx` |
| **删除按钮** | 图标按钮，`margin-left: auto; opacity: 0.6` | 独立 `.meta-row`，药丸按钮 `background:#fff1f1; color:#d64b4b` |

### 9.3 评论区域

| 属性 | Taro | Native |
|------|------|--------|
| 内边距 | `20rpx 24rpx` | `16rpx 18rpx` ❌ |
| 圆角 | `var(--radius-lg)` = 32rpx | `20rpx` ❌ |
| 评论项 | flex 布局，作者和内容分开 | flex 布局，作者和内容合并为单字符串 |
| 作者字号 | `24rpx; font-weight: 600` | `24rpx`（无加粗） |
| 删除操作 | 长按弹出浮动提示框（复制/删除） | 内联 "删除" 文字按钮 |

### 9.4 评论输入 — 架构完全不同

| 属性 | Taro | Native |
|------|------|--------|
| **形态** | 底部弹窗（slide-up sheet） | 浮动药丸面板 |
| **定位** | `position: relative; border-radius: 24px 24px 0 0` | `position: absolute; left:24rpx; right:24rpx; bottom:24rpx+safe-area; border-radius:30rpx` |
| **输入框** | `height: 40px; font-size: 14px; border-radius: 24px` | `height: 78rpx; font-size: 27rpx; border-radius: 39rpx` |
| **发送按钮** | 渐变图标按钮 `40x40px`（#ff9a5a→#ff6b3d） | 扁平文字按钮 `120rpx x 78rpx`（var(--primary)） |
| **发送按钮文字** | 无（箭头图标） | "发送" |
| **字数统计** | 有 `font-size: 11px; color: #bbb` | 无 |
| **z-index** | `1300` | `30` |

### 9.5 Tab 切换栏

| 属性 | Taro | Native | 一致 |
|------|------|--------|------|
| 背景色 | `var(--color-warm-cream)` | `var(--color-warm-cream)` | ✅ |
| 圆角 | `44rpx` | `44rpx` | ✅ |
| 内边距 | `12rpx` | `12rpx` | ✅ |
| Tab 文字字号 | **14px** | **28rpx** | ❌ 单位不同 |
| 激活态阴影 | `0 8rpx 20rpx rgba(232,159,113,0.18)` | 相同 | ✅ |
| 切换动画 | 方向性（slideInLeft/slideInRight + tabFadeIn） | 仅 tab-slide-right（且 `@keyframes` 缺失）| ❌ |

### 9.6 页头

| 属性 | Taro | Native |
|------|------|--------|
| `align-items` | `center` | `flex-end` ❌ |
| 副标题 `text-transform` | `uppercase` | 无 |
| 副标题 `letter-spacing` | `0.1em` | 无 |
| 标题 `letter-spacing` | `-0.025em` | 无 |

### 9.7 空状态

| 属性 | Taro | Native |
|------|------|--------|
| 内边距 | `60px 20px` | `120rpx 28rpx 0` |
| 文字字号 | `16px` | `32rpx` |
| 文字字重 | 默认 | `900` |
| 提示字号 | `14px` | `28rpx` |
| 提示行高 | 默认 | `1.6` |
| 淡入动画 | `tabFadeIn 0.25s ease-out` | 无 |

### 9.8 日记页独有功能差异

| 功能 | Taro | Native |
|------|------|--------|
| 同步状态 UI | 无 | 有（sync-badge "未同步" + sync-panel 重试/替换） |
| 单页模式横幅 | 有（场景 1154） | 无 |
| 好友日记轮询 | 60 秒间隔 | 仅 onShow 同步 |
| 下拉刷新 | 有（ScrollView refresherEnabled） | 无 |
| 键盘适配 | `Taro.onKeyboardHeightChange` 动态偏移 | 无 |
| 好友徽章 | `.friend-badge` 内联标签 | 无（改为 `.sync-badge`） |
| 媒体错误回退 | 无 | 有（`.media-fallback` + `.sync-panel`） |
| 媒体图标格式 | SVG（image-outlined.svg, video-outlined.svg） | PNG（image-gray.png, film-gray.png） |

---

## 10. Profile 页面宽度对齐详细对比

### 10.1 容器架构差异

| 属性 | Taro | Native |
|------|------|--------|
| 滚动方式 | `<ScrollView>` 包裹 | 原生页面滚动 |
| 内容包装器 | `.profile-content`（`padding: 0 42rpx 220rpx`） | 无包装器，各区段独立 `margin: X 42rpx` |
| 页面 `padding-bottom` | 无 | `calc(220rpx + env(safe-area-inset-bottom))` |
| `--nav-side` | 动态计算（基于胶囊位置） | 固定 `42rpx` |

### 10.2 菜单项结构差异

| 属性 | Taro | Native |
|------|------|--------|
| HTML 元素 | `<View>` | `<button>` |
| 布局 | 扁平：icon + label + arrow | 嵌套：`.menu-left`(icon+label) + arrow |
| 图标间距 | `margin-right: 32rpx` | `gap: 32rpx`（flex 容器） |
| 图标弹性 | 无 `flex-shrink: 0` | `flex: 0 0 80rpx` |
| 箭头 | 文字 `>` | 图片 `chevronright-gray.png` |
| 初始 padding | `32rpx` | `0 32rpx`（后被覆盖为 `32rpx`） |
| 初始 min-height | 无 | `112rpx`（后被覆盖为 `0`） |

### 10.3 退出登录样式差异

| 属性 | Taro | Native |
|------|------|--------|
| 形态 | `.menu-item` 卡片样式 | `.miao-button-secondary` 药丸按钮 |
| 圆角 | `32rpx` | `48rpx` |
| 背景 | `#fff` + 阴影 | `var(--surface-container)` 无阴影 |
| 内边距 | `32rpx` | `min-height: 96rpx` |
| 位置 | 在 `.menu-section` 内 | 独立，`margin: 48rpx 42rpx 0` |

### 10.4 底部 Safe Area 双重计算

Taro：
- `.profile-content` padding-bottom: `220rpx`（Tab Bar 避让）
- `.footer` padding-bottom: `calc(env(safe-area-inset-bottom) + 80rpx)`（安全区只算一次）

Native：
- `.profile-page` padding-bottom: `calc(220rpx + env(safe-area-inset-bottom))`
- `.footer` padding-bottom: `calc(env(safe-area-inset-bottom) + 80rpx)`（安全区算两次）

在有 Home Indicator 的设备上，Native 版本底部会多出约 34px 的空白。

---

*报告结束*