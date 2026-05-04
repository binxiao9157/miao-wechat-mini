# Miao 微信小程序全方位分析报告

> 生成日期：2026-05-04
> 仓库：miao-wechat-mini
> 分支：master

---

## 一、项目概览

### 1.1 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Taro v3.6.40 (React) |
| 语言 | TypeScript |
| 样式 | Less |
| 构建 | Webpack 4 |
| AI 服务 | 火山引擎 / DashScope |
| 状态管理 | React Context + useState |
| 数据持久化 | Taro.getStorageSync + FileSystemManager + IndexedDB |

### 1.2 页面清单（32 页）

| # | 页面 | 路由 | 类型 | 功能概述 |
|---|------|------|------|----------|
| 1 | Welcome | `/pages/welcome/index` | 启动页 | 闪屏，检查登录态，路由分发 |
| 2 | Login | `/pages/login/index` | 登录 | 账号密码/微信/手机号登录 |
| 3 | Register | `/pages/register/index` | 登录 | 注册新账号 |
| 4 | Home | `/pages/home/index` | Tab-首页 | 猫咪互动主界面，视频播放+手势交互 |
| 5 | Diary | `/pages/diary/index` | Tab-日志 | 日记 Feed，发布/点赞/评论/分享 |
| 6 | Time Letters | `/pages/time-letters/index` | Tab-时光 | 时光信件，写给未来的信+倒计时解锁 |
| 7 | Points | `/pages/points/index` | Tab-积分 | 积分中心，签到/互动/兑换 |
| 8 | Profile | `/pages/profile/index` | Tab-我的 | 个人中心，设置入口 |
| 9 | Notifications | `/pages/notifications/index` | 设置 | 通知开关设置 |
| 10 | Notification List | `/pages/notification-list/index` | 列表 | 通知消息列表 |
| 11 | Admin Settings | `/pages/admin-settings/index` | 管理 | AI 模型配置，预设猫管理（隐藏入口） |
| 12 | Create Companion | `/pages/create-companion/index` | 创建 | 选择品种+命名，创建 AI 猫咪 |
| 13 | Generation Progress | `/pages/generation-progress/index` | 生成 | AI 视频生成进度，解锁动作 |
| 14 | Upload Material | `/pages/upload-material/index` | 上传 | 上传猫咪照片，AI 生成锚点图 |
| 15 | Cat Player | `/pages/cat-player/index` | 播放 | 全屏视频播放器 |
| 16 | Cat History | `/pages/cat-history/index` | 历史 | 猫咪历史记录网格 |
| 17 | Switch Companion | `/pages/switch-companion/index` | 切换 | 切换/删除当前猫咪 |
| 18 | Accompany Milestone | `/pages/accompany-milestone/index` | 里程碑 | 陪伴天数日历 |
| 19 | Empty Cat | `/pages/empty-cat/index` | 引导 | 无猫时的引导页 |
| 20 | Cat Start | `/pages/cat-start/index` | 引导 | 猫咪开始页 |
| 21 | Edit Profile | `/pages/edit-profile/index` | 编辑 | 修改昵称/头像 |
| 22 | Set Nickname | `/pages/set-nickname/index` | 设置 | 首次登录设置昵称 |
| 23 | Change Password | `/pages/change-password/index` | 安全 | 修改/设置密码 |
| 24 | Reset Password | `/pages/reset-password/index` | 安全 | 手机验证码重置密码 |
| 25 | Scan Friend | `/pages/scan-friend/index` | 好友 | 扫码添加好友 |
| 26 | Add Friend QR | `/pages/add-friend-qr/index` | 好友 | 生成好友邀请二维码 |
| 27 | Join Friend | `/pages/join-friend/index` | 好友 | 接受好友邀请（深度链接） |
| 28 | Feedback | `/pages/feedback/index` | 反馈 | 问卷调查+反馈 |
| 29 | Download | `/pages/download/index` | 推广 | App 下载引导页 |
| 30 | Privacy Policy | `/pages/privacy-policy/index` | 法律 | 隐私政策 |
| 31 | Terms of Service | `/pages/terms-of-service/index` | 法律 | 服务条款 |
| 32 | Privacy Settings | `/pages/privacy-settings/index` | 设置 | 缓存清理+隐私入口 |

### 1.3 组件清单（10 公共 + 1 布局）

| 组件 | 路径 | 功能 |
|------|------|------|
| CatAvatar | `common/CatAvatar` | 猫咪头像（图片/首字母降级） |
| CommentInput | `common/CommentInput` | 评论输入栏（500字限制） |
| CommentItem | `common/CommentItem` | 评论项（长按删除） |
| DiaryCard | `common/DiaryCard` | 日记卡片 |
| ErrorBoundary | `common/ErrorBoundary` | 错误边界 |
| FrostedGlassBubble | `common/FrostedGlassBubble` | 毛玻璃气泡（猫咪互动文字） |
| Icons | `common/Icons` | Emoji/Unicode 图标集（46 个） |
| PawLogo | `common/PawLogo` | Miao 爪印 Logo |
| ShareSheet | `common/ShareSheet` | 分享面板（微信好友/朋友圈） |
| SplashScreen | `common/SplashScreen` | 启动闪屏 |
| PageHeader | `layout/PageHeader` | 通用页面头部 |

### 1.4 服务层清单

| 服务 | 功能 |
|------|------|
| storage.ts | 核心数据存储，CRUD + 服务端同步 |
| authService.ts | 认证（密码/微信/手机登录） |
| friendService.ts | 好友系统（邀请/接受/同步） |
| mediaStorage.ts | 媒体文件存储（IndexedDB/FileSystem） |
| volcanoService.ts | AI 图像/视频生成 |
| catService.ts | 猫咪品种目录+提示词构建 |
| catLifecycle.ts | 猫咪生命周期+路由 |
| fileManager.ts | 视频下载/压缩/管理 |
| aiConfig.ts | AI 模型配置管理 |
| syncQueue.ts | 增量同步队列（5s 防抖） |
| syncManager.ts | 全量同步协调器（30s 冷却） |
| shareService.ts | 跨平台分享 |
| mockFriendService.ts | 开发用 Mock 好友数据 |

### 1.5 工具层清单

| 工具 | 功能 |
|------|------|
| httpAdapter.ts | 统一 HTTP 客户端 |
| storageAdapter.ts | 统一 KV 存储 |
| eventAdapter.ts | 统一事件系统 |
| navigateAdapter.ts | 统一导航 |
| platformAdapter.ts | 平台检测+系统能力 |
| uploadAdapter.ts | 文件上传 |
| qrCanvas.ts | QR 码 Canvas 渲染 |
| shareCard.ts | 9:16 分享卡片生成 |

---

## 二、数据模型

### 2.1 核心模型

| 模型 | 关键字段 | 存储键 |
|------|---------|--------|
| UserInfo | username, nickname, avatar, password, phone | `miao_current_user` |
| CatInfo | id, name, breed, avatar, videoPaths, source | `u_{user}_miao_cat_list` |
| DiaryEntry | id, catId, content, media, likes, isLiked, comments | `u_{user}_miao_diaries` |
| FriendDiaryEntry | extends DiaryEntry + authorId/Nickname/Avatar, catName | `u_{user}_miao_friend_diaries` |
| Comment | id, content, authorId, authorNickname | 嵌入 DiaryEntry |
| TimeLetter | id, catId, content, unlockAt, createdAt | `u_{user}_miao_time_letters` |
| PointsInfo | total, lastLoginDate, dailyInteractionPoints, history | `u_{user}_miao_points` |
| FriendInfo | id, nickname, avatar, catName, addedAt | `u_{user}_miao_friends` |
| FriendInvite | code, ownerId, catId, catName, expiresAt | 服务端 |
| AppSettings | pushNotifications, greetingsEnabled, timeLetterReminder | `u_{user}_miao_settings` |

### 2.2 媒体存储策略

| 格式前缀 | 含义 | 存储位置 |
|---------|------|---------|
| `miao_media:{id}` | 小程序本地媒体引用 | FileSystem / IndexedDB |
| `indexeddb:{id}` | PWA IndexedDB 引用 | IndexedDB |
| `image/...` | 内联 base64 | localStorage（降级） |
| `https://...` | 服务端 URL | 远程 |

### 2.3 API 端点

| 模块 | 方法 | 端点 |
|------|------|------|
| 认证 | POST | `/api/v1/auth/register` |
| 认证 | POST | `/api/v1/auth/password-login` |
| 认证 | POST | `/api/v1/auth/wechat-login` |
| 认证 | POST | `/api/v1/auth/phone-login` |
| 认证 | POST | `/api/v1/auth/set-password` |
| 用户 | GET/PATCH | `/api/v1/me` |
| 猫咪 | POST/GET/DELETE | `/api/v1/cats` |
| 日记 | POST/GET/DELETE | `/api/v1/diaries` |
| 日记 | POST | `/api/v1/diaries/{id}/like` |
| 日记 | POST | `/api/v1/diaries/{id}/comments` |
| 信件 | POST/GET/DELETE | `/api/v1/letters` |
| 积分 | POST/GET | `/api/v1/points` |
| 好友 | POST | `/api/v1/friend-invites` |
| 好友 | GET | `/api/v1/friend-invites/{code}` |
| 好友 | POST | `/api/v1/friends/accept` |
| 好友 | GET | `/api/v1/friends` |
| 好友 | GET | `/api/v1/friends/diaries` |
| 通知 | GET/PUT | `/api/v1/notifications` |

### 2.4 同步架构

```
用户操作 → storage.saveXxx() → syncQueue.enqueue() → 5s 防抖 → 服务端 POST
                                                           ↓ 失败 → 重试(最多3次)

App 启动/切前台 → syncManager.syncAll() → 30s 冷却 → 并行拉取 cats/diaries/letters/points/friends
                                                          ↓
                                                    本地-服务端合并（ID 匹配，时间戳决胜）
```

---

## 三、功能维度分析

### 3.1 认证体系

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 账号密码登录 | ✅ | 支持 |
| 微信一键登录 | ✅ | open-type getUserInfo + 服务端 code2session |
| 手机号快捷登录 | ✅ | getPhoneNumber + 服务端验证 |
| 注册 | ✅ | 用户名+密码 |
| 修改密码 | ✅ | 需验证旧密码 |
| 重置密码 | ⚠️ | 客户端 Mock，无真实短信 |
| 登出 | ✅ | 清除本地 token |
| 注销账户 | ⚠️ | 仅清本地数据，服务端数据未删除 |

### 3.2 猫咪系统

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| AI 创建猫咪 | ✅ | 选品种→命名→生成视频 |
| 上传照片创建 | ✅ | 拍照/相册→AI 生成锚点图→视频 |
| 猫咪互动 | ✅ | 点击/双击/滑动/长按触发动作 |
| 切换猫咪 | ✅ | 多猫切换 |
| 删除猫咪 | ✅ | 确认后删除 |
| 猫咪历史 | ✅ | 网格展示 |
| 视频播放 | ✅ | 全屏播放器 |
| 生成进度 | ✅ | 分阶段进度展示 |
| 解锁动作 | ✅ | idle→tail/rubbing/blink |
| 积分兑换 | ✅ | 积分兑换新猫位 |

### 3.3 日记系统

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 发布日记 | ✅ | 文字+图片/视频 |
| 我的日记列表 | ✅ | 按猫咪过滤 |
| 好友动态 | ✅ | 双 Tab 切换 |
| 点赞 | ✅ | 乐观更新+服务端确认+回滚 |
| 评论 | ✅ | 行内发送+键盘 confirmType |
| 删除日记 | ✅ | 二次确认+服务端同步 |
| 删除评论 | ✅ | 长按气泡菜单+服务端同步 |
| 复制评论 | ✅ | 长按气泡菜单 |
| 分享微信好友 | ✅ | useShareAppMessage |
| 分享朋友圈 | ✅ | Canvas 生成 9:16 分享卡 |
| 下拉刷新 | ✅ | ScrollView refresherEnabled |
| 媒体存储 | ✅ | IndexedDB + 降级 base64 |

### 3.4 时光信件

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 写信 | ✅ | 标题+内容+封存天数 |
| 封存天数选择 | ✅ | 1/3/7/30/100 天 |
| 倒计时展示 | ✅ | 未解锁信件显示倒计时 |
| 解锁阅读 | ✅ | 到期后可查看 |
| 强制解锁 | ⚠️ | 长按可强制解锁（不可逆） |
| 删除信件 | ✅ | 确认后删除 |
| 猫咪过滤 | ✅ | 横向滑动选择 |
| 调试快进 | ⚠️ | 5 点击标题开启，60x 时间加速 |

### 3.5 积分系统

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 每日签到 | ✅ | 自动检测日期+奖励 |
| 互动奖励 | ✅ | 猫咪互动获得积分 |
| 在线时长 | ✅ | 60s 间隔累计 |
| 兑换猫咪 | ✅ | 达到阈值可兑换 |
| 历史记录 | ✅ | 最多 50 条 |
| 调试模式 | ⚠️ | 5 点击标题，积分充至阈值 |

### 3.6 好友系统

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 扫码添加 | ✅ | 扫描二维码 |
| 生成邀请码 | ✅ | 服务端创建 invite |
| 二维码名片 | ✅ | Canvas 渲染 QR |
| 保存二维码 | ✅ | 保存到相册 |
| 分享微信好友 | ✅ | open-type="share" |
| 接受邀请 | ✅ | 深度链接进入 join-friend |
| 好友列表 | ✅ | 服务端同步 |
| 好友动态 | ✅ | 1 分钟轮询同步 |
| 好友日记互动 | ✅ | 点赞/评论 |

### 3.7 通知系统

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 通知列表 | ✅ | 本地+服务端合并 |
| 标记已读 | ✅ | 单条/全部 |
| 通知设置 | ✅ | 三个开关 |
| 未读角标 | ✅ | Profile 页显示数量 |

### 3.8 分享体系

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 微信好友分享 | ✅ | useShareAppMessage |
| 朋友圈分享 | ✅ | useShareTimeline + Canvas 分享卡 |
| 分享卡生成 | ✅ | 9:16 竖版，含品牌/媒体/文字/QR |
| QR 码渲染 | ✅ | Canvas 2D 纯手绘 |

### 3.9 个人中心

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 修改昵称 | ✅ | PATCH /api/v1/me |
| 修改头像 | ⚠️ | 本地路径未上传到服务端 |
| 陪伴天数 | ✅ | 日历展示 |
| 缓存清理 | ✅ | 清理媒体缓存 |
| 隐私政策/条款 | ✅ | 静态页面 |
| 反馈问卷 | ⚠️ | 数据未提交到服务端 |

---

## 四、问题清单与修复方案

### 4.1 严重问题（P0）

#### P0-1: 明文密码存储

**位置**: `storage.ts`、`register/index.tsx`、`change-password/index.tsx`

**问题**: 用户密码以明文存储在 localStorage/StorageSync 中，`storage.findUser()` 返回的对象包含 `password` 字段，可被任何有设备访问权限的人读取。修改密码页面直接比较 `currentPassword !== localUser.password`。

**修复方案**:
1. 服务端已做密码哈希，本地不应存储密码
2. 移除本地 `password` 字段存储，密码验证和修改全部走服务端 API
3. `change-password` 页面的旧密码校验改为服务端校验
4. 过渡期：如需本地校验，至少使用 SHA-256 哈希存储

---

#### P0-2: 客户端 Mock 重置密码

**位置**: `reset-password/index.tsx`

**问题**: 验证码由客户端 `Math.random()` 生成并通过弹窗展示，无真实短信发送。任何人可通过观察弹窗中的 Mock 验证码重置任意本地用户的密码。

**修复方案**:
1. 接入服务端短信验证码 API（`POST /api/v1/auth/send-sms-code` + `POST /api/v1/auth/verify-sms-code`）
2. 移除客户端验证码生成逻辑
3. 过渡期：至少移除弹窗展示验证码的行为，改为控制台输出

---

#### P0-3: 调试模式对用户可见

**位置**: `points/index.tsx`、`time-letters/index.tsx`、`profile/index.tsx`

**问题**:
- 积分页：5 点击标题激活 Debug 模式，积分直接充至兑换阈值，且底部有可见的"调试模式点击入口"
- 时光信件：5 点击标题开启快进模式
- 个人中心：5 点击标题进入 Admin 设置

**修复方案**:
1. 所有 5 点击入口增加环境判断：`process.env.NODE_ENV === 'development'` 时才可用
2. 移除积分页底部可见的调试入口文字
3. Admin 设置页增加二次确认弹窗

---

#### P0-4: 双重 mediaStorage 实现冲突

**位置**: `mediaStorage.ts` vs `storage.ts` 行 18-122

**问题**: 存在两个独立的 `mediaStorage` 实现，使用相同的 key 前缀 `miao_media_` 但存储格式不同：
- `mediaStorage.ts`：IndexedDB 存储 base64，小程序用 FileSystem 存二进制 ArrayBuffer
- `storage.ts` 内联版：Web 用 localStorage，小程序用 FileSystem 存 base64

如果两个模块在同一代码路径中被导入，会互相读取到错误格式的数据。

**修复方案**:
1. 统一为 `mediaStorage.ts` 的实现（IndexedDB + FileSystem 二进制模式）
2. 移除 `storage.ts` 中内联的 mediaStorage 对象
3. 全局搜索 `import { mediaStorage }` 确保所有引用指向同一模块

---

### 4.2 高优先级问题（P1）

#### P0-5: httpAdapter Web 分支返回字段名不一致

**位置**: `httpAdapter.ts` 行 142

**问题**: Web/fetch 分支返回 `{ responseData, status }` 而小程序分支返回 `{ data, status }`。所有使用 `res.data` 的代码在 Web 端会得到 `undefined`。

**修复方案**: 将 Web 分支的 `responseData` 改为 `data`，与小程序分支对齐。

---

#### P0-6: pruneStorage 日记裁剪逻辑错误

**位置**: `storage.ts` 行 569-588

**问题**: 超过 200 条时，代码从旧条目中剥离 media/mediaData 后重新保存了全部条目（包括被剥离的旧条目），总数并未减少。

**修复方案**: 裁剪时应直接删除超出上限的旧条目，而非仅剥离媒体：
```ts
const trimmed = sorted.slice(0, MAX_DIARIES); // 直接截断
```

---

#### P0-7: SyncQueue 忙等待自旋

**位置**: `syncQueue.ts` 行 33-35

**问题**: `while(this.flushing) { await sleep(100); }` 是轮询等待，浪费 CPU 且最多延迟 100ms。

**修复方案**: 使用 Promise 信号量：
```ts
private flushResolve: (() => void) | null = null;
private flushPromise: Promise<void> | null = null;

async flush() {
  if (this.flushing) {
    await this.flushPromise;
    return;
  }
  this.flushing = true;
  this.flushPromise = new Promise(r => { this.flushResolve = r; });
  try { /* ... 执行任务 ... */ }
  finally {
    this.flushing = false;
    this.flushResolve?.();
    this.flushPromise = null;
  }
}
```

---

#### P0-8: 注销账户未调用服务端 API

**位置**: `profile/index.tsx` 的 `handleClearLocalData`

**问题**: 按钮文字为"注销账户"但实际只清除了本地数据，服务端账户数据仍然存在。

**修复方案**:
1. 增加 `DELETE /api/v1/me` 服务端接口
2. 调用后再清除本地数据
3. 或将按钮文字改为"清除本地数据"，与实际行为一致

---

#### P0-9: 反馈问卷数据未提交服务端

**位置**: `feedback/index.tsx`

**问题**: 11 道问卷题目的答案收集在 React state 中，提交时仅设置 `hasSubmittedSurvey` 标记，数据随组件卸载丢失。

**修复方案**: 增加 `POST /api/v1/feedback` 接口，提交时将 surveyAnswers 发送到服务端。

---

#### P0-10: 下载页按钮无功能

**位置**: `download/index.tsx`

**问题**: iOS/Android 下载按钮没有 onClick 处理器，QR 码使用外部 API `api.qrserver.com`（国内可能不可用）。

**修复方案**:
1. 添加实际 App Store / Google Play 链接
2. QR 码改用本地 `qrCanvas.ts` 生成
3. 过渡期：隐藏下载页入口

---

### 4.3 中优先级问题（P2）

#### P2-1: 陪伴里程碑日历跨月错误

**位置**: `accompany-milestone/index.tsx`

**问题**: 日历标记逻辑为 `now.getDate() - i`，当天数超过当前日期时产生负数，跨月显示不正确。

**修复方案**: 使用 `Date` 对象减天数：
```ts
const d = new Date();
d.setDate(d.getDate() - i);
accompaniedDays.add(`${d.getMonth()+1}/${d.getDate()}`);
```

---

#### P2-2: 猫咪播放器"喜欢"按钮无效

**位置**: `cat-player/index.tsx`

**问题**: 点击"喜欢"仅显示 Toast，未持久化任何状态，误导用户。

**修复方案**: 要么接入日记点赞系统（`friendService.likeDiary`），要么移除该按钮。

---

#### P2-3: Cat Start 返回按钮实为登出

**位置**: `cat-start/index.tsx`

**问题**: 左上角箭头图标看起来像"返回"，但实际执行 `logout()` + `reLaunch` 到登录页，且无确认弹窗。

**修复方案**:
1. 将图标改为登出图标
2. 添加确认弹窗"确定要退出登录吗？"

---

#### P2-4: Generation Progress 后台生成竞态

**位置**: `generation-progress/index.tsx` 的 `handleUnlockAll`

**问题**: 函数先调用 `reLaunch` 跳转首页，然后继续在后台生成视频。组件卸载后，`pollTaskResult` 的回调可能无法更新 UI，错误也会静默丢失。

**修复方案**:
1. 在 `reLaunch` 之前启动所有生成任务
2. 使用 `Taro.eventCenter` 在首页监听生成完成事件
3. 或改为先完成所有生成再跳转

---

#### P2-5: 头像上传未走服务端

**位置**: `edit-profile/index.tsx`

**问题**: `avatar` 被设为本地 `tempFilePath`，PATCH 请求直接发送本地文件路径字符串，服务端无法识别。

**修复方案**:
1. 使用 `Taro.uploadFile` 上传头像到服务端
2. 服务端返回 URL，保存该 URL 到用户信息

---

#### P2-6: QR 码生成器限制

**位置**: `qrCanvas.ts`

**问题**: 仅支持 QR Version 1-6（约 136 字节），掩码模式固定为 0，纠错等级固定为 M。长 URL 会静默截断或生成不可读码。

**修复方案**:
1. 使用成熟的 QR 码库（如 `qrcode-generator`）
2. 或扩展支持到 Version 10+ 以覆盖更长的 URL

---

#### P2-7: Join Friend 成功后无导航

**位置**: `join-friend/index.tsx`

**问题**: 添加好友成功后显示成功弹窗，但没有"完成"或"继续"按钮，用户无法离开页面。

**修复方案**: 添加"返回"按钮或 2 秒后自动 `navigateBack()`。

---

#### P2-8: 通知设置不同步

**位置**: `notifications/index.tsx`

**问题**: 通知偏好仅存本地，换设备后设置丢失。

**修复方案**: 增加 `PUT /api/v1/settings` 接口同步偏好设置。

---

### 4.4 低优先级问题（P3）

#### P3-1: 全局 .icon-img 样式泄漏

**位置**: `DiaryCard.less`、`CommentInput.less`、`ShareSheet.less`、`PageHeader.less`

**问题**: 四个组件的 `.less` 文件都定义了顶层 `.icon-img` 规则，无作用域隔离，可能互相覆盖。

**修复方案**: 每个组件的根类名作为命名空间，将 `.icon-img` 嵌套在内部。

---

#### P3-2: FrostedGlassBubble 未使用的 bubbleId prop

**位置**: `FrostedGlassBubble.tsx`

**问题**: `bubbleId` 在 Props 接口中声明但组件内未使用。

**修复方案**: 移除该 prop 声明。

---

#### P3-3: Icons 组件重复图标

**位置**: `Icons.tsx`

**问题**: `Camera` 和 `Scan` 都使用 `📷` emoji，功能完全相同；`strokeWidth` prop 声明但未使用。

**修复方案**: 移除 `Scan` 图标（用 `Camera` 替代），移除 `strokeWidth` prop。

---

#### P3-4: logo.png 过大

**位置**: `src/assets/logo.png`

**问题**: 545KB，对小程序资源来说偏大。

**修复方案**: 压缩至 100KB 以下，或转为 WebP 格式。

---

#### P3-5: DiaryCard 外部头像依赖

**位置**: `DiaryCard.tsx`

**问题**: 降级头像使用 `api.dicebear.com`，离线时无法加载。

**修复方案**: 使用本地默认头像资源替代。

---

#### P3-6: ErrorBoundary 无限重试

**位置**: `ErrorBoundary.tsx`

**问题**: 重试按钮仅清除错误状态，如果根因持续存在会无限触发错误边界。

**修复方案**: 添加最大重试次数（如 3 次），超过后显示"请重启应用"。

---

#### P3-7: Login 手机登录重复代码

**位置**: `login/index.tsx`

**问题**: `handlePhoneLogin` 中 phoneCode 存在和 fallback 两条路径代码几乎相同（~20 行重复）。

**修复方案**: 提取公共逻辑为内部函数。

---

#### P3-8: feedback 页直接调用 wx.showToast

**位置**: `feedback/index.tsx`

**问题**: 使用 `wx.showToast` 而非 `Taro.showToast`，跨平台不兼容。

**修复方案**: 替换为 `Taro.showToast`。

---

#### P3-9: 首页视频状态恢复问题

**位置**: `home/index.tsx`

**问题**: `useDidHide` 设置 `videoError = true`，但返回页面时 `isVideoReady` 未重置，视频不会自动恢复。

**修复方案**: 在 `useDidShow` 中重置 `videoError = false` 和 `isVideoReady = false`。

---

#### P3-10: 300ms 点击延迟

**位置**: `home/index.tsx`

**问题**: 单击检测有 300ms 延迟（用于区分双击），交互响应偏慢。

**修复方案**: 使用 touchstart/touchend 时间差代替 setTimeout 延迟，或缩短至 200ms。

---

### 4.5 样式一致性问题（P4）

#### P4-1: 颜色值不统一

部分组件使用 CSS 变量（`var(--primary)`），部分硬编码颜色值：
- CommentInput 发送按钮: `#ff8c5a`
- DiaryCard liked 状态: `#ff4d4f`
- ShareSheet 标题: `#5D4037`

**修复方案**: 全部替换为 `app.less` 中定义的 CSS 变量。

#### P4-2: 圆角不一致

- DiaryCard: 24px
- ShareSheet: 48rpx
- app.less card: 36rpx
- TabBar: 44rpx

**修复方案**: 定义圆角设计令牌 `--radius-sm/md/lg/xl`，统一引用。

#### P4-3: 阴影不一致

- `var(--soft-shadow)`: `0 12rpx 34rpx rgba(99,62,29,0.08)`
- CommentInput: `0 -4px 16px rgba(0,0,0,0.08)`
- TabBar: `0 18rpx 48rpx rgba(99,62,29,0.11)`

**修复方案**: 定义 `--shadow-sm/md/lg` 令牌。

---

## 五、功能完善度矩阵

| 模块 | 核心 | 社交 | 分享 | 同步 | 安全 | 评分 |
|------|------|------|------|------|------|------|
| 认证 | ✅ | - | - | ✅ | ⚠️ | 6/10 |
| 猫咪互动 | ✅ | - | ✅ | ✅ | - | 8/10 |
| 日记 | ✅ | ✅ | ✅ | ✅ | ✅ | 9/10 |
| 时光信件 | ✅ | - | ✅ | ⚠️ | - | 7/10 |
| 积分 | ✅ | - | ✅ | ⚠️ | ⚠️ | 6/10 |
| 好友 | ✅ | ✅ | ✅ | ✅ | - | 8/10 |
| 通知 | ✅ | - | - | ⚠️ | - | 6/10 |
| 个人中心 | ✅ | - | ✅ | ⚠️ | ⚠️ | 6/10 |
| 反馈 | ⚠️ | - | - | ❌ | - | 3/10 |

---

## 六、修复优先级路线图

| 阶段 | 范围 | 涉及问题 |
|------|------|---------|
| 第一阶段：安全修复 | P0-1, P0-2, P0-3 | 密码存储、Mock 重置、调试入口 |
| 第二阶段：数据一致性 | P0-4, P0-5, P0-6, P0-7 | mediaStorage 统一、httpAdapter、裁剪逻辑、SyncQueue |
| 第三阶段：功能补全 | P0-8, P0-9, P0-10, P2-5, P2-8 | 注销 API、反馈提交、下载页、头像上传、设置同步 |
| 第四阶段：体验优化 | P2-1~P2-7, P3-1~P3-10 | 日历跨月、播放器、导航、竞态、样式 |
| 第五阶段：设计系统 | P4-1, P4-2, P4-3 | 颜色/圆角/阴影令牌统一 |