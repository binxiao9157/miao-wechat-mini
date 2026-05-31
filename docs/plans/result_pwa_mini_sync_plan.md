# PWA 与小程序同步方案

## Summary

`/Users/yxj/Documents/Codex/AiStudio/Miao` 是当前 Miao PWA/全栈主工程，包含 React/Vite 前端与 Express 后端。`/Users/yxj/Documents/Codex/AiStudio/miao-wechat-mini` 是 Taro 微信小程序工程。

两端不适合直接代码级合并。正确策略是“业务语义对齐，平台实现分叉”：动作模型、AI prompt、接口协议、CatInfo 数据字段、积分/生成状态语义保持一致；PWA 继续使用浏览器 `video/canvas`、React Router、Service Worker，小程序继续使用 Taro、微信 Video、微信登录/隐私授权/上传能力。

最近 PWA 更新中，最需要同步到小程序的是猫咪互动视频主链路：`v1_approach`、`v2_wait`、`v3_return`、`v4_fetch` 四段式视频状态机，以及 first/last frame 约束、首页剧情播放器和后续动作失败反馈。小程序当前仍是 `idle/tail/rubbing/blink` 旧动作模型，这是当前最大业务差异。

## 同步边界

### 必须业务对齐

- 新动作模型：`v1_approach`、`v2_wait`、`v3_return`、`v4_fetch`。
- 新 prompt、duration 和生成语义：V2 4 秒，V1/V3/V4 7 秒。
- AI 任务提交协议：支持 `first_frame`、`last_frame`、`has_last_frame`。
- CatInfo 视频字段：新模型作为主字段，旧 `idle/tail/rubbing/blink` 只做兼容。
- 生成生命周期：主视频失败、后续视频失败、积分退还、状态恢复必须有可见状态。
- 内容安全：小程序前端已有拦截，后端必须补齐 `/api/v1/security/*`。

### 平台实现分叉

- PWA 的浏览器尾帧提取不直接搬进小程序；小程序优先走服务端提帧或服务端返回尾帧资源。
- PWA 的多 DOM video 堆叠不直接搬进小程序；小程序用微信 Video 能力实现等价状态机，必要时做降级。
- PWA 的 Service Worker、manifest、安装提示不迁移到小程序。
- 小程序的微信登录、隐私授权、`chooseMedia`、`uploadFile`、分享能力不反向迁移到 PWA。

### 需要产品决策

- PWA `deductPoints` 的积分不足自动补足更像商演/内测逻辑，不建议作为正式小程序默认策略。
- PWA 管理后台能力不建议完整暴露在普通小程序端；如需要，应通过服务端角色权限和生产开关控制。

## 分阶段开发计划

### P0：先补后端与协议闭环

目标：保证小程序即使开始同步新业务，也不会因为接口缺失或字段不兼容失败。

涉及模块：

- 后端：`/api/v1/security/text`、`/api/v1/security/media`、`/api/v1/security/media-file`。
- 后端：`/api/v1/ai/tasks`、`/api/v1/ai/tasks-file` 支持 `first_frame`、`last_frame`、`has_last_frame`。
- 小程序：`src/services/volcanoService.ts` 扩展 `submitTask`/文件任务签名。
- 小程序：`src/types/cat.ts`、`src/services/fileManager.ts` 支持 v1-v4 视频字段，并兼容旧 key。

关键验收：

- 小程序内容安全接口返回可用，不再只停留在前端调用。
- 旧用户已有 `idle/tail/rubbing/blink` 猫咪仍能播放。
- 新生成猫咪可写入 v1-v4 字段，不破坏旧首页。
- `npm test`、`npm run build:weapp`、`npm run build:h5` 通过。

风险：

- 生产后端如果不是 `Miao/server.ts` 最新部署，需要先确认真实服务仓库。
- 内容安全接口涉及云厂商能力或微信安全接口，需要后端密钥和部署环境配合。

### P1：同步新生成流程

目标：把新猫咪创建从旧动作模型切换到 PWA 四段式业务模型。

涉及模块：

- 小程序：`src/pages/generation-progress/index.tsx`。
- 小程序：`src/services/volcanoService.ts`。
- 小程序：`src/services/fileManager.ts`。
- 后端：视频尾帧提取或生成任务结果扩展。

推荐实现：

1. 第一阶段只生成并保存 `v1_approach`，作为新主视频。
2. 后台继续生成 `v2_wait`、`v3_return`、`v4_fetch`。
3. 尾帧能力优先放到服务端：V1 完成后服务端提取 V1 尾帧，V2/V3/V4 按 PWA 语义继续生成。
4. 小程序记录 `unlockProgress` 与 `actionGenerationError` 等价信息，首页可显示后续动作失败提示。
5. 生成失败时保持积分退还、abort、runId 防串扰逻辑。

关键验收：

- 新猫咪生成完成后至少有 `v1_approach` 可播放。
- 后台生成失败不会影响进入首页，不会导致空白猫。
- 断网、退出页面、重复进入生成页不会重复扣积分或污染旧任务。
- 真机验证上传、生成、后台解锁、失败提示。

风险：

- 微信端本地视频提帧不稳定，因此不建议把 PWA canvas 提帧逻辑硬搬过来。
- 新模型生成成本更高，需考虑积分、排队、失败重试和用户等待体验。

### P1：同步首页剧情播放器

目标：让小程序首页体验与 PWA 的四段式互动逻辑一致。

涉及模块：

- 小程序：`src/pages/home/index.tsx`。
- 小程序：`src/pages/home/index.scss`。
- 小程序：CatInfo videoPaths 读取兼容层。

推荐实现：

1. 建立微信端状态机：`READY`、`PLAYING_V1`、`LOOPING_V2`、`PLAYING_V3`、`PLAYING_V4`。
2. 优先播放新 v1-v4 字段；缺失时回退到旧 `idle/tail/rubbing/blink`。
3. 微信 Video 组件不稳定时，使用单 Video 源切换而不是强制多 Video 堆叠。
4. 点击逻辑对齐 PWA：首次触发 V1，V2 可循环等待，用户点击触发 V4，循环阈值触发 V3。
5. 视频加载失败时回退静态图和错误气泡。

关键验收：

- 新猫和旧猫均可进入首页。
- 视频切换不黑屏、不无限 loading。
- action 缺失时有降级，不影响日记、资料、积分入口。
- iOS/Android 微信真机至少各跑一次核心播放流。

风险：

- 小程序 Video 的 `onEnded`、`src` 快速切换、自动播放限制与浏览器不同，需要真机调参。

### P2：同步业务状态和商演体验

目标：补齐 PWA 最新体验里对展示有价值、但不应破坏正式逻辑的部分。

涉及模块：

- 积分服务：是否加入商演自动补足开关。
- 生成草稿：是否加入 `pointsDeducted` 恢复字段。
- 后台管理：是否只做内部入口或继续隐藏。
- 错误提示：统一 `generationError`、`actionGenerationError`、`unlockProgress.failed` 显示策略。

推荐实现：

- 积分不足自动补足只能做成环境开关，例如 demo/internal 模式，正式默认关闭。
- 后台管理只允许服务端角色授权，不在普通小程序用户入口中出现。
- 草稿恢复优先处理“重复扣分”和“生成页中断恢复”。

关键验收：

- 正式模式不会无授权加积分。
- 管理能力不可被普通用户触达。
- 用户中断生成后再次进入，状态可解释且不重复扣费。

### P3：验证、灰度和长期收敛

目标：降低迁移后的回归风险，让两端后续不再反复漂移。

建议动作：

- 抽一个共享业务规格文档：动作 key、prompt、duration、接口参数、CatInfo 字段、错误码。
- 为小程序增加新旧 CatInfo 兼容测试。
- 为生成流程增加 mocked service 测试，覆盖成功、失败、abort、重复进入。
- 发布前做灰度：旧用户保留旧动作播放，新用户走 v1-v4。
- 建立差异检查清单：PWA 改动作模型、prompt、接口协议时，小程序必须同步评审。

关键验收：

- 两端同一只新猫在业务字段上表达一致。
- 旧数据不迁移也可播放，迁移失败可回退。
- 灰度期间能统计 v1-v4 生成成功率、后续动作失败率、首页播放失败率。

## 推荐实施顺序

1. 确认生产后端仓库和部署版本，补齐内容安全接口。
2. 扩展后端 AI 任务协议，确认 `first_frame` / `last_frame` 在小程序调用链可用。
3. 小程序新增 v1-v4 数据模型兼容层，旧 key 保留。
4. 小程序生成页先切换主视频到 `v1_approach`，不立即改首页复杂互动。
5. 加服务端尾帧提取后，再打开 `v2_wait/v3_return/v4_fetch` 后台生成。
6. 首页播放器接入新状态机，并保留旧视频降级。
7. 处理商演/后台/积分等产品策略项。
8. 做真机、构建、接口和灰度验证。

## 不建议本轮直接做的事

- 不建议直接复制 PWA `GenerationProgress.tsx` 到小程序。
- 不建议在小程序端强行实现浏览器 canvas 提帧作为唯一方案。
- 不建议把 PWA 积分自动补足作为正式小程序默认逻辑。
- 不建议把 PWA 管理后台完整暴露给普通小程序入口。
- 不建议去掉旧 `idle/tail/rubbing/blink` 兼容，否则旧用户猫咪可能无法播放。

## 结论

两端功能对齐是可行的，但本轮核心不是页面补齐，而是把 PWA 最新“猫咪四段式生成和互动模型”同步到小程序。最稳的落地路线是先补后端协议和数据兼容，再迁移生成流程，最后改首页播放体验。这样可以避免新体验上线时把旧用户数据、微信端视频限制、内容安全和积分一致性一起打爆。
