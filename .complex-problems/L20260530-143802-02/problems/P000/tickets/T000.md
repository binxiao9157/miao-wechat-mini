# Storage/Sync 代码实施 Ticket

## Problem Definition

需要按专项计划完成小范围稳定性修复，提升同步失败任务的可观测和恢复能力，减少 TimeLetter 无变化保存导致的重复同步，并避免 cachedRead 返回对象污染内存缓存。

## Proposed Solution

1. 修改 `src/services/syncQueue.ts`：
   - 导出 `SyncTask` 类型。
   - 增加 `getPendingTasks()`、`getExhaustedTasks()`、`clearExhaustedTasks()`、`retryExhaustedTasks()`。
   - 快照返回副本，避免外部修改内部队列。
2. 修改 `src/services/storage.ts`：
   - `cachedRead()` 新解析路径返回 `safeClone()`。
   - `saveTimeLetters()` 仅对新增或内容变化的信件 enqueue upsert。
3. 修改/新增测试：
   - `syncQueue.test.ts` 覆盖 exhausted/retry/clear。
   - 新增 storage 稳定性测试覆盖 cachedRead 和 saveTimeLetters。

## Acceptance Criteria

- 新增测试失败任务状态、重试、清理。
- 新增测试 TimeLetter 无变化保存不重复同步。
- 新增测试 cachedRead 防御性副本。
- `npm test` 和 `npm run lint` 通过。

## Verification Plan

先跑 `npm test` 和 `npm run lint`，完整构建在任务 03。

## Risks

不得改变现有数据结构和服务端同步 API。

## Assumptions

SyncQueue 的新增 API 先作为服务层能力保留，后续可接入设置页或调试面板。
