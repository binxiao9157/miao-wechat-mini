# Storage/Sync 稳定性专项计划 Ticket

## Problem Definition

当前系统主链路验证通过，但 `storage.ts` 和 `syncQueue.ts` 是数据一致性风险最高的区域。本轮需要制定完整计划，并在可控范围内实施小范围、高确定性的稳定性修复。

## Proposed Solution

本轮实施以下事项：

1. `SyncQueue` 增加 pending/exhausted 任务快照、失败任务清理和失败任务重新入队能力，提升同步失败后的可观测性和恢复能力。
2. `saveTimeLetters` 增加与历史数据比较，只有新增或实际变化的信件才 enqueue upsert，避免无变化保存导致重复同步。
3. `cachedRead` 对解析后的对象也返回防御性副本，避免调用方无意修改内存缓存，造成“未保存但后续读取已变化”的隐性状态污染。
4. 补充单元测试覆盖以上行为。

## Acceptance Criteria

- 形成完整计划文档。
- 代码改动限制在 `storage.ts`、`syncQueue.ts` 和测试文件。
- 新增测试覆盖失败任务状态、失败任务重试/清理、time letter 无变化保存不重复同步、cachedRead 防御性副本。
- 完整验证通过。

## Verification Plan

- `npm test`
- `npm run lint`
- `npm run build:weapp`
- 分享 JSON 检查
- `npm run build:h5`
- `npm audit --omit=dev --audit-level=high`

## Risks

- 不能改变现有同步语义；只增加可观测/恢复能力和减少冗余同步。
- 不在本轮拆分 `storage.ts`，避免扩大影响面。

## Assumptions

- 当前主线分支是继续实施目标分支。
