# 实施与验证闭环 Ticket

## Problem Definition

需要按 `docs/plans/2026-05-30-engineering-stability-plan.md` 完成本轮稳定性修复，并证明不影响原有功能。实施必须保持小范围，优先补测试和验证。

## Proposed Solution

完成以下代码实施：

1. 修改 `httpAdapter`，所有 401 都清理登录态并派发 `auth:unauthorized`，H5 fetch timeout 使用 `finally` 清理。
2. 修改 `uploadAdapter`，所有上传 401 都触发统一登出。
3. 修改 `app.tsx`，抽出前台同步函数并统一 catch。
4. 删除未引用的 `src/pages/.tsx`。
5. 补充单元测试覆盖纯 401 和 fetch reject timer 清理。
6. 完整验证并提交推送。

## Acceptance Criteria

- 新增/更新测试覆盖 HTTP 401、upload 401、H5 fetch reject timer 清理。
- `npm test`、`npm run lint`、`npm run build:weapp`、`npm run build:h5`、`npm audit --omit=dev --audit-level=high` 均通过或有明确非阻断说明。
- 分享朋友圈 JSON 注入仍通过。
- 本地工作区最终干净，提交推送到 `origin/master`。

## Verification Plan

按计划文档 checklist 执行所有命令，并将结果回写计划文档与 Closure ledger。

## Risks

- `webpack@5.104.1` 与 Taro 4 构建目前已验证过，但改动后仍需重新跑双端构建。
- H5 构建可能保留 bundle size warning，该 warning 不是本轮阻断项。

## Assumptions

- 允许直接提交并推送本轮稳定性修复。
