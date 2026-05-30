# 2026-05-30 Storage/Sync Stability Plan

## Goal

提升本地数据和服务端同步链路的稳定性、可观测性和恢复能力，不改变现有业务流程。

## 本轮实施范围

### 1. SyncQueue 失败任务可观测与恢复

- **问题**：任务重试耗尽后会保留在队列中，但外部没有稳定 API 查看、清理或重新入队。
- **改动**：
  - 导出 `SyncTask` 类型。
  - 新增 `getPendingTasks()`。
  - 新增 `getExhaustedTasks()`。
  - 新增 `clearExhaustedTasks()`。
  - 新增 `retryExhaustedTasks()`。
  - `retryExhaustedTasks()` 重置耗尽任务后主动调度 flush。
- **验证**：
  - 任务失败达到上限后出现在 exhausted 快照。
  - `retryExhaustedTasks()` 将重试次数归零并重新进入 pending。
  - `retryExhaustedTasks()` 会触发下一次 flush。
  - `clearExhaustedTasks()` 只清理 exhausted，不影响 pending。

### 2. TimeLetter 无变化保存避免重复同步

- **问题**：`saveTimeLetters()` 每次保存都会对保留列表中所有信件 enqueue upsert，即使内容没有变化。
- **改动**：
  - 参考 `saveDiaries()`，建立 previous map。
  - 仅新增或 JSON 内容变化的信件 enqueue upsert。
  - 删除检测保持原逻辑。
- **验证**：
  - 相同信件重复保存不会新增同步任务。
  - 修改后的信件保存会 enqueue upsert。

### 3. cachedRead 防御性副本

- **问题**：`cachedRead()` 在解析存储 JSON 后直接返回 parsed 对象，调用方如果修改返回对象但不保存，会污染内存 cache。
- **改动**：
  - cached 命中和新解析路径均返回 `safeClone()`。
- **验证**：
  - 第一次读取后修改返回对象，不保存；第二次读取仍返回存储中的原始值。

## 不纳入本轮

- 不拆分 `src/services/storage.ts` 文件结构。
- 不改变同步冲突合并策略。
- 不新增 UI。
- 不修改服务端 API。

## 验证清单

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run build:weapp`
- [x] 分享朋友圈 JSON 注入检查
- [x] `npm run build:h5`
- [x] `npm audit --omit=dev --audit-level=high`
- [x] `closure.py check`
- [x] `git status --short --branch`
