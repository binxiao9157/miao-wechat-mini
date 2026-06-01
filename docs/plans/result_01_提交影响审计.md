# 提交影响审计执行结果

## Summary

已完成 2026-05-30 至 2026-05-31 近期大范围提交审计，并形成报告 `docs/plans/2026-06-01-recent-commit-regression-audit.md`。审计确认：真机问题来自多个系统级提交叠加，核心回归集中在微信 `Video` 原生层级、生成页初始化兼容、显式 catId 路由、`ScrollView` 页面结构和前后端发布一致性。

## Done

- 使用 `git log --numstat` 找出改动面最大的提交：`2647aaa`、`3feae21`、`43d16aa`、`b45a33a`、`a066d0d`、`732feb8`、`63d4ee0`、`d81ebb6`、`6d493fe`、`9f90453`。
- 使用 `git show --stat` 和关键文件 diff 梳理每个提交组的收益、影响和风险。
- 将真机问题映射到具体代码结构：
  - 首页底部导航消失：`63d4ee0` 多段 `Video` 模型 + 普通 tabbar 组件。
  - 首页视频上方点击/提示潜在失效：`story-touch-layer` 等 overlay 仍是普通 `View/Text`。
  - 生成 pending：`generation-progress` 初始化前异常、`AbortController` 真机兼容、catId/首帧元数据不足。
  - 积分/Miao 顶部固定：header 位于 `ScrollView` 外。
  - 404/provider 问题：前后端部署一致性和本地 AI 配置迁移。
- 输出 P0/P1/P2 开发计划。

## Verification

- 证据来自本地 git 历史、真机反馈、关键源码 diff 和现有测试文件。
- 报告已写入 `docs/plans/2026-06-01-recent-commit-regression-audit.md`。

## Gaps

- 审计任务只输出风险和计划，不替代后续代码修复与真机验证。
- 首页 cover overlay 修复需要进入下一任务实施。

## Artifacts

- `docs/plans/2026-06-01-recent-commit-regression-audit.md`
