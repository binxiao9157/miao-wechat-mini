# Findings

## Active Context

- Goal: 重新检查 Miao PWA 与 miao-wechat-mini 小程序的功能与业务逻辑差异，评估同步对齐可能性
- Closure Lodestar mode: Lodestar outer protocol plus recursive task ledgers.

## Explore Progress

- Initialized project memory.
- 已完成两端工程扫描、差异矩阵和同步方案输出。

## Confirmed Requirements

- 重新检查 Miao PWA 与 miao-wechat-mini 小程序的功能与业务逻辑差异，评估同步对齐可能性

## Constraints

- Keep Lodestar Markdown as project-level source of truth.
- Keep recursive `.complex-problems/` as task-level closure state.

## Available Skills

- Lodestar
- Closure Lodestar ledger engine
- closure-lodestar

## Technical Decisions

- Use `.closure-lodestar/task-ledgers.json` to map Lodestar task files to recursive ledger IDs.
- `/Users/yxj/Documents/Codex/AiStudio/Miao` 确认为 PWA/全栈主工程，`/Users/yxj/Documents/Codex/AiStudio/miao-wechat-mini` 为 Taro 微信小程序工程。
- 两端同步策略采用“业务语义对齐，平台实现分叉”：共享动作模型、prompt、接口协议、CatInfo 字段和错误语义；PWA/小程序保留各自平台实现。
- 最近 PWA 更新中最大未同步项是 `v1_approach`、`v2_wait`、`v3_return`、`v4_fetch` 四段式视频状态机；小程序仍主要使用 `idle/tail/rubbing/blink` 旧动作模型。
- 小程序前端已接入内容安全检查，但当前扫描未在 PWA/本地服务端发现 `/api/v1/security/text`、`/api/v1/security/media`、`/api/v1/security/media-file` 后端实现，这是上架闭环风险。
- PWA 积分不足自动补足和完整管理后台能力不建议无条件同步到正式小程序，应通过产品策略、环境开关和服务端鉴权决定。

## Issues

- None recorded.
