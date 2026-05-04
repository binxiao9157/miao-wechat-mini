# Miao 微信小程序全面分析报告

> 分析日期：2026-05-04
> 分析范围：src/ 全部源码 + 与 PWA 对比
> 分析目的：梳理现存问题、PWA 差异、改进方向

---

## 一、P0 阻塞性问题（5 项）

### 1.1 双重 mediaStorage 实现，数据格式不兼容

| 位置 | 实现 |
|------|------|
| `src/services/storage.ts` (lines 20-122) | 内联版本，base64 字符串 + localStorage 回退 |
| `src/services/mediaStorage.ts` | 独立版本，`base64ToArrayBuffer` + 二进制文件写入 |

两个模块使用不同的编码方式保存媒体文件。diary 页从 `storage` 导入使用内联版本，其他页面使用独立版本。同一份媒体数据可能被一个模块写入但另一个模块无法正确读取。

**建议**：删除 `storage.ts` 中的内联 `mediaStorage`，统一使用独立模块。

### 1.2 密码明文存储在 localStorage

- **文件**：`src/services/storage.ts` lines 163, 690-694
- **问题**：`passwordLogin` 将原始密码通过 `normalizeUser(res.data?.user, password)` 写入 localStorage。设备存储可被任何有物理访问权限的人读取。
- **建议**：删除本地密码存储，仅使用 token 认证。

### 1.3 手机号登录 mock 代码在生产环境可用

- **文件**：`src/pages/login/index.tsx` lines 165-168
- **问题**：当 `phoneCode` 为空时，代码生成 `dev_phone_${Date.now()}` 作为 mock code 发送到服务器，可被利用绕过手机验证。
- **建议**：用 `process.env.NODE_ENV === 'development'` 守卫，或直接删除。

### 1.4 Profile 登出未使用 AuthContext

- **文件**：`src/pages/profile/index.tsx` lines 151-153
- **问题**：`handleLogout` 调用 `storage.clearCurrentUser()` 而非 `useAuthContext().logout()`。AuthContext 的内存状态（`user`、`isAuthenticated`）不会更新，其他依赖 auth context 的组件仍认为用户已登录。
- **建议**：改用 `const { logout } = useAuthContext()` 并调用 `logout()`。

### 1.5 httpAdapter Web 分支返回字段名错误

- **文件**：`src/utils/httpAdapter.ts` line 142
- **问题**：Web/fetch 分支返回 `{ responseData }` 而非 `{ data }`，与接口定义 `RequestResult.data` 不匹配。调用方访问 `result.data` 在 Web 环境下得到 `undefined`。
- **建议**：将 `responseData` 改为 `data`。

---

## 二、P1 重要问题（14 项）

### 2.1 Home 页 tab bar 触摸冲突

- **文件**：`src/custom-tab-bar/index.less` line 7
- **问题**：自定义 tab bar `z-index: 900` 且 `position: fixed`，覆盖在 Home 页视频上方，可能拦截视频区域的触摸事件。
- **建议**：对 tab bar 在 Home 页添加 `pointer-events: none`，仅按钮区域 `pointer-events: auto`。

### 2.2 Home 页底部无 tab bar 安全区

- **文件**：`src/pages/home/index.less` lines 1-10
- **问题**：`home-page` 使用 `position: fixed; inset: 0`，视频错误覆盖层和"无猫咪"状态未考虑 tab bar 高度。
- **建议**：为底部内容添加 tab bar 高度的 padding。

### 2.3 登录页键盘遮挡

- **文件**：`src/pages/login/index.tsx` lines 248-268
- **问题**：Input 字段没有 `adjustPosition` 属性，也没有键盘高度监听。小屏设备上键盘弹出后底部按钮和协议勾选可能被遮挡。
- **建议**：添加 `adjustPosition` 或使用 ScrollView 包裹表单。

### 2.4 日记发布弹窗键盘逻辑冲突

- **文件**：`src/pages/diary/index.tsx` lines 741-756
- **问题**：Textarea 同时设置了 `adjustPosition={false}` 和 `fixed`，又手动监听 `onKeyboardHeightChange`。`onFocus` 也设置 keyboardHeight，与 `onKeyboardHeightChange` 存在竞态，导致弹窗跳动。
- **建议**：移除 `onFocus` 中的 keyboardHeight 设置，仅保留 `onKeyboardHeightChange` 作为唯一数据源。

### 2.5 SyncQueue 忙等待竞态

- **文件**：`src/services/syncQueue.ts` lines 30-38
- **问题**：`flush()` 方法使用 `while (this.flushing) setTimeout(r, 100)` 忙等待，浪费 CPU 且可能无限等待。
- **建议**：改用 Promise 链或 debounce 模式。

### 2.6 SyncManager 冷却期跳过脏数据同步

- **文件**：`src/services/syncManager.ts` lines 7-8
- **问题**：30 秒冷却期内所有同步请求被跳过。如果用户修改数据后 30 秒内关闭应用，本地变更可能未推送。
- **建议**：追踪脏状态（pending local changes），脏数据始终同步，不受冷却期限制。

### 2.7 积分系统客户端权威

- **文件**：`src/pages/home/index.tsx` lines 192-233
- **问题**：积分发放完全在客户端执行，`mergePoints` 使用 `Math.max(local.total, remote.total)`，用户可篡改 localStorage 获得无限积分并推送到服务器。
- **建议**：积分发放应由服务端验证和授权。

### 2.8 分享朋友圈流程误导

- **文件**：`src/components/common/ShareSheet.tsx` lines 48-71
- **问题**：`showShareImageMenu` 保存图片到相册并显示分享菜单，但并不能直接分享到朋友圈。用户需要手动打开微信朋友圈选择图片。按钮文案"微信朋友圈"暗示直接分享。
- **建议**：明确按钮功能为"保存卡片图"，或在 UI 中说明流程。

### 2.9 401 处理器可能导致双重导航

- **文件**：`src/context/AuthContext.tsx` lines 71-86
- **问题**：多个并发 401 响应会触发多次 `auth:unauthorized` 事件。虽然有 `handling401` 防抖，但 `Taro.reLaunch` 仍可能被调用两次。
- **建议**：添加导航守卫，避免重复跳转。

### 2.10 无 Token 刷新机制

- **文件**：`src/services/authService.ts`
- **问题**：Token 过期后服务端返回 401，触发完整登出。用户在使用过程中被意外登出。
- **建议**：实现 token 刷新端点，API 调用前检查 token 临近过期时自动刷新。

### 2.11 视频文件保存缺少扩展名

- **文件**：`src/services/mediaStorage.ts` line 58
- **问题**：媒体文件保存为 `media_${id}` 无扩展名，大视频文件（20MB）可能超出 `base64ToArrayBuffer` 处理限制。
- **建议**：添加正确的文件扩展名，添加大文件错误处理。

### 2.12 日记媒体读取使用同步 API

- **文件**：`src/pages/diary/index.tsx` line 314
- **问题**：`fs.readFileSync(selectedMedia.tempFilePath, 'base64')` 阻塞 UI 线程，大视频文件可能导致卡顿或崩溃。
- **建议**：改用异步 `fs.readFile` 并显示加载指示器。

### 2.13 分享链接 id 参数被忽略

- **文件**：`src/pages/diary/index.tsx` line 98
- **问题**：分享链接使用 `path: /pages/diary/index?id=${d.id}`，但日记页从未读取 `id` 参数定位到特定日记。用户打开分享链接后看到的是所有日记列表。
- **建议**：页面 mount 时检查 `id` 参数，滚动到或高亮对应日记。

### 2.14 videoUtils.ts 使用浏览器 API

- **文件**：`src/lib/videoUtils.ts`
- **问题**：`getVideoAspectRatio`、`captureVideoFrame` 等函数使用 `HTMLVideoElement` 和 `document.createElement`，在微信小程序环境会崩溃。
- **建议**：添加环境检测，小程序环境跳过或提供微信兼容实现。

---

## 三、P2 次要问题（18 项）

| # | 问题 | 文件 | 说明 |
|---|------|------|------|
| 3.1 | 日记列表底部 padding 可能不足 | `diary/index.less` line 69 | 220rpx 在大安全区设备可能不够，建议用 `calc()` |
| 3.2 | Points toast setTimeout 未清理 | `home/index.tsx` line 79 | 组件卸载前 timeout 未清除，React 报 warning |
| 3.3 | 日记列表未使用 ScrollView | `diary/index.tsx` | 大量日记时性能差，无下拉刷新 |
| 3.4 | 删除日记未清理远程媒体缓存 | `storage.ts` line 1103 | `remote_${id}` 缓存条目未清理 |
| 3.5 | useAuth hook 是死代码 | `hooks/useAuth.ts` | 从未被任何页面导入 |
| 3.6 | 分享 Canvas 高度可能截断 | `diary/index.tsx` line 953 | 固定 1600px，超长内容可能溢出 |
| 3.7 | useShareTimeline ref 5 秒后清空 | `diary/index.tsx` line 947 | 用户在 5 秒后从右上角分享朋友圈会得到通用文案 |
| 3.8 | 单页模式仅日记页检测 | `diary/index.tsx` | 其他 tab 页未处理 scene 1154 |
| 3.9 | 注册页用本地检查判断用户名 | `register/index.tsx` lines 51-55 | 不可靠，应依赖服务端 409 响应 |
| 3.10 | storage 内存缓存无上限 | `storage.ts` lines 424-455 | memCache 无淘汰策略，持续增长 |
| 3.11 | Home 在线计时器后台未停 | `home/index.tsx` line 188 | 切换 tab 后计时器继续运行 |
| 3.12 | 好友动态轮询后台未停 | `diary/index.tsx` lines 188-192 | 应用在后台时仍每分钟轮询 |
| 3.13 | getPoints 每次访问都重新计算 | `storage.ts` lines 990-1014 | 频繁调用时性能浪费 |
| 3.14 | catch {} 静默吞错误 | 多文件 | 关键操作（如 auth token 解析）错误被吞 |
| 3.15 | 无网络瞬态重试 | `httpAdapter.ts` | GET 请求失败无重试机制 |
| 3.16 | 删除按钮触摸区域过小 | `diary/index.less` line 253 | 32px 低于 44px 最低建议 |
| 3.17 | 次要文字对比度不足 | `app.less` | `#8E8E8E` on `#FFF9F5` 对比度约 3.2:1，未达 WCAG AA |
| 3.18 | 开发者错误信息暴露给用户 | `httpAdapter.ts` line 94 | "域名未加白名单" 用户看不懂 |

---

## 四、与 PWA 功能差异

### 4.1 小程序有但 PWA 没有的功能

| 功能 | 说明 |
|------|------|
| 微信一键登录 / 手机号快捷登录 | 依赖微信 `openType="getPhoneNumber"` |
| 设置昵称页 (`set-nickname`) | 微信/手机登录新用户设置自定义昵称 |
| 隐私设置页 (`privacy-settings`) | 缓存大小计算、选择性清除 |
| SyncQueue + SyncManager | 5 秒防抖 + 3 次重试 + 30 秒冷却全量同步 |
| 好友日记点赞/评论 | PWA friendService 无 `likeDiary`/`commentDiary` |
| 自定义通知系统 | `getCustomNotifications()`/`addCustomNotification()` |

### 4.2 PWA 有但小程序没有的功能

| 功能 | 说明 |
|------|------|
| `miao://` 深度链接 | PWA 注册了协议处理器，小程序不支持 |
| PrivateMessageShare 组件 | 私信分享日记给指定好友，小程序无此组件 |
| AI Action Prompts | 精细化的视频生成提示词（idle/tail/rubbing/blink），小程序无 |
| AI Client 重试逻辑 | 指数退避重试 + 轮询 + abort signal，小程序无 |
| `skipImageStage` AI 配置 | PWA AIProfile 有此字段，小程序无 |
| Framer Motion 动画 | PWA 使用 motion/react，小程序使用 CSS 动画 |
| PWA 安装引导 | `InstallPromptBanner` 组件 |

### 4.3 数据模型不一致

| 模型 | 小程序 | PWA | 影响 |
|------|--------|-----|------|
| `UserInfo` | 多 `passwordSet`, `openidBound`, `phone`, `isNewUser` | 仅 `username/nickname/avatar/password` | 微信用户在 PWA 登录后丢失绑定状态 |
| `Comment` | 多 `authorId`, `authorNickname`, `createdAt` | 仅 `id/content` | 小程序评论的作者信息在 PWA 同步时丢失 |
| API 路由 | `/api/v1/cats` | `/api/cats/:username` | **关键**：两端可能看不到对方创建的数据 |

### 4.4 同步策略差异

| 维度 | 小程序 | PWA |
|------|--------|-----|
| 写入同步 | SyncQueue 5s 防抖 + 3 次重试 | fire-and-forget，无重试 |
| 全量同步 | SyncManager 30s 冷却 + useDidShow 触发 | 仅登录时一次 |
| 积分合并 | `Math.max()` + 去重历史 | 仅取更高 total 覆盖 |
| 401 处理 | 自动登出 + 事件总线 | 无自动处理 |
| 离线支持 | 重试队列，数据不丢 | 写入失败静默丢失 |

---

## 五、代码质量问题

| # | 问题 | 文件 | 说明 |
|---|------|------|------|
| 5.1 | `(storage as any)` 类型强转 | `syncQueue.ts` lines 70-92 | 暴露了 storage API 设计缺陷 |
| 5.2 | storage ↔ syncQueue 循环依赖 | `storage.ts` lines 7-14 | 用 lazy require 规避，运行时加载顺序变化可能导致 undefined |
| 5.3 | global React 赋值 | `app.tsx` lines 8-13 | workaround，可能与其他库冲突 |
| 5.4 | mockFriendService 在生产包中 | `mockFriendService.ts` | 意外调用会注入假数据 |
| 5.5 | `pages/.tsx` 残留文件 | `src/pages/.tsx` | 无名 stub 文件，可能造成构建混淆 |
| 5.6 | `urlCheck: false` | `project.config.json` line 8 | 生产环境应启用域名校验 |
| 5.7 | `useAuth` hook 死代码 | `hooks/useAuth.ts` | 从未导入，包含不安全的本地密码校验 |

---

## 六、改进建议优先级排序

### 第一批：P0 修复（应立即处理）

1. 统一 `mediaStorage` 实现
2. 移除本地密码明文存储
3. 守卫手机号 mock 代码
4. Profile 登出走 AuthContext
5. 修复 httpAdapter Web 分支字段名

### 第二批：P1 修复（近期迭代）

1. Home 页 tab bar 触摸/布局修复
2. 登录页/发布弹窗键盘处理
3. SyncQueue 忙等待改为 Promise 链
4. SyncManager 脏数据强制同步
5. 分享链接 id 参数定位
6. 401 双重导航守卫
7. Token 刷新机制
8. 视频文件扩展名 + 异步读取

### 第三批：PWA 对齐（中期规划）

1. API 路由统一（`/api/v1/` vs `/api/`）
2. Comment/UserInfo 数据模型对齐
3. PWA 补齐 likeDiary/commentDiary
4. 小程序补齐 PrivateMessageShare
5. 小程序补齐 AI Action Prompts

### 第四批：P2 优化（长期打磨）

1. 日记列表虚拟滚动 / 分页
2. 积分系统服务端权威化
3. 网络请求重试机制
4. 触摸区域和对比度无障碍优化
5. 清理死代码和循环依赖
6. 后台轮询/计时器生命周期管理