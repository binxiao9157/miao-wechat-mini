# 工程遍历与风险识别执行结果

## Summary

已完成工程结构、关键链路和高风险模式巡检。当前基线测试、类型检查和生产依赖 audit 均通过。巡检发现 4 个适合本轮小范围修复的问题：401 统一登出条件过窄、H5 fetch timeout 清理不完整、前台同步缺少统一错误兜底、隐藏模板页面文件残留。

## Done

- 文件结构：`rg --files`、`find src -maxdepth 3 -type f`。
- 风险模式：`rg -n "TODO|FIXME|@ts-ignore|console\\.|any\\b|Taro\\.request|Taro\\.uploadFile|setTimeout|setInterval|Promise\\.all" src config scripts package.json`。
- 关键文件阅读：`src/utils/httpAdapter.ts`、`src/utils/uploadAdapter.ts`、`src/services/syncQueue.ts`、`src/context/AuthContext.tsx`、`src/app.tsx`、`src/services/storage.ts`。
- 基线验证：
  - `npm test`：7 个测试文件、15 个用例通过。
  - `npm run lint`：通过。
  - `npm audit --omit=dev --audit-level=high`：`found 0 vulnerabilities`。

## Artifacts

1. `src/utils/httpAdapter.ts` 和 `src/utils/uploadAdapter.ts` 的 401 清理条件依赖 `code === 'UNAUTHORIZED'`，应扩展为所有 401 都触发统一登出。
2. `src/utils/httpAdapter.ts` H5 分支 timeout timer 只在 fetch 成功后清理，应使用 `finally`。
3. `src/app.tsx` 前台同步没有统一 catch，建议抽函数集中兜底。
4. `src/pages/.tsx` 是未引用隐藏模板文件，建议删除。

## Verification

巡检结果已同步到 `findings.md`。后续任务将把这些发现转成开发计划并实施。

## Gaps

尚未实施代码修复；该部分进入后续 Lodestar 任务。
