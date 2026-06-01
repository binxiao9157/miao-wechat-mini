# PWA 与小程序差异矩阵分析

## Summary

`Miao` 当前就是 PWA/全栈主工程。它近期更新后，小程序与 PWA 的“页面覆盖率”仍然很高，但“核心猫咪生成与互动业务逻辑”已经出现明显分叉。

最大差异不是登录、日记、积分这些常规模块，而是 PWA 已经升级到“首帧确认图 + 四段式视频状态机 + 前后帧约束 + 首页剧情流播放”的新模型；小程序当前仍是旧的 `idle/tail/rubbing/blink` 多动作视频模型。

## 差异矩阵

| 业务域 | PWA 当前状态 | 小程序当前状态 | 差异等级 | 同步可行性 | 建议 |
|---|---|---|---|---|---|
| 工程定位 | React 19 + Vite + Express，全栈/PWA 主工程 | Taro 4 + React，微信端客户端 | 平台差异 | 不需要完全一致 | 保持双端架构，服务端能力以 PWA `server.ts` 或独立后端为准 |
| 页面覆盖 | 登录、注册、创建、生成、首页、日记、时光、积分、个人中心、后台等完整 | 页面基本覆盖，并额外有 `cat-start`、`join-friend`、微信隐私能力入口 | 低 | 已基本对齐 | 页面层不作为本轮重点 |
| 猫咪视频动作模型 | `v1_approach`、`v2_wait`、`v3_return`、`v4_fetch` 四段剧情流 | `idle`、`tail`、`rubbing`、`blink` 旧动作模型 | 高 | 可同步，但需改数据模型、生成流程、首页播放器 | P0/P1，属于最新 PWA 核心体验 |
| AI 视频提交参数 | 支持 `first_frame`、`last_frame`、`has_last_frame`，按动作传 duration | 小程序 `submitTask` 只接收单图和 prompt，不支持显式首尾帧 | 高 | 可同步，前端改造中等，真机验证成本高 | P0，先扩展 `VolcanoService.submitTask` 签名 |
| 视频生成 Waterfall | V1 完成后提取尾帧，V2 用 V1 尾帧首尾锁定，V3/V4 用 V2 尾帧到锚点图 | 后台串行生成 `tail/rubbing/blink`，没有尾帧提取和闭环约束 | 高 | 部分可同步；小程序本地提帧能力受限 | P1，推荐优先服务端提帧，或后端返回尾帧 |
| 首页播放器 | 四个 video 堆叠，状态机切换 `READY/PLAYING_V1/LOOPING_V2/PLAYING_V3/PLAYING_V4` | 单个 Taro `<Video>`，按 `currentAction` 切换视频源 | 高 | 可同步，但需重构首页播放层 | P1，需保留微信视频组件限制下的降级策略 |
| 视频持久化 | `/api/persist-video` 严格失败抛错，已保存 `/uploads` 直接复用 | `/api/v1/assets/persist-video` 严格失败抛错，已具备本地 URL 归一化 | 中 | 已部分同步 | 保留小程序当前更稳健实现，并适配新 action key |
| CatInfo 数据模型 | `videoPaths` 只声明 v1-v4；有 `actionGenerationError` | `videoPaths` 是旧 action key；有 `generationStatus`、`unlockProgress` | 高 | 可合并，需兼容旧用户数据 | P0/P1，新增 v1-v4，同时保留旧 key 读取兼容 |
| 生成失败反馈 | 后续动作失败写 `actionGenerationError`，首页气泡展示 | 主生成失败写 `generationError`；后续动作显示 `unlockProgress.failed` | 中 | 可融合 | P1，小程序可引入 `actionGenerationError` 或复用 `generationError` |
| 积分兑换 | `deductPoints` 不足时自动补足差额，偏商演/内测体验 | 严格不足则失败，且有 transactionId 防重复扣除 | 中 | 业务决策项 | 不建议直接同步自动补足到正式版；商演版可通过 debug 开关同步 |
| 兑换草稿恢复 | PWA `GenerationDraft.pointsDeducted` 避免刷新重复扣分 | 小程序当前通过页面参数和本地猫状态控制，没有同等草稿字段链路 | 中 | 可同步 | P2，正式稳定性可做 |
| 管理后台 | 有 `adminService`，支持 stats/users/feedback/points/delete，后端 `ADMIN_TOKEN` 可 env 配置 | 只做本地 AI 配置、预设猫、调试开关；无 adminService | 高 | 技术可同步，但产品上不建议普通小程序暴露 | P1/P2，建议生产隐藏或强服务端鉴权，不建议完整搬进用户端 |
| 内容安全 | 未发现 `/api/v1/security/*` 后端接口 | 小程序前端已接入 `/api/v1/security/text/media/media-file` | 高 | 必须后端补齐 | P0，上架闭环必须先补服务端 |
| 隐私授权 | PWA 不适用微信隐私授权 | 小程序已加 `ensurePrivacyAuthorized` | 平台差异 | 不需要同步到 PWA | 小程序保留，需真机验收 |
| 登录认证 | PWA 主要用户名密码，兼容本地旧账号迁移 | 小程序有密码、微信登录、手机号登录、401 统一登出 | 平台差异/小程序更强 | 不需要完全一致 | 小程序当前更适合微信生态 |
| 深度链接/扫码 | PWA 支持 `miao://`、`join-friend` fallback、html5-qrcode | 小程序支持 `scanCode`、二维码、`join-friend` 页面 | 平台差异 | 业务已对齐 | 保持平台实现差异 |
| 日记/好友/评论/通知 | 两端主流程基本一致 | 小程序有更强同步队列、轮询、乐观回滚修复 | 低/中 | 小程序已不弱于 PWA | 暂不作为同步重点 |
| PWA 离线能力 | Service Worker、manifest、安装提示 | 小程序不适用 | 平台差异 | 不同步 | 不处理 |

## 最近 PWA 更新的同步状态

### 尚未同步到小程序的核心更新

1. 四段式猫咪互动视频状态机。
2. 新动作 key：`v1_approach`、`v2_wait`、`v3_return`、`v4_fetch`。
3. `first_frame` / `last_frame` / `has_last_frame` 参数链路。
4. V1/V2 尾帧提取和 V2 首尾帧锁定逻辑。
5. 首页四视频堆叠切换播放体验。
6. 后续动作生成失败通过首页气泡反馈。
7. PWA 最新中文视频 prompt 与 V2 4 秒、V1/V3/V4 7 秒业务约束。
8. 管理后台服务化和远程用户/反馈/积分管理。

### 已部分同步或小程序已有更强实现

1. 视频持久化失败显式报错：小程序已有 `/api/v1/assets/persist-video` 严格失败。
2. 生成生命周期稳健性：小程序已有 abort、runId、失败状态、积分退还。
3. 同步队列：小程序比 PWA 更完整。
4. 401 统一登出：小程序已完成。
5. 微信隐私授权与内容安全前端拦截：小程序新增，PWA 无对应平台要求。

## 优先级判断

### P0：必须先补，否则对齐后仍可能不可用

1. 后端补齐 `/api/v1/security/text`、`/api/v1/security/media`、`/api/v1/security/media-file`。
2. 确认当前小程序生产域名对应的服务端是否就是 `Miao/server.ts` 最新部署。
3. 为小程序 `VolcanoService.submitTask` 增加 first/last frame 和 `has_last_frame` 入参能力，并确保 `/api/v1/ai/tasks`、`/api/v1/ai/tasks-file` 服务端兼容。
4. CatInfo 数据模型加入 v1-v4 key，并保留旧 key 兼容，避免旧用户猫咪无法播放。

### P1：核心体验同步

1. 小程序生成流程切换到 V1 首段生成。
2. 小程序后续动作从 `tail/rubbing/blink` 切换到 `v2_wait/v3_return/v4_fetch`。
3. 首页播放器改造成微信端可行的剧情状态机。
4. 首页展示完整剧情流解锁完成/失败提示。
5. 同步 PWA 最新 AI prompt、duration、ratio/resolution 语义。

### P2：管理与商演体验同步

1. 管理后台是否同步 PWA 的 stats/users/feedback/points 管理，需要先定产品边界。
2. 积分不足自动补足只建议做成商演/内测开关，不建议进入正式生产默认逻辑。
3. 草稿恢复和重复扣分保护可增强小程序生成流程。
4. 小程序可保留 `unlockProgress`，PWA 的 `actionGenerationError` 可吸收进小程序字段体系。

## 同步可能性结论

同步可行，但不建议直接复制 PWA 代码。原因是 PWA 依赖浏览器 `video/canvas` 提帧、DOM video 堆叠、React Router state；小程序依赖 Taro 文件、微信 Video 组件和受限 Canvas/文件系统。

推荐同步方式是“业务语义对齐，平台实现分叉”：

- 共享动作模型、prompt、接口协议、数据字段。
- PWA 继续用浏览器提帧和 video 堆叠。
- 小程序优先把提帧能力下沉到服务端，或在后端生成任务返回可复用尾帧。
- 两端都以 v1-v4 为新主模型，旧 idle/tail/rubbing/blink 作为兼容播放，不再作为新生成目标。
