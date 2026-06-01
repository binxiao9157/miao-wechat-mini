# Findings

## Active Context

- Goal: 审计最近大范围提交对 Taro 小程序真机体验和稳定性的影响，修复已暴露回归并建立发布防线
- Closure Lodestar mode: Lodestar outer protocol plus recursive task ledgers.

## Explore Progress

- Initialized project memory.

## Confirmed Requirements

- 审计最近大范围提交对 Taro 小程序真机体验和稳定性的影响，修复已暴露回归并建立发布防线

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
- 2026-06-01 审计报告复核：`saveCatInfo` 更新已有猫切换 active、`getPoints` 读写副作用、`syncQueue.flush` 缺少 finally、生成页 `AbortController` 不兼容卡住、日记视频同步读 base64、导航实例空引用等问题在当前 Taro 工程中真实存在；注册明文密码问题已部分缓解，但仍需在存储层做统一脱敏。
- 本轮审计修复优先处理真实存在且会影响数据隔离、生成流程、积分、媒体存储、同步队列的 P0/P1 问题；QR 编码、海报头像、事件适配器、低优先级清理拆到后续批次。

## Issues

- `docs/code-audit-report.md` 是未跟踪审计报告文件，本轮以它作为输入，不把报告本身纳入产品代码改动。
