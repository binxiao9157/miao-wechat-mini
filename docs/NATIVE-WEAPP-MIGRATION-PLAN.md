# Miao 原生微信小程序迁移可行性与实施方案

> 基于当前 `miao-wechat-mini` Taro React 工程整理。

## 1. 结论

迁移为原生微信小程序是可行的，但不是低成本的语法转换。当前 Taro 版本承担了从 PWA 快速迁移到微信生态的作用，已经把登录、分享、扫码、文件系统、上传、视频播放、Canvas 分享卡、同步队列等小程序能力打通；如果改为原生方案，核心收益是减少 Taro/React 运行时和构建层，获得更贴近微信平台的生命周期、包体、性能和调试体验。

建议采用“服务层复用，视图层重写”的路线：后端 `/api/v1`、数据模型、同步策略、AI 任务协议、媒体存储规则和大部分业务流程可以保留；页面、组件、状态管理、生命周期和样式需要按原生小程序重新实现。

不建议一次性推倒重写所有 32 个页面。更稳的路径是先做一个原生 MVP 分支，覆盖登录、猫咪首页、创建/上传、生成进度、日记、个人中心这条主链路，再逐步迁移时光信件、积分、好友、通知和设置页。

## 2. 当前 Taro 工程现状

当前工程规模：

| 模块 | 数量 | 说明 |
|---|---:|---|
| 页面 | 32 | `src/pages/*/index.tsx` |
| 公共组件 | 12 | `src/components/**/*tsx` |
| 服务模块 | 12 | `src/services/*.ts` |
| 工具适配器 | 10 | `src/utils/*.ts` |

关键结构：

- 应用入口：`src/app.tsx`、`src/app.config.ts`
- 自定义 TabBar：`src/custom-tab-bar/*`
- 页面视图：React Hooks + `@tarojs/components`
- 全局认证：`AuthContext`
- 小程序能力：通过 `Taro.*` 访问 `request`、`uploadFile`、`chooseMedia`、`scanCode`、`createVideoContext`、`Canvas`、文件系统、分享等
- 统一后端：`../Miao_remote/server.ts` 的 `/api/v1/*`
- 本地缓存：`Taro.getStorageSync` + `FileSystemManager`
- 同步机制：`syncQueue` 增量队列 + `syncManager` 全量同步

## 3. 与原生小程序的核心差异

| 维度 | 当前 Taro React | 原生微信小程序 |
|---|---|---|
| 视图 | TSX/JSX | WXML |
| 样式 | Less，经 Taro 构建 | WXSS，可保留 rpx 思路 |
| 状态 | `useState/useEffect/useRef/useCallback` | `data` + `setData` + 页面/组件生命周期 |
| 全局状态 | React Context | `app.globalData`、事件总线、轻量 store |
| 组件 | React 函数组件 | `Component({ properties, data, methods })` |
| 生命周期 | React Hooks + Taro Hooks | `onLoad/onShow/onHide/onUnload`、组件 lifetimes |
| 路由 | Taro 路由包装 | `wx.navigateTo/switchTab/reLaunch` |
| 请求 | `Taro.request` | `wx.request` |
| 上传 | `Taro.uploadFile` | `wx.uploadFile` |
| 分享 | `useShareAppMessage/useShareTimeline` | 页面方法 `onShareAppMessage/onShareTimeline` |
| 构建 | Taro + Webpack + React Runtime | 微信开发者工具原生构建 |
| 包体 | 包含 Taro/React 适配层 | 可显著减少运行时依赖 |

## 4. 可复用与需重写范围

### 4.1 可直接或低成本复用

| 类型 | 复用方式 |
|---|---|
| 后端 API | 继续使用 `/api/v1/auth/*`、`/api/v1/cats`、`/api/v1/diaries`、`/api/v1/ai/tasks*` 等 |
| 数据模型 | `UserInfo`、`CatInfo`、`DiaryEntry`、`TimeLetter`、`PointsInfo`、`FriendInfo` 等类型可迁移到 `miniprogram/types` |
| 业务规则 | 签到、积分、猫咪动作、信件解锁、同步合并、AI 轮询等逻辑可保留 |
| 图片资源 | 当前 PNG 图标和 logo 可继续使用，建议清理重复 SVG/PNG |
| 样式变量 | 色彩、rpx 尺寸、页面布局思路可迁移到全局 WXSS |
| Canvas 逻辑 | `shareCard.ts`、`qrCanvas.ts` 的绘制思路可保留，但需改为原生 canvas 调用 |

### 4.2 需要适配后复用

| 模块 | 当前依赖 | 原生迁移方式 |
|---|---|---|
| `httpAdapter` | `Taro.request` | 改为 `wx.request` Promise 封装 |
| `uploadAdapter` | `Taro.uploadFile` | 改为 `wx.uploadFile` Promise 封装 |
| `storageAdapter` | `Taro.getStorageSync` | 改为 `wx.getStorageSync` |
| `navigateAdapter` | `Taro.navigateTo` 等 | 改为 `wx.navigateTo` 等 |
| `platformAdapter` | `Taro.getEnv/getSystemInfoSync` | 改为 `wx.getSystemInfoSync` |
| `eventAdapter` | `Taro.eventCenter` | 实现一个轻量 `EventBus` |
| `volcanoService` | `Taro.env.USER_DATA_PATH`、文件系统 | 改为 `wx.env.USER_DATA_PATH`、`wx.getFileSystemManager()` |
| `syncQueue/syncManager` | 少量 Taro 事件 | 主逻辑可保留，事件触发改为 EventBus |

### 4.3 基本需要重写

| 模块 | 原因 |
|---|---|
| 全部页面 TSX | WXML/WXSS/JS 组件模型不同，Hook 状态无法直接复用 |
| 公共组件 TSX | 需拆成原生 `components/*/*.wxml/.wxss/.ts` |
| `AuthContext` | 原生无 React Context，需要全局 store 或 auth service + 页面订阅 |
| 自定义 TabBar | 需按微信原生 custom-tab-bar 规范重写 |
| React 依赖 | `react`、`react-dom`、`@tarojs/react`、`@tarojs/components` 都应移除 |
| H5 兼容逻辑 | 原生小程序不再需要 H5 fallback |

## 5. 推荐目标架构

建议新建并行目录或新仓库，例如 `miao-weapp-native`，避免在现有 Taro 项目里边拆边跑。

```text
miao-weapp-native/
  app.json
  app.ts
  app.wxss
  project.config.json
  sitemap.json
  miniprogram/
    pages/
      login/
      home/
      diary/
      profile/
      ...
    components/
      cat-avatar/
      diary-card/
      confirm-modal/
      page-header/
      share-sheet/
      tab-bar/
    services/
      auth.ts
      storage.ts
      sync-queue.ts
      sync-manager.ts
      volcano.ts
      friend.ts
    utils/
      request.ts
      upload.ts
      storage.ts
      event-bus.ts
      nav.ts
      media.ts
    types/
      models.ts
    assets/
```

状态管理建议：

- `app.globalData` 只放轻量全局信息：当前用户、token、启动状态。
- 复杂业务状态仍通过服务层读取本地缓存，不把所有数据塞进全局。
- 跨页面刷新用 `EventBus`，例如 `cat-updated`、`data-synced`、`auth:unauthorized`。
- 页面 `onShow` 做增量刷新，避免依赖 React 组件常驻。

## 6. 实施路线

### 阶段 0：迁移准备

目标是冻结边界，防止边迁移边变接口。

- 确认后端以 `../Miao_remote/server.ts` 为唯一服务端。
- 固化 `/api/v1` 接口契约和错误码。
- 从当前 Taro 工程抽出 `types/models.ts`。
- 建立原生工程骨架，先不迁页面。
- 建立请求、上传、存储、导航、事件总线 5 个基础工具。

验收：

- 原生工程能启动。
- `request.ts` 可调用 `/api/health`。
- token 存取、401 退出、上传鉴权链路可跑通。

### 阶段 1：认证和启动链路

优先迁移登录相关页面，因为所有业务依赖 token。

迁移页面：

- `login`
- `register`
- `reset-password`
- `set-nickname`
- `welcome`

迁移服务：

- `authService`
- 当前用户缓存
- `syncManager.syncAll()` 初始拉取

验收：

- 密码登录、注册、微信登录、手机号登录可用。
- token 过期后能自动回到登录页。
- 登录后能正确判断有猫/无猫。

### 阶段 2：猫咪主链路 MVP

这是产品最核心路径，应最早打通。

迁移页面：

- `empty-cat`
- `cat-start`
- `create-companion`
- `upload-material`
- `generation-progress`
- `home`
- `cat-player`
- `cat-history`
- `switch-companion`

重点能力：

- `wx.chooseMedia`
- `wx.getFileSystemManager`
- `wx.uploadFile`
- `wx.createVideoContext`
- AI 图片/视频任务提交与轮询
- 视频 URL 持久化
- 首页手势互动
- 积分奖励写入

验收：

- 新用户能创建或上传猫咪。
- AI 生成结果能保存为稳定视频地址。
- 退出重进后猫咪列表和视频能恢复。
- 首页点击、双击、滑动、长按动作可用。

### 阶段 3：日记与媒体系统

迁移页面：

- `diary`

迁移组件：

- `diary-card`
- `comment-input`
- `comment-item`
- `confirm-modal`
- `share-sheet`

重点能力：

- 日记发布、删除、点赞、评论。
- 图片/视频本地文件保存。
- 好友动态列表。
- 下拉刷新。
- 分享好友和朋友圈。
- Canvas 分享卡。

验收：

- 小程序发布日记后 PWA 可见。
- PWA 发布日记后小程序可见。
- 本地媒体和远程媒体都能展示。
- 分享卡生成结果可用于朋友圈。

### 阶段 4：时光、积分、个人中心

迁移页面：

- `time-letters`
- `points`
- `profile`
- `edit-profile`
- `change-password`
- `privacy-settings`
- `notifications`
- `notification-list`

验收：

- 时光信件倒计时和解锁逻辑一致。
- 积分签到、在线时长、兑换链路一致。
- 个人资料、头像上传、密码设置、注销账户可用。
- 通知列表和未读角标可用。

### 阶段 5：好友、扫码、邀请与设置页

迁移页面：

- `scan-friend`
- `add-friend-qr`
- `join-friend`
- `feedback`
- `admin-settings`
- `privacy-policy`
- `terms-of-service`
- `download`
- `accompany-milestone`

重点能力：

- `wx.scanCode`
- 二维码 Canvas 绘制。
- 邀请码解析。
- 反馈提交。
- 管理员 AI 配置。

验收：

- 扫码加好友闭环可用。
- 好友日记互动可用。
- 法务、反馈、下载、里程碑页面无阻塞问题。

### 阶段 6：性能、包体与上线治理

原生化真正的收益在这个阶段兑现。

- 按业务做分包：`auth`、`cat`、`social`、`settings`。
- 主包只保留登录、首页、TabBar、核心服务。
- 清理重复图标资源，优先保留 PNG 或统一 iconfont。
- 视频、分享卡、上传页面做真机性能测试。
- 校验 request/upload/download 合法域名。
- 接入错误上报和关键埋点。
- 检查隐私协议弹窗和权限声明。

## 7. 工作量评估

在不大改产品功能、不改后端的前提下，粗略估算：

| 方案 | 范围 | 时间 | 风险 |
|---|---|---:|---|
| 原生 MVP | 登录 + 猫咪主链路 + 日记基础 | 2-3 周 | 中 |
| 核心功能完整迁移 | MVP + 时光 + 积分 + 个人中心 + 分享 | 4-6 周 | 中高 |
| 全量等价迁移 | 32 页全部迁完，含好友/通知/设置/管理 | 6-10 周 | 高 |
| 全量迁移并优化体验 | 原生重构 + 分包 + 性能 + 真机 QA | 8-12 周 | 高 |

影响工作量的最大因素不是页面数量，而是这些能力：

- 日记媒体存储与同步。
- AI 任务上传、轮询和视频持久化。
- 分享卡 Canvas 绘制。
- 首页视频和手势互动。
- 好友动态和跨端数据一致性。

## 8. 风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 双工程长期并行 | 需求要改两遍 | 原生 MVP 稳定后冻结 Taro 版新增功能 |
| 页面重写遗漏细节 | 行为回归 | 每页建立验收清单，对照 Taro 页面逐项验收 |
| 原生 setData 粒度过大 | 性能下降 | 大列表分页、局部更新、列表项组件化 |
| 媒体文件超限 | 上传失败、缓存爆掉 | 继续保留文件系统存储、上传重试、旧媒体裁剪 |
| Canvas 差异 | 分享卡错位 | 先迁二维码/分享卡工具并真机截图校验 |
| 包体超限 | 无法上传 | 早做分包，不等全量完成后再拆 |
| 登录态和同步冲突 | 数据丢失 | 复用现有 SyncQueue 策略，先本地保存再队列同步 |
| API 契约漂移 | Taro/PWA/原生不一致 | `/api/v1` 写接口矩阵和响应示例 |

## 9. 建议迁移顺序

优先级从高到低：

1. 基础工具层：request、upload、storage、event-bus、nav。
2. 类型和数据层：models、auth、storage、syncQueue、syncManager。
3. 认证启动链路：login、register、welcome、set-nickname。
4. 猫咪主链路：create/upload/generation/home/player/history/switch。
5. 日记主链路：diary、diary-card、comment、share-card。
6. 个人中心和积分：profile、points、settings。
7. 时光信件：time-letters。
8. 好友和通知：scan、QR、join、notification-list。
9. 法务、反馈、下载、管理员等低频页面。

## 10. 是否值得迁移

建议迁移的条件：

- 小程序会成为长期主阵地。
- 后续重点是微信登录、手机号、分享、订阅消息、扫码、支付或小程序生态能力。
- 团队愿意接受一次 4-8 周的工程重构周期。
- 希望减少 Taro/React 运行时和构建层带来的包体、调试和平台差异问题。

不建议立刻迁移的条件：

- 当前目标只是验证产品或快速上线。
- PWA 和小程序仍需长期等价并行开发。
- 近期功能变化很大，业务形态还不稳定。
- 团队缺少原生小程序维护经验。

我的建议是：保留当前 Taro 版作为可用生产线，同时开一个原生 MVP 分支。不要先追求全量 32 页等价，而是用 2-3 周验证“登录 -> 创建/上传猫 -> 生成视频 -> 首页互动 -> 发日记 -> 跨端同步”这条主链路。只要这条链路在真机上明显更稳、更轻、更好调试，再继续推进全量替换。
