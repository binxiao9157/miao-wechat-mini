# System Stability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 P0-P3 提升系统同步、异步生命周期、数据一致性、存储边界和回归测试覆盖，不改变现有业务流程和服务端 API。

**Architecture:** 先加同步结果模型和诊断出口，让调用方能区分成功、失败、跳过和并发复用；再补长轮询取消、删除墓碑生命周期和积分幂等；最后提取存储纯工具，降低 `storage.ts` 复杂度但保留现有 `storage` facade。所有行为改动按 TDD 落地。

**Tech Stack:** Taro 4.2.0, React 18, TypeScript, Vitest, existing storage/http/upload adapters.

---

## File Structure

- Modify: `src/services/syncManager.ts`
  - 返回结构化 `SyncAllResult`。
  - 复用 in-flight promise。
  - 失败时触发 `data-sync-failed`，成功时触发 `data-synced`。
- Modify: `src/services/storage.ts`
  - `syncFromServer()` 返回分区结果。
  - 删除墓碑增加 TTL 和已同步清理 API。
  - 积分操作增加幂等 key。
  - 使用提取后的 JSON 工具。
- Modify: `src/services/syncQueue.ts`
  - 删除任务成功后清理对应墓碑。
- Modify: `src/services/volcanoService.ts`
  - 轮询等待改为可 abort 的 delay。
- Modify: `src/pages/generation-progress/index.tsx`
  - 页面卸载时取消主生成轮询和后台解锁轮询。
- Modify: `src/app.tsx`
  - 前台同步监听幂等注册，避免重复 listener。
- Modify: `src/pages/login/index.tsx`, `src/pages/home/index.tsx`
  - 清理关键 timer，避免页面卸载后继续 setState。
- Create: `src/services/storage/jsonUtils.ts`
  - `safeClone()` 和 `safeJsonStringify()` 等纯工具。
- Test: `src/services/__tests__/syncManager.test.ts`
- Test: `src/services/__tests__/storageStability.test.ts`
- Test: `src/services/__tests__/syncQueue.test.ts`
- Test: `src/services/__tests__/volcanoService.test.ts`

## Task 1: P0 Sync Manager Result And Concurrency

- [x] Step 1: Write failing tests in `src/services/__tests__/syncManager.test.ts` for concurrent sync sharing one promise, cooldown skipped result, and failed subsection reporting.
- [x] Step 2: Run `npm test -- src/services/__tests__/syncManager.test.ts` and confirm the tests fail because `syncAll()` does not return structured results.
- [x] Step 3: Implement `SyncAllResult` in `src/services/syncManager.ts`.
- [x] Step 4: Run `npm test -- src/services/__tests__/syncManager.test.ts` and confirm it passes.

## Task 2: P0 Foreground Listener And Polling Lifecycle

- [x] Step 1: Write failing tests for abortable polling delay in `src/services/__tests__/volcanoService.test.ts`.
- [x] Step 2: Run the new test and confirm it fails because polling waits are not abortable.
- [x] Step 3: Add abortable delay in `src/services/volcanoService.ts`.
- [x] Step 4: Wire `AbortController` into `src/pages/generation-progress/index.tsx`.
- [x] Step 5: Make `src/app.tsx` foreground sync listener registration idempotent.
- [x] Step 6: Add cleanup for login/home timers.
- [x] Step 7: Run targeted tests.

## Task 3: P1 Tombstones, Sync Diagnostics, Points Idempotency

- [x] Step 1: Extend `src/services/__tests__/storageStability.test.ts` with tombstone TTL, tombstone clear, and idempotent points transaction tests.
- [x] Step 2: Extend `src/services/__tests__/syncQueue.test.ts` with successful remote delete tombstone cleanup.
- [x] Step 3: Run targeted tests and confirm they fail.
- [x] Step 4: Implement tombstone TTL and `clearDeleteTombstone()` in `src/services/storage.ts`.
- [x] Step 5: Implement points idempotency via optional transaction id.
- [x] Step 6: Clear tombstones after successful delete tasks in `src/services/syncQueue.ts`.
- [x] Step 7: Run targeted tests.

## Task 4: P2 Storage Pure Utility Extraction

- [x] Step 1: Create `src/services/storage/jsonUtils.ts` with `safeClone()` and `safeJsonStringify()`.
- [x] Step 2: Replace private JSON clone/stringify comparison sites in `storage.ts` and `syncQueue.ts`.
- [x] Step 3: Run storage and syncQueue tests to ensure API behavior is unchanged.

## Task 5: P3 Full Verification

- [x] Step 1: Run `npm test`.
- [x] Step 2: Run `npm run lint`.
- [x] Step 3: Run `npm run build:weapp`.
- [x] Step 4: Run share timeline JSON check.
- [x] Step 5: Run `npm run build:h5`.
- [x] Step 6: Run `npm audit --omit=dev --audit-level=high`.
- [x] Step 7: Run `git diff --check`.
- [ ] Step 8: Commit and push after verification.

## Self-Review

- Spec coverage: P0 covers sync lifecycle and long polling cancellation; P1 covers tombstones, diagnostics, and points idempotency; P2 covers storage boundary extraction; P3 covers verification.
- Placeholder scan: no TBD/TODO placeholders.
- Scope check: one stability hardening pass, no UI redesign and no server API changes.
