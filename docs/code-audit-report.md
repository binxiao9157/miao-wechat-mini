# miao-wechat-mini 代码审计报告

> **扫描时间**: 2026-06-01  
> **扫描范围**: 127 个源文件（services / utils / hooks / pages / components / config / scripts）  
> **基准提交**: `7cc2edc` (fix: use single native video on home playback)  
> **发现问题**: 5 Critical / 12 High / 30 Medium / 17 Low

---

## 目录

- [🔴 Critical — 数据丢失或安全漏洞](#-critical--数据丢失或安全漏洞)
- [🟠 High — 运行时错误或功能异常](#-high--运行时错误或功能异常)
- [🟡 Medium — 功能降级或边界条件](#-medium--功能降级或边界条件)
- [🔵 Low — 代码质量与维护性](#-low--代码质量与维护性)
- [📊 统计汇总](#-统计汇总)
- [🎯 修复优先级建议](#-修复优先级建议)

---

## 🔴 Critical — 数据丢失或安全漏洞

### C1. `clearAll()` 不清 `memCache`，换号后数据串号

- **文件**: `src/services/storage.ts` 行 758-772
- **类别**: Bug / 数据污染
- **描述**: `clearAll()` 遍历删除用户前缀的 key 后，`memCache` 模块级 Map 中的缓存条目仍保留旧值。`clearCurrentUser()` 调用 `refreshUserPrefix()` 后切换到新用户前缀，但旧前缀的缓存条目仍在内存中。如果新用户的某些 key 恰好命中旧缓存（如 `cachedUserPrefix` 计算错误），会返回旧用户数据。`authService.logout()` 也不清 `memCache`。
- **影响**: 用户 A 登出后用户 B 登录，B 可能看到 A 的猫咪、积分、日记。
- **修复**: `clearAll()` 末尾加 `memCache.clear()`；`authService.logout()` 中也调用 `memCache.clear()` 或 `storage.clearAll()`。

### C2. `saveCatInfo` 无条件设置 activeCatId

- **文件**: `src/services/storage.ts` 行 967-984
- **类别**: Bug / 状态污染
- **描述**: `saveCatInfo()` 每次调用都执行 `storage.setActiveCatId(nextCat.id)`（行 981），包括后台同步更新非活跃猫咪时。`fileManager.updateCatVideos` 和 `syncFromServer` 都调用 `saveCatInfo`，导致用户正在查看猫咪 A 时，后台同步猫咪 B 的视频状态会把 activeCat 切换到 B。
- **影响**: 用户当前猫咪静默切换，首页视频和交互数据突然变成另一只猫。
- **修复**: 仅在新增猫咪时（`index < 0`）设置 `setActiveCatId`，更新已有猫咪时不切换。

### C3. `getPoints()` 读操作有写副作用

- **文件**: `src/services/storage.ts` 行 1044-1068
- **类别**: Bug / 竞态条件
- **描述**: 当 `p.total < expectedMinimum` 时，`getPoints()` 会修改 `p.total` 并调用 `storage.setItem()` 写回。调用方（UI 渲染、`addPoints`、同步代码）以为只是读取，实际触发了写入。并发调用时（如 UI 渲染 + 后台同步），两个调用都拿到同一个对象，各自修改后写回，后写覆盖先写，导致积分丢失。
- **影响**: 积分数据损坏，用户积分被意外重置或覆盖。
- **修复**: 将 `getPoints()` 改为纯读操作，新建 `ensurePointsConsistency()` 方法只在明确时机（登录、同步后）调用。

### C4. 明文密码存入 localStorage

- **文件**: `src/pages/register/index.tsx` 行 61-73
- **类别**: 安全漏洞
- **描述**: `newUser` 对象包含 `password: trimmedPassword` 明文，通过 `register()` 存入本地存储，之后 `storage.findUser()` 也返回含明文密码的用户对象。任何能读取存储的代码（包括 XSS、调试工具）都能获取明文密码。
- **影响**: 用户密码泄露风险。
- **修复**: 本地不存储明文密码，密码只发送到服务端；`findUser` 返回的对象中移除 `password` 字段。

### C5. base64 视频存入 localStorage 超出配额

- **文件**: `src/pages/diary/index.tsx` 约 390 行
- **类别**: Bug / 数据丢失
- **描述**: `handleAddDiary` 将视频文件用 `readFileSync` 读取为 base64 后存入 `mediaStorage`。视频最大允许 20MB，base64 编码后约 27MB。微信小程序总存储配额 10MB，超出后 `setStorage` 静默失败或抛异常，导致日记数据丢失。
- **影响**: 用户添加视频日记后数据丢失，或导致其他存储数据也被清除。
- **修复**: 使用 `Taro.saveFile` / `FileSystemManager.saveFile` 将媒体文件保存到用户数据目录，存储中只保留文件路径引用。

---

## 🟠 High — 运行时错误或功能异常

### H1. QR 编码对非 ASCII 字符损坏

- **文件**: `src/utils/qrCanvas.ts` 行 105, 331
- **类别**: Bug
- **描述**: `encodeData` 用 `text.charCodeAt(i)` 逐字符编码为单字节，中文等字符 code point > 255 时，`|` 运算符截断高位导致数据损坏。`selectVersion(text.length)` 用 JS 字符串长度（UTF-16 code unit 数）而非 UTF-8 字节长度，版本选择偏低。
- **修复**: 先用 `TextEncoder` 编码为 UTF-8 字节数组，再用字节数组进行编码和版本选择。

### H2. `generateFriendPoster` 不加载头像

- **文件**: `src/utils/qrCanvas.ts` 行 462-470
- **类别**: Bug
- **描述**: 函数接收 `avatarUrl` 和 `catAvatarUrl` 参数但从未使用，只画了占位圆 `ctx.fill()`，海报永远显示空白头像而非用户/猫咪头像。
- **修复**: 用 `canvas.createImage()` 加载图片（参考 `shareCard.ts` 的 `loadImage` 辅助函数），在裁剪区域内 `drawImage`。

### H3. `getCurrentPath` / `getParams` 在非页面上下文崩溃

- **文件**: `src/utils/navigateAdapter.ts` 行 92-105
- **类别**: Bug
- **描述**: `Taro.getCurrentInstance()` 在 app 初始化、自定义 tab bar 等非页面上下文中返回 `null`，直接访问 `instance.router` 会抛出 `TypeError: Cannot read properties of null`。
- **修复**: `const instance = Taro.getCurrentInstance(); if (!instance?.router) return '/';`

### H4. 存储对象直接变异导致竞态覆盖

- **文件**: `src/pages/home/index.tsx` 行 164-238
- **类别**: 竞态条件
- **描述**: `checkDailyLogin` 和 `grantInteractionPoints` 都调用 `storage.getPoints()` 获取对象后直接 `.total +=`、`.unshift()` 再 `savePoints()`。两个函数在同一个渲染周期内先后执行时，后者覆盖前者的修改。
- **修复**: 使用函数式更新（读取最新值再修改），或在 `savePoints` 中实现原子性 increment 操作。

### H5. `syncQueue.flush()` 无 try-finally 保护

- **文件**: `src/services/syncQueue.ts` 行 143-193
- **类别**: Bug / 死锁
- **描述**: 行 185 处 `this.persist()` 如果抛异常，`this.flushing` 永远为 `true`，`flushWaiters` 永远不 resolve，队列永久死锁。行 155 处 `persist()` 抛异常时，`dirty` 已清空但 tasks 在局部变量中，pending tasks 丢失。
- **修复**: 用 try-finally 包裹 flush 主体，确保 `this.flushing = false` 和 `resolveFlushWaiters()` 始终执行。

### H6. 临时文件泄漏

- **文件**: `src/services/volcanoService.ts` 行 79-87
- **类别**: 资源泄漏
- **描述**: `dataUrlToTempFile` 写入 `USER_DATA_PATH/upload_*.ext` 但从不清理。每次上传产生一个临时文件，微信小程序 200MB 配额逐渐耗尽。
- **修复**: 上传完成后用 `Taro.getFileSystemManager().unlinkSync()` 删除临时文件，或使用固定文件名覆盖写入。

### H7. `compressForStorage` 在小程序中不工作

- **文件**: `src/services/fileManager.ts` 行 47-72
- **类别**: Bug / 性能
- **描述**: `typeof window === 'undefined'` 时直接 `return base64` 跳过压缩。微信小程序环境中 `window` 为 `undefined`，图片永远不被压缩，导致存储膨胀。
- **修复**: 使用 `Taro.compressImage()` 实现小程序端压缩，或至少添加 warning 日志。

### H8. `offAll(event)` 移除所有监听器

- **文件**: `src/utils/eventAdapter.ts` 行 57-69
- **类别**: Bug
- **描述**: `offAll(event)` 调用 `Taro.eventCenter.off(event)` 删除该事件的所有监听器，包括其他模块注册的，导致静默的功能丢失。Web 路径下 `offAll` 完全无效（空操作）。
- **修复**: 内部维护 `Map<string, Set<Function>>` 追踪通过 `on()` 注册的处理器，`offAll` 只移除已追踪的处理器。

### H9. `eventAdapter` 环境检测与其他适配器不一致

- **文件**: `src/utils/eventAdapter.ts` 行 8
- **类别**: Bug
- **描述**: 用 `process.env.TARO_ENV === 'weapp'`（编译时常量），而其他 4 个适配器（storage/http/platform/navigate）都用 `Taro.getEnv()` + try/catch 运行时检测。构建配置错误时选错代码路径且无回退。
- **修复**: 统一使用 `Taro.getEnv() === Taro.ENV_TYPE.WEAPP` 运行时检测。

### H10. 开发模式用 `cloudID` 作为登录码

- **文件**: `src/pages/login/index.tsx` 约 160 行
- **类别**: 安全漏洞
- **描述**: 开发模式下 `phoneCode` 不可用时，fallback 用 `e.detail?.cloudID || 'dev_phone_' + Date.now()` 作为登录码。`cloudID` 是微信敏感数据标识，用作 phone code 可能绕过认证。
- **修复**: 移除 `cloudID` fallback，仅使用 mock code（如 `codeRef.current`）。

### H11. `handleGoBack` 无确认直接删猫

- **文件**: `src/pages/generation-progress/index.tsx` 约 353 行
- **类别**: Bug / UX
- **描述**: 用户按返回键时无条件 `deleteCatById` 并跳转，不退回已扣积分，无确认弹窗。
- **修复**: 添加确认弹窗，退回 redemption 积分后再执行删除和跳转。

### H12. 积分扣除后中途放弃不退回

- **文件**: `src/pages/generation-progress/index.tsx` 约 222 行
- **类别**: Bug
- **描述**: `isRedemption` 为 true 时积分在生成开始前扣除，但 `handleGoBack` 和 `AbortController` 中断路径不触发退回。`startGeneration` 中 `isActiveRun` 检查提前返回时也不退回。
- **修复**: 用 ref 追踪积分是否已扣除，在清理函数和 `handleGoBack` 中检查并退回。

---

## 🟡 Medium — 功能降级或边界条件

### M1. `getItem` 将空字符串视为 null

- **文件**: `src/utils/storageAdapter.ts` 行 29
- **描述**: `if (value === '' || value === undefined || value === null) return null;` 导致无法区分"未设置"和"设为空串"。
- **修复**: 移除 `value === ''` 检查。

### M2. Web 路径丢弃 response headers

- **文件**: `src/utils/httpAdapter.ts` 行 136-140
- **描述**: fetch 路径返回 `headers: {}`，丢失所有响应头。小程序路径正确返回 `res.header || {}`。
- **修复**: `headers: Object.fromEntries(response.headers.entries())`。

### M3. URL 参数解析丢失 `=` 后内容

- **文件**: `src/utils/navigateAdapter.ts` 行 119-121
- **描述**: `pair.split('=')` 对 `key=bar=baz` 只取 `['key', 'bar']`，丢失 `=baz`。
- **修复**: 使用 `URLSearchParams` 或 `pair.split('=')` + 限制分割次数。

### M4. `useManagedTimeout` 回调闭包捕获 stale state

- **文件**: `src/hooks/useManagedTimeout.ts` 行 13-18
- **描述**: callback 在 `setTimeout` 闭包中捕获调用时的值，React 状态更新后读到旧值。
- **修复**: 提供接受 ref 的变体，或文档说明调用方需用 `useRef` 稳定回调。

### M5. 键盘监听器引用不稳定

- **文件**: `src/pages/diary/index.tsx` 行 222-237
- **描述**: `handleKeyboardHeightChange` 在 useEffect 内定义，每次 `showCompose` 变化生成新引用，`offKeyboardHeightChange` 可能无法移除旧监听。
- **修复**: 用 `useCallback` 稳定引用，或确保 register/unregister 使用同一引用。

### M6. `readFileSync` 阻塞主线程

- **文件**: `src/pages/diary/index.tsx` 约 387 行
- **描述**: 同步读取大视频文件（最大 20MB）会阻塞 UI。
- **修复**: 改用 `fs.readFile`（异步）。

### M7. 点赞快速双击导致状态不一致

- **文件**: `src/pages/diary/index.tsx` 行 429-502
- **描述**: 乐观更新后 API 失败回滚，但快速双击时两次乐观更新叠加，API 返回顺序不确定导致最终状态与服务器不一致。
- **修复**: 点赞期间禁用按钮，或使用防抖/节流。

### M8-M9. `Date.now()` 生成 ID 碰撞风险

- **文件**: `src/pages/time-letters/index.tsx` 行 344 / `src/pages/create-companion/index.tsx` 行 55
- **描述**: 同毫秒创建两个对象会产生相同 ID。
- **修复**: `'letter_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)`（`home/index.tsx` 已用此模式）。

### M10. 双击触发两次图片生成

- **文件**: `src/pages/upload-material/index.tsx` 行 93-116
- **描述**: `isDrawing` 状态更新有渲染延迟，双击可触发两次 `handleGenerateImage`。
- **修复**: 用 ref 同步守卫，`if (isDrawingRef.current) return; isDrawingRef.current = true;`。

### M11. `saveImageToPhotosAlbum` 对远程 URL 先失败再下载

- **文件**: `src/pages/upload-material/index.tsx` 行 143-169
- **描述**: `Taro.saveImageToPhotosAlbum` 只接受本地路径，对 `http` 开头的 URL 会先失败再走 catch 中的下载逻辑。
- **修复**: 先判断 URL 是否以 `http` 开头，直接走下载路径。

### M12. 微信 `share()` 未执行实际分享

- **文件**: `src/services/shareService.ts` 行 19-21
- **描述**: 微信路径直接返回 `{success: true, method: 'wechat'}` 但未调用任何分享 API。
- **修复**: 实现微信分享流程或返回 `{success: false}` 并文档说明需通过页面级 `onShareAppMessage` 处理。

### M13-M14. `friendService` 返回值可能为 undefined

- **文件**: `src/services/friendService.ts` 行 87, 92
- **描述**: `likeDiary` 返回 `liked: res.data?.liked`（可能 undefined），`commentDiary` 返回 `res.data?.comment`（可能 undefined），但类型声明为 `boolean` / `Comment`。
- **修复**: `liked: res.data?.liked ?? false`；`if (!res.data?.comment) throw new Error('评论失败')`。

### M15. `logout()` 不清缓存

- **文件**: `src/services/authService.ts` 行 189-192
- **描述**: `logout()` 只删 token 和 currentUser，不清 `memCache`，换号后缓存污染。
- **修复**: 调用 `storage.clearAll()` 或 `memCache.clear()`。

### M16. `getCurrentUser` 并发 logout 时可能用空 token 调用 `persistAuth`

- **文件**: `src/services/authService.ts` 行 79-85
- **描述**: 行 80 获取 token，行 81-83 之间如果 token 被并发 `logout()` 删除，`persistAuth(this.getToken() || '', user)` 会用空字符串持久化，撤销登出。
- **修复**: 在行 80 捕获 token 到局部变量，如果为 falsy 则跳过 persist。

### M17. `syncAll` 冷却期静默丢弃请求

- **文件**: `src/services/syncManager.ts` 行 33-56
- **描述**: 30 秒冷却期内 `syncAll` 返回 `{skipped: true, reason: 'cooldown'}`，调用方无法区分"同步完成"和"请求被跳过"。
- **修复**: 文档说明此行为，或提供 `forceSyncAll()` 方法。

### M18. `contentSafetyService` 数据层级可能不匹配

- **文件**: `src/services/contentSafetyService.ts` 行 55-66
- **描述**: `uploadFile` 返回值直接传给 `assertSafeResponse(data)`，但远程 URL 路径传 `response.data`。如果 `uploadFile` 返回的层级不同，安全检查可能失效。
- **修复**: 添加类型注解或运行时检查确保数据层级一致。

### M19. `volcanoService` ratio 重复

- **文件**: `src/services/volcanoService.ts` 行 193-211
- **描述**: `ratio` 同时出现在请求体顶层和 `parameters` 内，可能导致服务端行为不确定。
- **修复**: 根据服务端 API 契约移除重复字段。

### M20. `deleteAllCatsFromServer` 未调用 / `deleteAllDiariesFromServer` 空函数

- **文件**: `src/services/storage.ts` 行 353-385
- **描述**: 两个函数均为死代码，`clearAll()` 不调用它们，账号清除时服务端数据不删除。
- **修复**: 移除死代码，或在 `clearAll()` 中接入服务端批量删除。

### M21. 在线计时器不重启

- **文件**: `src/pages/home/index.tsx` 行 186-215
- **描述**: `useDidShow` 不调用 `startOnlineTimer()`，页面隐藏后计时器停止但不再恢复。
- **修复**: 在 `useDidShow` 中调用 `startOnlineTimer()`，`useDidHide` 中清除。

### M22. 视频播放状态用 React state 管理

- **文件**: `src/pages/home/index.tsx` 行 315-403
- **描述**: `playbackState` 和 `v2LoopCount` 用 `useState`，快速点击时 `handleMainTap` 可能读到 stale state。
- **修复**: 用 `useRef` 管理播放状态，或使用函数式状态更新 + ref 守卫。

### M23. `handleClearLocalData` 不调用 `logout()`

- **文件**: `src/pages/profile/index.tsx` 行 212-221
- **描述**: 清除本地数据后 AuthContext 状态未更新，app 认为用户仍登录但存储为空。
- **修复**: 调用 auth context 的 `logout()` 再 `clearAll()`。

### M24. `handleClearCache` 用 `includes` 匹配 key

- **文件**: `src/pages/profile/index.tsx` 行 223-296
- **描述**: `preservePatterns` 用 `key.includes(p)` 匹配，子串匹配可能误删（如 `temp_auth_token` 不匹配任何 pattern）或误保留。
- **修复**: 用精确 key 匹配或前缀匹配替代 `includes`。

### M25. Canvas 导出后从 DOM 移除

- **文件**: `src/pages/add-friend-qr/index.tsx` 行 82-85
- **描述**: QR 码绘制后导出为图片，Canvas 元素从 DOM 移除。后续 `handleSaveImage` 查找 `#qrCanvas` 失败。
- **修复**: 保留 Canvas 元素（用 CSS 隐藏），或在保存时重新创建。

### M26. `safeParse` 读 + `setItem` 写的缓存不一致

- **文件**: `src/services/storage.ts`（saveFriends/saveFriendDiaries/saveSettings）
- **描述**: 这些 `save*` 方法用 `safeParse` 读（不经 `cachedRead`），但 `setItem` 写入后不调 `invalidateCache`。如果将来任何代码用 `cachedRead` 读同一 key，会返回脏数据。
- **修复**: 统一使用 `cachedRead` + `invalidateCache`，或在 `save*` 方法中显式调 `invalidateCache`。

### M27. Taro 插件路径指向目录而非文件

- **文件**: `config/index.js` 行 21
- **描述**: `plugins` 引用 `path.resolve(__dirname, '..', 'scripts', 'taro-plugin-share-timeline')` 指向目录，实际文件是 `scripts/taro-plugin-share-timeline.js`。
- **修复**: 改为 `path.resolve(__dirname, '..', 'scripts', 'taro-plugin-share-timeline.js')`。

### M28. API 契约检查脚本服务端路径错误

- **文件**: `scripts/check-api-contract.mjs` 行 7
- **描述**: 默认服务端路径 `../Miao`，实际应为 `../Miao_remote`。
- **修复**: 修改默认路径或依赖 `MIAO_SERVER_ROOT` 环境变量。

### M29. ESLint 依赖已安装但无配置文件

- **文件**: `package.json` 行 50-56
- **描述**: 安装了 eslint、eslint-config-taro 等 5 个包，但无 `.eslintrc.*` 配置文件，`lint` 脚本实际运行 `tsc --noEmit`。
- **修复**: 添加 ESLint 配置文件，或移除未使用的依赖。

### M30. `allowImportingTsExtensions` 未配 `noEmit`

- **文件**: `tsconfig.json` 行 9
- **描述**: TypeScript 要求 `allowImportingTsExtensions` 与 `noEmit` 一起使用。当前未设 `noEmit`，配置技术上无效。
- **修复**: 添加 `"noEmit": true` 或移除 `allowImportingTsExtensions`。

---

## 🔵 Low — 代码质量与维护性

### L1. `getSystemInfo` 声明 async 但用同步 API

- **文件**: `src/utils/platformAdapter.ts` 行 83
- **描述**: `async` 包裹 `getSystemInfoSync()`，不必要地返回 Promise。
- **修复**: 移除 `async` 或改用 `getSystemInfo()` 异步版。

### L2. `setClipboard` Web 无回退

- **文件**: `src/utils/platformAdapter.ts` 行 133-141
- **描述**: `navigator.clipboard` 不可用（HTTP 环境）时直接返回 `false`，无 `execCommand('copy')` 回退。
- **修复**: 添加 textarea + `execCommand('copy')` 回退。

### L3. `reLaunch` Web 路径忽略 URL

- **文件**: `src/utils/navigateAdapter.ts` 行 79-85
- **描述**: Web 路径 `reLaunch(url)` 只执行 `window.location.reload()`，忽略 `url` 参数。
- **修复**: 改为 `window.location.href = url` 或 `window.location.assign(url)`。

### L4. Canvas 导出用固定 200ms 延迟

- **文件**: `src/utils/shareCard.ts` 行 563-575
- **描述**: `canvasToTempFilePath` 用 `setTimeout(200ms)` 等待渲染完成，慢设备可能不够。
- **修复**: 用 `Taro.nextTick` 或 `canvas.requestAnimationFrame`。

### L5. `canUseDangerousDebug` 等价于 `isDebugBuild()`

- **文件**: `src/utils/debugAccess.ts` 行 40-43
- **描述**: 先检查 `canAccessAdminConsole`（debug build 直接返回 true），再检查 `isDebugBuild()`，后者必然为 true，冗余。
- **修复**: 简化为 `return isDebugBuild()`，或如果需要远程调试访问则移除 `isDebugBuild()` 检查。

### L6. 快进时间与倒计时显示不一致

- **文件**: `src/utils/timeLetterUnlock.ts` 行 8
- **描述**: `Math.ceil(totalDuration / 60)` 导致快进时间多 1ms，`formatTimeLetterCountdown` 用 `Math.ceil(remainingMs / 1000)` 向上取整到秒，可能差 1 秒。
- **修复**: 统一用 `Math.round` 或 `Math.floor`。

### L7. 冗余密码空值校验

- **文件**: `src/pages/change-password/index.tsx` 行 37-39
- **描述**: 行 32 已检查 `requiresCurrentPassword && !currentPassword`，行 37 重复检查。
- **修复**: 移除行 37-39 的冗余检查。

### L8. `unlockStartedRef` 永不重置

- **文件**: `src/pages/generation-progress/index.tsx` 行 304
- **描述**: 设为 `true` 后永不归 `false`，用户再次进入页面时"解锁全部"按钮永久禁用。
- **修复**: 在 `beginGenerationRun` 或进入 confirm 阶段时重置为 `false`。

### L9. `bootstrap` 无超时回退

- **文件**: `src/pages/welcome/index.tsx` 行 11-33
- **描述**: `syncFromServer` 失败时只 `console.warn`，导航失败时用户卡死在欢迎页。
- **修复**: 添加超时回退，超时后跳转登录页。

### L10. `safeClone` JSON fallback 丢失类型信息

- **文件**: `src/services/storage/jsonUtils.ts` 行 1-4
- **描述**: `JSON.parse(JSON.stringify())` 会丢失 `undefined`、`Date`、`NaN`、`Infinity`、函数等。
- **修复**: 始终使用 `structuredClone`（加 polyfill），或在 fallback 时添加 warning 日志。

### L11. `syncQueue` 失败任务无日志

- **文件**: `src/services/syncQueue.ts` 行 170-184
- **描述**: 任务失败时只增加 retry 计数，无 `console.warn` 或事件通知。
- **修复**: 添加 `console.warn` 或 emit 事件。

### L12. `syncQueue` 无指数退避

- **文件**: `src/services/syncQueue.ts`
- **描述**: 失败任务 5 秒后立即重试，对瞬时错误无退避策略。
- **修复**: 添加 `lastTriedAt` 检查，实现指数退避。

### L13. `videoUtils.ts` 全部使用浏览器 API 且无调用方

- **文件**: `src/lib/videoUtils.ts`
- **描述**: 使用 `HTMLVideoElement`、`document.createElement('canvas')` 等浏览器 API，小程序环境不可用。且全局搜索无任何引用。
- **修复**: 移除死代码，或实现小程序端替代方案。

### L14. `CommentItem.tsx` 未被引用

- **文件**: `src/components/common/CommentItem.tsx`
- **描述**: 组件已定义但无任何页面引用。
- **修复**: 移除或接入日记评论功能。

### L15. `sharp` 未使用

- **文件**: `package.json` 行 59
- **描述**: `sharp`（~30MB 原生模块）作为 devDependency 安装但无代码引用。
- **修复**: 从 devDependencies 移除。

### L16. `esbuild` override 版本冲突

- **文件**: `package.json` 行 66
- **描述**: `esbuild` pinned 到 `0.28.0`，但 `@tarojs/webpack5-runner` 依赖 `~0.21.0`。
- **修复**: 验证兼容性，或调整 override 版本。

### L17. `deviceRatio` 值不正确

- **文件**: `config/index.js` 行 13-17
- **描述**: `640: 2` 应为 `750/640 ≈ 1.17`，`828: 1` 应为 `750/828 ≈ 0.91`。
- **修复**: 修正为 `640: 750/640` 和 `828: 750/828`，或移除未使用的条目。

---

## 📊 统计汇总

| 严重程度 | 数量 | 关键问题 |
|---------|------|---------|
| 🔴 Critical | 5 | 缓存污染、明文密码、存储溢出、静默切换活跃猫、读操作写副作用 |
| 🟠 High | 12 | QR 编码损坏、头像不加载、导航崩溃、竞态写覆盖、队列死锁、临时文件泄漏 |
| 🟡 Medium | 30 | 空字符串丢失、头信息丢失、ID 碰撞、双击竞态、缓存不一致、配置错误 |
| 🔵 Low | 17 | 死代码、冗余检查、缺少退避/回退、类型不精确 |
| **合计** | **64** | |

---

## 🎯 修复优先级建议

### P0 — 立即修复（影响用户数据安全/完整性）

1. **C1** — `clearAll()`/`logout()` 清 `memCache`：换号后数据串号是最严重的数据安全问题
2. **C2** — `saveCatInfo` 仅新增时设置 activeCatId：后台同步干扰用户当前猫咪
3. **C4** — 移除明文密码存储：安全合规要求
4. **C5** — 视频改用文件存储：存储溢出直接导致数据丢失

### P1 — 本迭代修复（功能缺陷）

5. **H5** — `flush()` 加 try-finally：队列死锁是系统性故障
6. **H4** — 积分操作原子化：竞态覆盖导致积分丢失
7. **H6** — 临时文件清理：存储配额耗尽
8. **H3** — `getCurrentPath`/`getParams` null 守卫：非页面上下文崩溃
9. **C3** — `getPoints()` 分离读写：读操作写副作用是竞态根源
10. **H1** — QR 编码 UTF-8 支持：中文内容生成损坏的二维码
11. **H11+H12** — 生成进度页积分退回 + 确认弹窗

### P2 — 下迭代修复（功能降级）

12. **H2** — 加载头像图片
13. **H7** — 小程序端图片压缩
14. **H8+H9** — 事件适配器修复
15. **M1-M7** — 边界条件修复
16. **M15+M16** — 认证缓存一致性

### P3 — 择机修复（代码质量）

17. **L1-L17** — 低优先级清理
18. **M27-M30** — 配置修正
19. **M20** — 死代码清理
