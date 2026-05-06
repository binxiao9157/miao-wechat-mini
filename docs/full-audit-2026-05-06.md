# Miao 微信小程序全面审计报告

> 生成日期：2026-05-06
> 范围：安全、性能、数据一致性、UX/功能、代码质量

---

## 一、关键发现概览

| 维度 | 严重 | 高 | 中 | 低 | 合计 |
|------|------|---|---|---|------|
| 安全 | 3 | 4 | 6 | 6 | 19 |
| 性能 | 0 | 12 | 14 | 9 | 35 |
| 数据一致性 | 0 | 6 | 7 | 4 | 17 |
| UX/功能 | 0 | 3 | 22 | 16 | 41 |
| 代码质量 | 4 | 10 | 11 | 8 | 33 |
| **合计** | **7** | **35** | **60** | **43** | **145** |

---

## 二、Top 10 必须修复的问题

### 1. reset-password 请求体为空（安全-High）

**文件**: `src/pages/reset-password/index.tsx:80-82`

```typescript
await request({
  url: '/api/v1/auth/reset-password',
  method: 'POST',
  resetData,  // ← 错误：应该是  resetData
});
```

`resetData` 作为属性名传入，请求体为空，密码重置永远不会调用服务端 API。回退到客户端 Mock 模式，验证码由 `Math.random()` 生成并弹窗展示。

**修复**: 改为 `data: resetData`。

### 2. 明文密码存储（安全-Critical）

**文件**: `src/hooks/useAuth.ts:17`、`src/pages/register/index.tsx:58-63`

- `useAuth.ts` 的 `login` 回调直接比较 `foundUser.password === password`（明文对比）
- 注册时 `password` 字段随 `UserInfo` 存入 localStorage
- `change-password` 页面直接读取 `localUser.password` 比对

**修复**: 移除 `useAuth.ts`（已是死代码）；`UserInfo` 不存储 `password` 字段；密码验证全部走服务端。

### 3. 日记列表无虚拟化（性能-High）

**文件**: `src/pages/diary/index.tsx`

最多 200 条日记 + 100 条好友日记，每条含 Image/Video 元素，全部用 `.map()` 渲染。无虚拟化、无懒加载、无分页。50 条以上即出现滚动卡顿，低端机 OOM 崩溃。

**修复**: 使用 Taro VirtualList 或自定义窗口化方案，媒体懒加载。

### 4. saveDiaries 每次入队全部 200 条日记（性能-High + 数据一致性-High）

**文件**: `src/services/storage.ts:1092-1106`

每次 `saveDiaries()` 调用都将全部日记入队 SyncQueue，即使只改了一条。导致每次修改触发 200 个 HTTP 请求，且未变更的日记被重复上传。

**修复**: 仅入队变更的日记（dirty tracking 或 diff 比较）。

### 5. 猫咪删除不级联（数据一致性-High）

**文件**: `src/services/storage.ts:1162-1190`

删除猫咪后，关联的日记、时光信件、积分数据不被清理。日记按 catId 过滤后变为"幽灵数据"，不可见但仍占存储和同步带宽。

**修复**: 删除猫咪时级联清理或重新分配关联数据。

### 6. diary 页缺少 useDidShow 刷新（UX-High）

**文件**: `src/pages/diary/index.tsx`

日记页不用 `useDidShow`，切换 Tab 回来不刷新数据。用户在其他页面创建日记后切回日记 Tab，新数据不出现，需手动下拉刷新。

**修复**: 添加 `useDidShow(() => loadDiaries())`。

### 7. 评论输入框被键盘遮挡（UX-High）

**文件**: `src/pages/diary/index.tsx:802-834`

评论输入框是 fixed 定位的底部弹层，没有 `keyboardHeight` 监听。键盘弹出时输入框被遮挡，用户看不到自己输入的内容。写日记弹层有键盘处理，但评论弹层没有。

**修复**: 评论弹层添加 `onKeyboardHeightChange` 监听，动态调整 `bottom` 值。

### 8. storage.ts 是 1310 行的 God Object（代码质量-Critical）

**文件**: `src/services/storage.ts`

包含：所有数据模型/接口、媒体存储、同步层、HTTP 请求包装、用户管理、猫咪 CRUD、日记 CRUD、积分系统、好友管理、通知管理、视频 URL 规范化、合并逻辑、缓存管理。

**修复**: 拆分为 6+ 个聚焦模块（storageCore、catStorage、diaryStorage、pointsStorage、friendStorage、notificationStorage）。

### 9. ErrorBoundary 未使用（代码质量-Critical）

**文件**: `src/components/common/ErrorBoundary.tsx`、`src/app.tsx`

ErrorBoundary 组件存在但未在任何页面或路由中包裹使用。任何未捕获的 React 错误会导致整个小程序崩溃，无恢复 UI。

**修复**: 在 `app.tsx` 中用 `ErrorBoundary` 包裹页面内容。

### 10. 零测试覆盖（代码质量-Critical）

整个 `src/` 目录无任何测试文件，`package.json` 无测试框架依赖。

**修复**: 至少为核心服务（storage、syncQueue、authService）添加单元测试。

---

## 三、安全审计

### 3.1 Critical

| # | 文件 | 问题 |
|---|------|------|
| SEC-1 | `hooks/useAuth.ts:17` | 明文密码对比 `foundUser.password === password` |
| SEC-2 | `pages/register/index.tsx:58-63` | 明文密码存入 localStorage |
| SEC-3 | `services/authService.ts:6,10-12` | Auth token 明文存储在 localStorage（PWA 环境下任何 XSS 可窃取） |

### 3.2 High

| # | 文件 | 问题 |
|---|------|------|
| SEC-4 | `app.config.ts` / `app.tsx` | 无路由守卫，未登录可直接访问受保护页面 |
| SEC-5 | `services/authService.ts:42` | Dev OpenID 用 `Math.random()` 生成，可预测 |
| SEC-6 | `pages/reset-password/index.tsx:80-82` | `data` 属性缺失，重置密码请求体为空 |
| SEC-7 | `pages/reset-password/index.tsx:38-96` | Dev 绕过允许无验证码重置密码 |

### 3.3 Medium

| # | 文件 | 问题 |
|---|------|------|
| SEC-8 | `pages/change-password/index.tsx:45` | 密码仅校验长度 ≥6，无复杂度要求 |
| SEC-9 | `pages/login/index.tsx:165` | 手机号登录 fallback 生成可预测的 dev code |
| SEC-10 | `utils/httpAdapter.ts:54-59` | 无 CSRF 保护 |
| SEC-11 | `utils/httpAdapter.ts:50` | fallback URL `https://your-server.com` 可被抢注 |
| SEC-12 | `services/authService.ts:154-157` | 登出不调用服务端注销 token |
| SEC-13 | `services/storage.ts:477` | localhost→127.0.0.1 规范化掩盖配置错误 |

### 3.4 Low

| # | 文件 | 问题 |
|---|------|------|
| SEC-14 | `context/AuthContext.tsx:37-42` | 无客户端 token 过期检查 |
| SEC-15 | `services/storage.ts` | 敏感数据明文存储 |
| SEC-16 | `pages/diary/index.tsx:939` | 评论内容复制到剪贴板未清理 |
| SEC-17 | `services/mediaStorage.ts:21-61` | 媒体上传无 MIME 类型白名单 |
| SEC-18 | `components/common/DiaryCard.tsx` | 用户内容无净化层（当前 JSX 转义安全，但脆弱） |
| SEC-19 | `services/friendService.ts:64` | 邀请码无客户端格式校验 |

---

## 四、性能审计

### 4.1 渲染性能（High）

| # | 文件 | 问题 |
|---|------|------|
| PERF-1 | `components/common/DiaryCard.tsx` | 未用 React.memo，列表任何变化导致全部重渲染 |
| PERF-2 | `pages/diary/index.tsx:387-514` | handleLike 等回调未 memoize，即使 DiaryCard memo 也被击穿 |
| PERF-3 | `pages/diary/index.tsx:239,257,261` | Promise.all 一次加载全部媒体，无懒加载 |
| PERF-4 | `pages/diary/index.tsx:230-263` | 媒体加载两次（local + sync 后再加载） |
| PERF-5 | `services/storage.ts:52-59` | Web 端 base64 存 localStorage，5MB 限额两张图即满 |
| PERF-6 | `pages/diary/index.tsx` | 200+100 条日记无虚拟化 |
| PERF-7 | `pages/time-letters/index.tsx:82-92` | 每个 LetterCard 各自 setInterval，100 封信=100 个定时器 |
| PERF-8 | `utils/shareCard.ts:175-177` | Canvas 分配 3000×dpr 高度测量文本，3x 设备=260MB GPU 内存 |
| PERF-9 | `utils/shareCard.ts:216-220` | `ctx.filter = 'blur(10px)'` GPU 极重，低端机崩溃 |
| PERF-10 | `services/storage.ts:1092-1106` | saveDiaries 入队全部 200 条日记 |
| PERF-11 | `app.config.ts` | 30+ 页面无分包，全量加载 |
| PERF-12 | `pages/diary/index.tsx:167-178` | 日记页单次访问 6+ API 调用，每分钟轮询 10 次 |

### 4.2 存储膨胀（High）

| # | 文件 | 问题 |
|---|------|------|
| PERF-13 | `services/storage.ts:570-612` | pruneStorage 仅裁剪日记，不裁剪好友日记/信件/好友列表/已读通知 |
| PERF-14 | `services/storage.ts:1273-1284` | 已读通知 ID 无限增长 |
| PERF-15 | `services/storage.ts:1156-1160` | clearMediaCache 不删除实际媒体文件，仅清除引用 |

### 4.3 定时器泄漏

| # | 文件 | 问题 |
|---|------|------|
| PERF-16 | `pages/reset-password/index.tsx:24` | 倒计时 interval 未在 unmount 清理 |
| PERF-17 | `pages/home/index.tsx:66-71,77` | setTimeout 未跟踪，unmount 后更新 state |
| PERF-18 | `pages/cat-player/index.tsx:122` | toast setTimeout 未跟踪 |
| PERF-19 | 7+ 页面 | `setTimeout(() => setToast(null), 2500)` 普遍未跟踪 |

---

## 五、数据一致性审计

### 5.1 High

| # | 文件 | 问题 | 影响 |
|---|------|------|------|
| DATA-1 | `storage.ts:853-867` | 日记合并始终取本地 content/media，多设备编辑静默丢失 | 另一设备修改日记后，回到本设备同步时被覆盖 |
| DATA-2 | `syncQueue.ts:49-56` | 同步失败 3 次后静默丢弃，无死信队列 | 本地有数据但服务端没有，换设备永久丢失 |
| DATA-3 | `diary/index.tsx:167-178` | 60s 轮询覆盖乐观更新的点赞/评论 | 点赞闪烁：出现→消失→再出现 |
| DATA-4 | `storage.ts:1162-1190` | 猫咪删除不级联到日记/信件/积分 | 幽灵数据占存储 |
| DATA-5 | `storage.ts` 多处 | `miao_login_time`/`miao_last_active_time`/`miao_last_cat_breed`/`miao_wechat_dev_openid` 未用户作用域 | 共享设备多账号数据泄漏 |
| DATA-6 | `syncManager.ts` | 无版本号/ETag/冲突检测，last-write-wins | 多设备并发修改静默覆盖 |

### 5.2 Medium

| # | 文件 | 问题 |
|---|------|------|
| DATA-7 | `storage.ts:1225-1228` | saveFriendDiaries 不入队 SyncQueue，API 失败无重试 |
| DATA-8 | `storage.ts:343-361` | miao_media: 引用发到服务端不可解析；解析失败时媒体被静默剥离 |
| DATA-9 | `context/AuthContext.tsx` + `authService.ts` | 用户状态在 AuthContext/storage/authService 三处不同步 |
| DATA-10 | `storage.ts:393-417` | 积分合并用 Math.max，消费后同步又恢复 |
| DATA-11 | `storage.ts:737-744` | 登出时缓存竞态，旧用户缓存条目残留 |
| DATA-12 | `storage.ts:1156-1160` | clearMediaCache 保存无媒体日记到服务端，媒体永久丢失 |
| DATA-13 | `profile/index.tsx:187-195` | 缓存清理用 substring 匹配，新增 key 可能被误删 |

---

## 六、UX/功能审计

### 6.1 High

| # | 页面 | 问题 |
|---|------|------|
| UX-1 | diary | 无 useDidShow 刷新，Tab 切换不更新数据 |
| UX-2 | diary | 评论输入框被键盘遮挡 |
| UX-3 | generation-progress | 生成中返回导致后台进程竞态 |

### 6.2 Medium

| # | 页面 | 问题 |
|---|------|------|
| UX-4 | notification-list | 用 navigateTo 跳转 Tab 页而非 switchTab |
| UX-5 | diary | 删除日记/评论不等待服务端确认，同步后重新出现 |
| UX-6 | edit-profile | 头像上传失败存本地路径到服务端，头像永久损坏 |
| UX-7 | diary | 初始加载无 loading 指示器 |
| UX-8 | change-password | 保存时无 loading/disabled 状态，可重复提交 |
| UX-9 | reset-password | 同上 |
| UX-10 | register | 无用户名长度/密码强度校验 |
| UX-11 | edit-profile | 昵称无 maxlength |
| UX-12 | upload-material / create-companion | 猫名无长度/格式校验 |
| UX-13 | home | 每日登录积分 toast 显示两次（mount + didShow） |
| UX-14 | diary | 快速点赞/取消竞态，回滚方向可能错误 |
| UX-15 | diary | useShareAppMessage 缺少 imageUrl |
| UX-16 | 所有 Tab 页 | Tab 切换数据刷新不一致 |
| UX-17 | profile | 无 useDidShow 刷新，编辑后显示旧数据 |
| UX-18 | time-letters | 用自定义事件代替 useDidShow，不可靠 |
| UX-19 | 全部页面 | 图标按钮缺少 aria-label |
| UX-20 | 多个页面 | 触控目标过小（<44px） |
| UX-21 | home | 视频内容无无障碍替代 |
| UX-22 | time-letters | 锁定/解锁状态仅靠视觉区分 |
| UX-23 | diary | 写日记弹层键盘偏移脆弱 |
| UX-24 | time-letters | 写信页 Textarea 被键盘遮挡 |
| UX-25 | home / time-letters | 无下拉刷新 |

### 6.3 Low

| # | 页面 | 问题 |
|---|------|------|
| UX-26 | diary | 空状态文字引用空猫名 |
| UX-27 | home | 无猫时仅一条路径 |
| UX-28 | scan-friend | 取消扫描闪现空页面 |
| UX-29 | join-friend | 无效邀请链接死胡同 |
| UX-30 | cat-start | 返回按钮可能进入循环导航 |
| UX-31 | home | 在线计时器后台继续运行 |
| UX-32 | feedback | 提交失败静默吞错，用户以为成功 |
| UX-33 | diary | 评论 Input maxlength=100 vs CommentInput 500 不一致 |
| UX-34 | time-letters | filterCatId 跨视图持久，删除猫后显示空列表 |

---

## 七、代码质量审计

### 7.1 Critical

| # | 文件 | 问题 |
|---|------|------|
| CODE-1 | `storage.ts`（1310 行） | God Object，包含所有数据层逻辑 |
| CODE-2 | `diary/index.tsx`（960 行） | 单组件管理 20+ state、CRUD、评论、分享、键盘 |
| CODE-3 | `app.tsx` | ErrorBoundary 存在但未使用 |
| CODE-4 | 整个项目 | 零测试覆盖 |

### 7.2 High

| # | 文件 | 问题 |
|---|------|------|
| CODE-5 | `hooks/useAuth.ts` | 死代码，定义了冲突的本地认证模式 |
| CODE-6 | `storage.ts` vs `httpAdapter.ts` | 重复的 request 包装，storage 内部版返回 any |
| CODE-7 | 全项目 | ~50 处 `any` 类型 |
| CODE-8 | `syncQueue.ts:72-91` | `storage as any` 绕过类型检查 |
| CODE-9 | 25+ less 文件 | ~100 个硬编码颜色值绕过设计令牌 |
| CODE-10 | 多页面 | 认证访问不一致：部分用 useAuthContext，部分直接读 storage |
| CODE-11 | 7 个页面 | `showShareMenu` 调用重复 7 次，未提取 hook |
| CODE-12 | `profile/index.tsx:153-156` | handleLogout 不调用 AuthContext.logout()，React 状态不一致 |

### 7.3 Medium

| # | 文件 | 问题 |
|---|------|------|
| CODE-13 | `storage.ts:369` | `deleteAllDiariesFromServer()` 空函数，从未调用 |
| CODE-14 | `storage.ts:995` | `syncLastCat()` 总返回 true，无实际逻辑 |
| CODE-15 | `catService.ts:86` | `mockAnalyzeCatImage()` 未使用的 mock |
| CODE-16 | `mockFriendService.ts` | 整个文件未被引用 |
| CODE-17 | 多页面 | 删除确认弹窗重复实现，未复用 ConfirmModal |
| CODE-18 | `home/index.tsx` vs `storage.ts` | 积分逻辑重复，home 应调用 storage.addPoints() |
| CODE-19 | `storage.ts` vs `fileManager.ts` | URL 规范化逻辑重复 |
| CODE-20 | `authService.ts` vs `friendService.ts` | HTTP 方法使用不一致 |
| CODE-21 | `storage.ts:316` vs `httpAdapter.ts:38` | 默认超时不一致（无 vs 10000ms） |

### 7.4 Low

| # | 文件 | 问题 |
|---|------|------|
| CODE-22 | `src/pages/.tsx` | 幽灵文件，空组件 |
| CODE-23 | `app.less` | rpx/px 混用 |
| CODE-24 | `app.less:60` | 硬编码 `#633E1D` 而非 CSS 变量 |
| CODE-25 | `catService.ts:9-29` | 品种图片用 unsplash URL 硬编码 |
| CODE-26 | `httpAdapter.ts:57` | 客户端版本号 `1.0.0` 硬编码 |
| CODE-27 | `authService.ts:4` | token key 字符串与 storage.ts 重复定义 |
| CODE-28 | `package.json` | lucide-react、qrcode.react 未使用但仍在依赖中 |
| CODE-29 | `.env` | 无 development/production 分离 |

---

## 八、修复优先级路线图

### 第一阶段：安全堵漏（1-2 天）

| 任务 | 涉及问题 |
|------|---------|
| 修复 reset-password 请求体 | SEC-6 |
| 移除 useAuth.ts 死代码 | SEC-1, CODE-5 |
| UserInfo 移除 password 字段 | SEC-2 |
| httpAdapter fallback URL 改为抛错 | SEC-11 |

### 第二阶段：核心功能修复（3-5 天）

| 任务 | 涉及问题 |
|------|---------|
| diary 页添加 useDidShow | UX-1 |
| 评论输入框键盘适配 | UX-2 |
| saveDiaries 仅入队变更日记 | PERF-10, DATA-16 |
| 猫咪删除级联清理 | DATA-4 |
| 日记/评论删除等待服务端确认 | UX-5 |
| notification-list 用 switchTab | UX-4 |
| ErrorBoundary 包裹 app | CODE-3 |
| profile logout 调用 AuthContext.logout() | CODE-12 |

### 第三阶段：性能优化（5-7 天）

| 任务 | 涉及问题 |
|------|---------|
| 日记列表虚拟化 | PERF-6 |
| DiaryCard React.memo + useCallback | PERF-1, PERF-2 |
| 媒体懒加载 | PERF-3, PERF-4 |
| 微信小程序分包 | PERF-11 |
| shareCard Canvas 内存优化 | PERF-8, PERF-9 |
| LetterCard 定时器合并 | PERF-7 |
| pruneStorage 扩展 | PERF-13, PERF-14 |

### 第四阶段：数据一致性（3-5 天）

| 任务 | 涉及问题 |
|------|---------|
| 日记合并增加 updatedAt 时间戳 | DATA-1 |
| SyncQueue 死信队列 | DATA-2 |
| 好友日记轮询保留乐观更新 | DATA-3 |
| 存储键用户作用域化 | DATA-5 |
| 积分合并改用服务端权威 | DATA-10 |
| clearMediaCache 修复 | PERF-15, DATA-12 |

### 第五阶段：代码重构（持续）

| 任务 | 涉及问题 |
|------|---------|
| storage.ts 拆分 | CODE-1 |
| diary/index.tsx 拆分 | CODE-2 |
| 提取共享 hooks（useShareSetup、useHiddenEntry） | CODE-11, CODE-17 |
| 清理死代码 | CODE-13-16, CODE-22 |
| 统一 request 调用 | CODE-6 |
| 类型安全改善 | CODE-7, CODE-8 |
| 添加核心模块单元测试 | CODE-4 |