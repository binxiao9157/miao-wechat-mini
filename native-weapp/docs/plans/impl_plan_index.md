# 原生微信小程序优化实现计划

## Goal

基于 `docs/native-weapp-system-analysis.md` 的审计结论，优先修复当前原生微信小程序中可验证、低风险、高收益的问题，并保持每一步都可通过 `npm run check:native` 和明确手工路径验证。

## Architecture Guard

- 不引入新依赖。
- 不重写页面架构。
- 优先在现有 `services`/`pages` 内补齐业务一致性和校验逻辑。
- 每个 Task 完成后运行 `npm run check:native`。

## File Structure

计划内可修改文件：

- `miniprogram/pages/add-friend-qr/index.js`
- `miniprogram/services/social-store.js`
- `miniprogram/pages/feedback/index.js`
- `miniprogram/config/env.js`
- `miniprogram/services/ai-config.js`
- `miniprogram/services/volcano.js`
- `miniprogram/pages/home/index.js`
- `miniprogram/pages/home/index.wxml`
- `miniprogram/pages/home/index.wxss`
- `miniprogram/pages/generation-progress/index.js`
- `miniprogram/services/generation-tasks.js`
- `miniprogram/services/content-store.js`
- `miniprogram/services/sync-queue.js`
- `miniprogram/services/sync-manager.js`
- `miniprogram/pages/time-letters/index.js`
- `docs/native-weapp-system-analysis.md`
- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/plans/impl_plan_index.md`
- `docs/plans/task_01_friend_invite_catid.md`
- `docs/plans/task_02_feedback_error_handling.md`
- `docs/plans/task_03_ai_config_validation.md`
- `docs/plans/task_04_home_action_controls.md`
- `docs/plans/task_05_generation_redemption_transaction.md`
- `docs/plans/task_06_letter_delete_sync_queue.md`

## Task Index

| # | Status | Task | Scope | Verification |
|---|--------|------|-------|--------------|
| 01 | ✅ | 好友邀请 `catId` 透传 | `add-friend-qr`, `social-store` | `npm run check:native` 通过；手工验证所选猫信息进入邀请请求 |
| 02 | ✅ | 反馈提交失败不再伪成功 | `feedback/index.js` | `npm run check:native` 通过；模拟接口失败时页面保留输入并提示 |
| 03 | ✅ | AI 默认清晰度与参数校验 | `env.js`, `ai-config.js`, `volcano.js`, `admin-settings` 逻辑 | `npm run check:native` 通过；重置配置后默认 480P，非法值无法保存 |
| 04 | ✅ | 首页动作入口可见化 | `home/index.*` | `npm run check:native` 通过；首页可见动作按钮不遮挡底部导航 |
| 05 | ✅ | 兑换生成扣分持久化 | `generation-progress`, `generation-tasks` | `npm run check:native` 通过；退出/重试不重复扣分且失败可退款 |
| 06 | ✅ | 信件删除同步队列闭环 | `content-store`, `sync-queue`, `sync-manager`, `time-letters` | `npm run check:native` 通过；删除信件失败会排队并前台重试 |

## Out Of Scope For This Batch

- 后端缺少信件 DELETE 接口时的服务端适配。
- 首页完整新手引导系统。
- 全量离线同步队列覆盖所有业务对象。

这些内容保留在分析文档后续路线中，避免第一轮改动过大。
