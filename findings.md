# Findings

## Active Context

- Goal: 遍历 miao-wechat-mini 工程，识别稳定性/健壮性/维护性优化点，形成详细开发计划并逐步实施验证
- Closure Lodestar mode: Lodestar outer protocol plus recursive task ledgers.

## Explore Progress

- Initialized project memory.

## Confirmed Requirements

- 遍历 miao-wechat-mini 工程，识别稳定性/健壮性/维护性优化点，形成详细开发计划并逐步实施验证

## Constraints

- Keep Lodestar Markdown as project-level source of truth.
- Keep recursive `.complex-problems/` as task-level closure state.

## Available Skills

- Lodestar
- Closure Lodestar ledger engine
- closure-lodestar

## Technical Decisions

- Use `.closure-lodestar/task-ledgers.json` to map Lodestar task files to recursive ledger IDs.

## Issues

- None recorded.
# 2026-05-30 工程稳定性巡检发现

## 当前基线

- `npm test`：7 个测试文件、15 个用例通过。
- `npm run lint`：通过。
- `npm audit --omit=dev --audit-level=high`：通过，`found 0 vulnerabilities`。
- 工程主线：Taro 4.2.0 + webpack5，当前分支与 `origin/master` 对齐后开始本轮巡检。

## 本轮建议实施项

1. **401 处理条件过窄**
   - 证据：`src/utils/httpAdapter.ts` 和 `src/utils/uploadAdapter.ts` 只有在 `status === 401 && code === 'UNAUTHORIZED'` 时才清理登录态并派发 `auth:unauthorized`。
   - 风险：服务端返回纯 401、不同错误码或网关标准 401 时，前端可能只展示错误，不触发统一登出，导致用户停留在过期会话。
   - 建议：所有 HTTP/upload 401 都应清理本地 token/current user 并触发统一登出事件，错误文案仍保留服务端 message。

2. **H5 fetch 超时定时器缺少 finally 清理**
   - 证据：`src/utils/httpAdapter.ts` 的 H5 分支只在 `fetch` 成功返回后 `clearTimeout(timeoutId)`。
   - 风险：fetch 在网络错误、JSON 解析前异常等路径 reject 时，timeout timer 继续存活，造成无意义 abort 和潜在资源泄漏。
   - 建议：将 `clearTimeout(timeoutId)` 放进 `finally`。

3. **前台同步缺少统一错误兜底**
   - 证据：`src/app.tsx` 中 `Taro.onAppShow` 和 H5 `visibilitychange` 直接触发 `syncQueue.flushNow()` / `syncManager.syncAll()`，没有统一 catch。
   - 风险：同步链路未来新增抛错路径后，前台恢复可能产生未处理 Promise rejection。
   - 建议：抽出 `runForegroundSync()`，内部串联 flush 和 sync，并统一捕获日志。

4. **隐藏模板页面文件应删除**
   - 证据：`src/pages/.tsx` 是 165 字节模板页面，不在 `app.config.ts` 页面列表中。
   - 风险：不影响构建，但会干扰工程扫描、脚手架识别和维护判断。
   - 建议：删除该孤立文件。

## 暂不纳入本轮

- `src/services/storage.ts` 体量较大（约 1351 行），适合后续单独拆分 storage/server sync/cache/tombstone，而不是混入本轮小范围稳定性修复。
- H5 构建的 bundle size warning 属于性能专项，非本轮稳定性 bug。
- Taro 组件内部 `webpackExports` warning 来自上游包，当前不做本地 patch。
