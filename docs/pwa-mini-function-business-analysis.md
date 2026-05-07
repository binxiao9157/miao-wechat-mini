# Miao PWA 与微信小程序功能及业务逻辑完整分析

更新时间：2026-05-07  
分析范围：

- PWA 仓库：`/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/Miao_remote`
- PWA 最新提交：`ab1fac6977e6d2cf3f78f3a04f4e636848505e76`，`2026-05-07T14:21:56+08:00`，`chore: add safer server deploy script`
- 微信小程序仓库：`/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/miao-wechat-mini`
- 小程序最新提交：`d31e2f63c2a03dfdd1de59d7adcb9cc4b923cda7`，`2026-05-07T13:15:51+08:00`，`Align admin presets with PWA`

## 1. 总体结论

Miao 当前已经形成了两套客户端实现：

- PWA：React + Vite + Express 一体化应用，前端、PWA 缓存、服务端 API、AI 代理、数据文件和上传资源都在 `Miao_remote` 仓库内。
- 微信小程序：Taro React 应用，主要负责微信端 UI、微信能力适配、文件系统适配和请求适配，后端复用 PWA 仓库中的 Express API 服务。

两端核心业务基本一致：

- 账号注册、登录、资料管理、注销、清缓存。
- 无猫状态引导创建第一只猫。
- 通过预设猫咪或本地上传图片创建 AI 猫咪。
- 使用阿里百炼或火山引擎完成图片生成与视频生成。
- 首页播放猫咪视频并支持互动。
- 积分中心提供每日登录、互动、在线时长奖励，并支持积分兑换新伙伴。
- 日记系统支持图文/视频记录、点赞、评论、分享、好友动态。
- 时光信件支持写信、定时解锁、未读通知、调试快进。
- 个人中心支持统计、好友扫码、切换猫咪、隐藏后台入口。
- 后台配置支持 AI Provider、模型参数、预设猫咪、积分作弊、时光快进。

当前主要差异集中在平台能力和技术实现上：

- PWA 更依赖浏览器能力：BrowserRouter、Service Worker、localStorage/IndexedDB、文件 input、Canvas 裁剪、Web Share/下载。
- 小程序更依赖微信能力：Taro 页面栈、自定义 TabBar、Taro Storage、用户文件系统、`chooseMedia`、`uploadFile`、扫码、微信分享、微信登录/手机号登录。
- PWA 的服务端 API 与 AI 代理更完整，微信小程序通过 `https://www.mmdd10.tech` 访问同一服务端。

## 2. 技术架构

### 2.1 PWA 架构

PWA 由 React 前端和 Express 服务端组成。

前端核心：

- 入口：`src/main.tsx`
- 路由：`src/App.tsx`
- 主布局：`src/components/layout/MainLayout.tsx`
- 状态：React state + `AuthContext`
- 本地存储：`src/services/storage.ts`
- 媒体存储：`src/services/mediaStorage.ts`
- AI 客户端：`src/services/ai/aiClient.ts`
- AI 配置：`src/services/ai/aiConfig.ts`
- 兼容导出：`src/services/volcanoService.ts`
- PWA 缓存：`public/service-worker.js`

服务端核心：

- 入口：`server.ts`
- 认证 API：`/api/v1/auth/*`
- 用户 API：`/api/v1/me`
- 猫咪、日记、信件、积分同步 API：`/api/v1/cats`、`/api/v1/diaries`、`/api/v1/letters`、`/api/v1/points`
- 好友与通知 API：`/api/v1/friend-invites`、`/api/v1/friends`、`/api/v1/notifications`
- AI API：`/api/ai/generate-image`、`/api/ai/generate-video`、`/api/v1/ai/tasks`、`/api/v1/ai/tasks-file`
- 资源持久化：`/api/persist-video`、`/api/v1/assets/persist-video`
- 上传资源：`/uploads`

PWA 数据分层：

- 用户级数据使用用户名隔离 key。
- 核心数据优先本地读写，再同步到服务端。
- 视频、图片等大资源通过 IndexedDB、服务端上传目录或远程 URL 管理。
- Service Worker 对静态 shell、外部媒体、API GET 做缓存策略。

### 2.2 微信小程序架构

小程序由 Taro React 实现。

核心文件：

- 页面配置：`src/app.config.ts`
- 应用入口：`src/app.tsx`
- 认证上下文：`src/context/AuthContext.tsx`
- 请求适配：`src/utils/httpAdapter.ts`
- 上传适配：`src/utils/uploadAdapter.ts`
- 存储适配：`src/utils/storageAdapter.ts`
- 导航适配：`src/utils/navigateAdapter.ts`
- 事件适配：`src/utils/eventAdapter.ts`
- 数据存储与同步：`src/services/storage.ts`
- 同步队列：`src/services/syncQueue.ts`
- 同步管理：`src/services/syncManager.ts`
- 认证服务：`src/services/authService.ts`
- AI 配置：`src/services/aiConfig.ts`
- AI 任务服务：`src/services/volcanoService.ts`
- 自定义 TabBar：`src/custom-tab-bar/index.tsx`

小程序页面：

- 登录注册：`login`、`register`、`reset-password`
- 主 Tab：`home`、`diary`、`time-letters`、`points`、`profile`
- 创建链路：`empty-cat`、`welcome`、`create-companion`、`upload-material`、`generation-progress`
- 猫咪管理：`switch-companion`、`cat-player`、`cat-history`
- 社交好友：`scan-friend`、`add-friend-qr`、`join-friend`
- 设置：`edit-profile`、`change-password`、`notifications`、`privacy-settings`、`set-nickname`
- 内容与反馈：`notification-list`、`privacy-policy`、`terms-of-service`、`feedback`
- 隐藏后台：`admin-settings`

小程序数据分层：

- 业务数据使用 Taro Storage。
- 大媒体文件写入微信用户文件系统 `Taro.env.USER_DATA_PATH`。
- 本地写操作进入 `syncQueue`，后台同步至服务端。
- 请求统一携带 `Authorization: Bearer <token>`、`X-Client-Type: wechat-miniprogram`。
- 默认接口域名来自 `TARO_APP_API_BASE_URL`，未配置时使用 `https://www.mmdd10.tech`。

## 3. 账号与认证逻辑

### 3.1 PWA

PWA 的认证逻辑在 `src/context/AuthContext.tsx` 和 `server.ts`。

主要能力：

- 用户名密码注册：`POST /api/v1/auth/register`
- 用户名密码登录：`POST /api/v1/auth/password-login`
- 设置/修改密码：`POST /api/v1/auth/set-password`
- 重置密码：`/api/v1/auth/send-reset-code`、`/api/v1/auth/reset-password`
- 获取当前用户：`GET /api/v1/me`
- 删除账号：`DELETE /api/v1/me`

业务逻辑：

- 注册成功后保存用户信息、token、登录时间、活跃时间。
- 登录成功后保存用户信息、token，并触发 `storage.syncFromServer()` 拉取服务端数据。
- 对历史本地账号有兼容迁移逻辑：如果服务端 401 且本地存在同名密码用户，会尝试注册到服务端。
- 登出会同步最后一只猫到全局登录页背景，再清除当前用户与 token。
- 删除账号优先调用服务端删除，失败也会继续清理本地，保证用户侧退出当前账户。

### 3.2 微信小程序

小程序认证逻辑在 `src/context/AuthContext.tsx` 和 `src/services/authService.ts`。

主要能力：

- 用户名密码登录。
- 用户名密码注册。
- 微信登录：`Taro.login()` -> `/api/v1/auth/wechat-login`
- 手机号登录：微信手机号 code + login code -> `/api/v1/auth/phone-login`
- 设置/修改密码。
- token 校验和 401 自动登出。

业务逻辑：

- 初始化时读取 token 与缓存用户。
- 如果 token 有效，会调用 `/api/v1/me` 校验用户，并执行 `syncManager.syncAll()`。
- 如果服务端返回 401，会清除 token、本地当前用户，并 `reLaunch` 到登录页。
- 注册前会校验用户名格式和密码长度，避免 400 请求。
- 登录、注册、微信登录、手机号登录成功后均写入 token、用户信息、登录时间、活跃时间，并同步业务数据。

### 3.3 差异

- PWA 主要面向 Web 用户名密码体系，小程序额外支持微信登录和手机号登录。
- PWA 认证失败时有历史本地账号迁移逻辑，小程序更偏服务端 token 驱动。
- 小程序对 401 有统一事件处理，会自动返回登录页；PWA 目前主要通过页面和请求逻辑分散处理。

## 4. 猫咪创建与 AI 生成

### 4.1 创建入口

两端都支持两条创建路径：

- 预设猫咪：选择后台配置的预设品种图，进入生成流程。
- 本地上传：用户上传猫咪照片，先生成标准首帧形象，再进入视频生成流程。

PWA 路由链路：

- `/empty-cat`
- `/welcome`
- `/create-companion`
- `/upload-material`
- `/generation-progress`

小程序页面链路：

- `/pages/empty-cat/index`
- `/pages/welcome/index`
- `/pages/create-companion/index`
- `/pages/upload-material/index`
- `/pages/generation-progress/index`

### 4.2 PWA 上传创建逻辑

PWA 的 `UploadMaterial` 页面支持：

- 文件 input 选择图片。
- 使用 `react-easy-crop` 裁剪。
- Canvas 压缩到适合 AI 输入的尺寸。
- 调用 `VolcanoService.submitImageTask()` 生成首帧图。
- 用户确认首帧后保存 `GenerationDraft`，跳转 `/generation-progress`。

PWA 的 `GenerationProgress` 逻辑：

- 从路由 state 或 `storage.getGenerationDraft()` 读取草稿，避免刷新导致上下文丢失。
- 进入 I2V 阶段前处理积分扣除，失败时退还。
- 使用确认首帧调用视频生成接口。
- 生成第一段 `idle` 视频后通过 `FileManager.downloadVideos()` 入库。
- 设置活跃猫咪，清理草稿。
- 用户可选择仅使用基础待机动作，或后台继续解锁 `tail`、`rubbing`、`blink`。
- 后续动作串行提交，避免 API 限流。

### 4.3 小程序上传创建逻辑

小程序的 `upload-material` 页面支持：

- `Taro.chooseMedia` 选择相册或拍照，失败时回退 `Taro.chooseImage`。
- 不走浏览器裁剪，直接把本地文件路径交给 `VolcanoService`。
- `VolcanoService` 内部判断本地路径或 base64，优先通过 `Taro.uploadFile` 调 `/api/v1/ai/tasks-file`，避免微信 JSON 请求体过大。
- 首帧生成成功后，先在本地保存一只 `generationStatus: pending` 的猫，再进入 `generation-progress`。

小程序的 `generation-progress` 逻辑：

- 从当前活跃猫咪读取待生成对象。
- 如果猫咪已经 ready，直接回首页。
- 先扣除兑换积分，失败则进入错误状态。
- 调用视频生成，生成 `idle` 后入库。
- 生成失败会标记 `generationStatus: failed`，记录 `generationError`，并退还已扣积分。
- 成功后显示确认弹窗，可选择继续生成后续动作或先进入首页。

### 4.4 AI Provider 与模型

两端后台均支持：

- Provider：`阿里百炼`、`火山引擎`
- 图片模型：
  - 阿里百炼默认：`qwen-image-2.0`
  - 火山引擎默认：`doubao-seedream-4-5-251128`
- 视频模型：
  - 阿里百炼默认：`wan2.2-kf2v-flash`
  - 火山引擎默认：`doubao-seedance-1-5-pro-251215`
- 分辨率：默认 `480P`
- 时长：默认 `5`
- Seed：默认 `12345`
- Prompt 扩展开关
- Mock 模式

后端环境变量仍只保存在服务端，不在客户端保存密钥。

### 4.5 差异与风险

- PWA 有更完整的裁剪与首帧草稿恢复；小程序更适合微信文件路径上传。
- 小程序有 `generationStatus` 字段，可在猫咪层面表达 pending、failed、ready；PWA 主要依赖草稿与最终入库状态。
- PWA 使用 `/api/ai/*` 兼容接口，小程序主要使用 `/api/v1/ai/*` 认证接口。
- 两端都依赖服务端 AI 代理，真正鉴权失败通常来自服务端环境变量、Provider 配置或模型/API Key 不匹配。

## 5. 首页互动与积分

### 5.1 首页能力

两端首页都围绕活跃猫咪展开：

- 播放待机视频 `idle`。
- 支持互动动作：
  - `tail`
  - `rubbing`
  - `blink`
- 如果动作视频未生成，则不触发或显示基础状态。
- 显示早晚问候。
- 支持积分 toast。
- 切换页面回来会刷新活跃猫咪数据。

PWA 实现特点：

- 使用原生 `<video>`。
- 手势由浏览器触摸事件实现。
- 延迟加载互动视频，减少首屏卡顿。
- 对视频加载失败有头像兜底。

小程序实现特点：

- 使用 Taro `Video` 组件。
- 页面 `useDidShow` 时重置视频上下文并尝试播放。
- 通过 `Taro.createVideoContext` 控制播放。
- 使用 `eventAdapter` 监听猫咪更新、TabBar 状态和互动提示。

### 5.2 积分规则

两端积分规则一致：

- 每日首次登录：`+10`
- 每日互动奖励：每次 `+5`，每日上限 `20`
- 在线时长奖励：单日在线达到 10 分钟 `+10`
- 积分历史最多保留 50 条
- 解锁新伙伴阈值：通过 `storage.getUnlockThreshold()`，当前业务表现为 `200`
- 兑换新猫时扣除积分，生成失败退还
- 后台 `积分作弊` 开启后，积分中心会把有效积分视为至少满足兑换阈值

## 6. 日记、分享与好友

### 6.1 日记能力

两端都支持：

- 按当前活跃猫咪展示日记。
- 发布文字、图片、视频日记。
- 点赞。
- 评论。
- 删除日记。
- 我的日记与好友动态切换。
- 分享日记。

PWA 实现特点：

- 媒体文件通过 IndexedDB 或 base64 降级保存。
- Web 分享能力由 `ShareSheet`、`PosterTemplate`、`html2canvas`、`shareService` 等实现。
- 好友私信分享使用 `PrivateMessageShare`。

小程序实现特点：

- 媒体文件写入微信用户文件系统，日记中保存 `miao_media:<id>` 引用。
- 通过 Canvas 生成分享卡片。
- 使用微信 `useShareAppMessage`、`useShareTimeline` 分享。
- 支持朋友圈单页模式识别。

### 6.2 好友能力

两端都支持：

- 创建好友邀请码。
- 生成二维码。
- 扫码识别邀请码。
- 接受邀请成为好友。
- 同步好友列表。
- 同步好友动态。
- 好友动态点赞和评论。

小程序利用微信扫码能力更自然；PWA 通过网页扫码页和二维码逻辑实现。

## 7. 时光信件与通知

### 7.1 时光信件

两端都支持：

- 给指定猫咪写信。
- 设置解锁天数。
- 未解锁前展示倒计时与模糊/锁定状态。
- 解锁后展示正文。
- 按猫咪筛选。
- 删除信件。
- 已读状态记录。

调试逻辑：

- `storage.getIsFastForward()` 为 true 时，倒计时按 `FAST_FORWARD_RATIO = 60` 加速。
- `src/utils/timeLetterUnlock.ts` 在两端都统一了实际解锁时间计算。

### 7.2 通知

两端通知来源包括：

- 时光信件解锁通知。
- 积分变化通知。
- 每日问候/系统通知。
- 好友分享/服务端通知。

PWA：

- `NotificationList.tsx` 计算本地通知。
- `Profile.tsx` 复用通知计算显示红点。

小程序：

- `notification-list` 计算本地通知并拉取 `/api/v1/notifications`。
- `profile` 会同步服务端通知到本地自定义通知，再刷新红点。
- 标记已读会调用本地 storage 和服务端 read API。

## 8. 个人中心与设置

### 8.1 个人中心

两端个人中心都包含：

- 用户头像、昵称、ID。
- 当前猫咪信息。
- 陪伴天数。
- 记录瞬间数。
- 通知入口与未读红点。
- 扫码/好友入口。
- 我的伙伴/切换猫咪。
- 资料设置、通知设置、意见反馈。
- 清除缓存。
- 退出登录。
- 删除账号。
- 隐藏后台入口。

PWA 额外显示：

- PWA 安装提示 `InstallPromptBanner`。
- 隐私设置入口。

小程序额外表现：

- 使用微信原生扫码。
- 清理微信用户文件系统下未引用的临时文件。
- 自定义导航栏与自定义 TabBar 状态管理。

### 8.2 隐藏后台入口

当前两端都保留“点击个人中心底部隐藏区域 5 次进入后台”的逻辑。

- PWA：`Profile.tsx` 内部 `handleAdminTap()`。
- 小程序：`profile/index.tsx` 内部 `handleAdminTap()`。
- 计数窗口：`3000ms`。

## 9. 后台管理

两端后台都包含四类配置：

### 9.1 AI 模型配置

- Provider 切换：`阿里百炼` / `火山引擎`
- 图片模型
- 视频模型
- 清晰度
- 时长
- Seed
- Prompt 扩展
- Mock 模式
- 恢复默认
- 保存配置

### 9.2 预设猫咪管理

- 展示当前预设猫咪列表。
- 删除预设。
- 新增预设：
  - 输入品种名称。
  - 本地选择/上传图片。
  - 保存到 `app_preset_cats`。

PWA 使用文件 input + Canvas 压缩为 base64。  
小程序使用 `chooseMedia`/`chooseImage` + `Taro.saveFile` 保存本地文件路径。

### 9.3 调试工具

两端当前均已支持：

- `积分作弊`
- `时光快进`

业务影响：

- 积分作弊：只影响兑换判断和积分中心展示的有效积分，不直接给真实积分加账。
- 时光快进：影响时光信件解锁判断和通知未读计算。

### 9.4 配置存储

AI 配置存储 key 在两端保持同名：

- `MIAO_AI_PROVIDER`
- `DASHSCOPE_IMAGE_MODEL`
- `DASHSCOPE_VIDEO_MODEL`
- `VOLC_IMAGE_MODEL`
- `VOLC_VIDEO_MODEL`
- `MIAO_AI_RESOLUTION`
- `MIAO_AI_DURATION`
- `MIAO_AI_SEED`
- `MIAO_AI_PROMPT_EXTEND`
- `MIAO_AI_MOCK_MODE`

## 10. 数据模型与同步

### 10.1 核心数据模型

两端核心模型基本一致：

- `UserInfo`
- `CatInfo`
- `DiaryEntry`
- `FriendDiaryEntry`
- `TimeLetter`
- `PointsInfo`
- `PointTransaction`
- `FriendInfo`
- `PresetCat`

小程序 `CatInfo` 额外强调：

- `generationStatus`
- `generationError`
- `generationUpdatedAt`

小程序 `UserInfo` 额外包含：

- `passwordSet`
- `openidBound`
- `phone`
- `isNewUser`

### 10.2 PWA 同步

PWA 的 `storage.ts` 会把猫咪、日记、信件、积分写入本地，并尝试双写到服务端。

同步特点：

- 登录后调用 `syncFromServer(username)`。
- 猫咪合并会比较 `updatedAt` / `createdAt`。
- 日记、信件、积分会进行本地与远端合并。
- 删除操作会调用对应服务端 delete API。
- 媒体大文件尽量走 IndexedDB、上传目录或 URL。

### 10.3 小程序同步

小程序同步更系统化：

- `syncManager.syncAll()` 统一触发全量同步。
- `syncQueue` 对本地写操作进行延迟队列同步。
- 队列任务包括 `diary`、`letter`、`points`、`cat`。
- 队列持久化在 `miao_pending_sync_tasks`。
- 最大重试次数为 3。
- 离线或未登录时保留任务，后续再 flush。
- 删除操作通过 tombstone 防止远端旧数据回流。

## 11. 页面与跳转逻辑对比

### 11.1 主导航

PWA：

- 使用 React Router。
- 主 Tab 在 `MainLayout` 内。
- 路由包括 `/`、`/diary`、`/time-letters`、`/points`、`/profile`。

小程序：

- 使用 Taro 页面栈。
- 自定义 TabBar。
- 主 Tab 包括 `diary`、`time-letters`、`home`、`points`、`profile`。

### 11.2 无猫用户

共同逻辑：

- 登录后如果没有猫，进入空猫页面。
- 空猫页面引导到创建流程。
- 创建完成后进入首页。

差异：

- PWA 通过 `ProtectedRoute` 和 `hasCat` 在路由层跳转。
- 小程序通过页面生命周期、`catLifecycle` 和 `reLaunch` 控制。

### 11.3 兑换新猫

共同逻辑：

- 积分中心判断是否满足阈值。
- 满足后进入空猫/创建流程，并携带 `isRedemption` 和 `redemptionAmount`。
- 生成阶段扣分，失败退还。

差异：

- PWA 使用 query + route state + `GenerationDraft`。
- 小程序使用页面 query 参数和当前活跃 pending 猫对象。

## 12. UI 设计与交互风格

### 12.1 共性

两端整体视觉已经对齐到：

- 温暖奶油背景。
- 橙色主色。
- 圆角卡片。
- 大标题 + 英文副标题。
- 轻拟物阴影。
- 猫咪头像与视频作为核心视觉。
- 后台配置、积分、预设猫咪页面逐步对齐。

### 12.2 PWA 特点

- 更强的网页动效，使用 `motion/react`。
- 使用 lucide-react 图标。
- 页面可通过浏览器滚动与 hover 获得增强体验。
- 支持 PWA 安装提示和 Service Worker 离线/缓存。
- Web 图片裁剪体验更完整。

### 12.3 小程序特点

- 使用 PNG/SVG 图标资产模拟 lucide 风格。
- 使用 rpx 和自定义导航栏适配微信胶囊区。
- 使用自定义 TabBar，并根据弹窗/二级状态隐藏或恢复。
- 分享、扫码、相册、拍照、保存图片等能力更贴近微信生态。

## 13. 当前差异清单

| 模块 | PWA | 微信小程序 |
| --- | --- | --- |
| 认证方式 | 用户名密码为主，兼容历史本地账号迁移 | 用户名密码、微信登录、手机号登录 |
| API 调用 | 同源 `/api` | 默认 `https://www.mmdd10.tech/api` |
| 媒体存储 | localStorage + IndexedDB + 服务端资源 | Taro Storage + 用户文件系统 |
| 上传图片 | input + FileReader + Canvas + 裁剪 | `chooseMedia` / `chooseImage` + `uploadFile` |
| AI 图片接口 | `/api/ai/generate-image` | `/api/v1/ai/tasks` 或 `/api/v1/ai/tasks-file` |
| AI 视频接口 | `/api/ai/generate-video` | `/api/v1/ai/tasks` 或 `/api/v1/ai/tasks-file` |
| 生成草稿 | `GenerationDraft` 持久化 | pending 猫咪状态持久化 |
| 微信能力 | 无原生微信能力，使用 Web 替代 | 扫码、分享、相册、拍照、手机号登录 |
| PWA 能力 | Service Worker、安装提示 | 无 |
| 后台调试工具 | 已对齐，含积分作弊/时光快进 | 已对齐，含积分作弊/时光快进 |
| 预设猫咪新增 | 本地图片转 base64 压缩 | 本地图片保存为微信文件路径 |
| 清缓存 | 清 localStorage 非核心 key | 清 Taro Storage 非核心 key + 用户文件系统临时文件 |
| 通知 | 本地通知为主 | 本地通知 + 服务端通知同步更强 |

## 14. 需要关注的业务风险与优化点

### 14.1 PWA 风险

- Service Worker 如果未正确更新，会导致用户继续看到旧后台或旧页面。当前部署脚本已新增 `docs/deploy.sh`，应确保服务器根目录脚本不再恢复整个 `public/`。
- PWA `public` 下的 `service-worker.js` 和 `manifest.json` 必须随代码发布，不能被服务器本地备份覆盖。
- 上传素材使用 base64 与 IndexedDB，浏览器隐私模式或存储空间不足时仍可能失败，需要保持降级提示。
- PWA 认证与业务同步仍有一部分旧 `/api/*` 兼容接口，长期可考虑统一到 `/api/v1/*`。

### 14.2 小程序风险

- 微信小程序必须配置合法 request/uploadFile/downloadFile 域名，否则真机请求会失败。
- `TARO_APP_API_BASE_URL` 未配置时默认使用生产域名 `https://www.mmdd10.tech`，本地调试要注意开发者工具“是否校验合法域名”。
- AI 上传依赖 `uploadFile`，服务端 `/api/v1/ai/tasks-file` 和上传域名白名单必须正常。
- 用户文件系统中的本地图片路径如果被微信清理，预设猫咪图片或日记媒体可能失效，需要保留降级 UI。
- 小程序注册严格校验用户名与密码，后端 400 通常来自参数格式或密码缺失。

### 14.3 两端共同风险

- AI Provider 配置保存在客户端，但 API Key 保存在服务端；如果服务端环境变量与客户端选择的 Provider 不匹配，会出现鉴权失败。
- 火山引擎和阿里百炼模型名变化较快，后台允许改模型名，但也增加了配置误填风险。
- 积分作弊仅为调试工具，应保证隐藏后台入口不被普通用户误触。
- 生成失败后的积分退还逻辑很关键，需要持续避免重复扣分或刷新后丢失扣分状态。
- 猫咪删除、账号删除、服务端同步之间要继续关注“本地已删但远端回流”的情况。

## 15. 建议后续对齐顺序

1. 保持两端后台配置 UI 和字段完全同步，包括 Provider、模型、Mock、调试工具、预设猫咪。
2. 统一 AI 任务接口描述，尽量让 PWA 也逐步使用 `/api/v1/ai/*` 认证接口，减少双接口维护成本。
3. 继续加强生成流程状态机，两端都明确 `pending`、`failed`、`ready`、`unlocking`。
4. 把积分扣除、失败退还、草稿恢复的规则抽成跨端一致文档或测试用例。
5. 小程序继续补齐 PWA 的裁剪体验，或在服务端统一做图片规范化处理。
6. PWA 继续补齐小程序的通知同步能力，统一好友动态通知和已读逻辑。
7. 定期检查部署脚本，确保 `service-worker.js`、`manifest.json`、前端构建产物不会被服务器旧资源覆盖。

## 16. 一句话总结

当前 Miao 的 PWA 和微信小程序已经在核心产品能力上基本对齐：两端都围绕“创建 AI 猫咪、互动陪伴、日记记录、积分成长、时光信件、好友分享、隐藏后台调试”形成完整闭环。PWA 更完整地承担服务端和 Web/PWA 体验，小程序更完整地接入微信生态能力。后续重点不是大功能补缺，而是继续统一 AI 接口、生成状态机、部署缓存策略和跨端同步一致性。
