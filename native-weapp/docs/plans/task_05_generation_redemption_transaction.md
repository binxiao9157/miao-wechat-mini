# Task 05: 兑换生成扣分持久化

## Context

兑换生成新猫时，`generation-progress` 只用页面实例字段 `pointsSpent` 记录是否扣分。若生成过程中页面销毁、重启或返回编辑页，扣分/退款状态不够可靠。目标是把兑换扣分事务写入持久化生成任务缓存，避免重复扣分，并确保失败或返回编辑时可以退款。

## Files

- `miniprogram/pages/generation-progress/index.js`
- `miniprogram/services/generation-tasks.js`

## Steps

- [x] Step 1: 在 `generation-tasks` 增加 redemption 事务读写、完成、退款状态方法。
- [x] Step 2: 在生成开始前基于持久化事务判断是否已扣分，避免页面重进后重复扣分。
- [x] Step 3: 在成功、失败、返回编辑页场景更新事务状态或退款。
- [x] Step 4: 运行 `npm run check:native`，记录验证结果。

## Verification

- 2026-05-14 `npm run check:native` 通过：`native scaffold ok: 36 json files, 56 modules`。
- 2026-05-14 使用 Node 直接验证 `generationTasks` redemption 事务状态：`spent -> completed -> refunded` 可持久更新。

## Acceptance Criteria

- 同一只猫同一次兑换生成重进页面不会重复扣分。
- 生成失败会根据持久化事务退款一次。
- 返回创建页且还没有 idle 视频时会退款。
- 静态检查通过。
