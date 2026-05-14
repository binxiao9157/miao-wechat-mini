# Task 06: 信件删除同步队列闭环

## Context

`sync-queue.js` 目前只支持入队/持久化，未被任何业务调用。时光信件删除也只删除本地，下一次从服务端同步可能又恢复。目标是用信件删除作为第一条闭环：本地删除立即生效，服务端删除失败时进入队列，前台同步时重试。

## Files

- `miniprogram/services/sync-queue.js`
- `miniprogram/services/content-store.js`
- `miniprogram/services/sync-manager.js`
- `miniprogram/pages/time-letters/index.js`

## Steps

- [x] Step 1: 扩展 `sync-queue` 的 remove/process 能力，支持成功移除和失败重试计数。
- [x] Step 2: 在 `content-store` 增加信件删除 tombstone、服务端删除和 pending sync 处理。
- [x] Step 3: `sync-manager.syncAll()` 同步前处理 pending task，避免已删信件被服务端拉回。
- [x] Step 4: 修改时光信件页面删除逻辑调用 service，并给出同步失败但本地已删除的反馈。
- [x] Step 5: 运行 `npm run check:native`，记录验证结果。

## Verification

- 2026-05-14 `npm run check:native` 通过：`native scaffold ok: 36 json files, 56 modules`。
- 2026-05-14 使用 Node 直接验证 `SyncQueue.process()`：失败时 retries 递增并保留任务，成功时移除任务。

## Acceptance Criteria

- 删除信件后本地列表立即移除。
- 服务端删除失败时保留 tombstone，不会被下一次 `syncLettersFromServer` 拉回。
- 前台同步会重试 pending letter delete，成功后移除队列。
- 静态检查通过。
