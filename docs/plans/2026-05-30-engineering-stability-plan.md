# 2026-05-30 Engineering Stability Plan

## Goal

在不改变原有业务流程和页面体验的前提下，修复巡检中发现的高确定性稳定性问题，并用测试、类型检查、双端构建和生产依赖审计验证。

## Scope

### 1. 401 统一登出兜底

- **目标**：所有 HTTP 401 都触发本地登录态清理和 `auth:unauthorized` 事件，不再依赖服务端必须返回 `code: 'UNAUTHORIZED'`。
- **文件**：
  - `src/utils/httpAdapter.ts`
  - `src/utils/uploadAdapter.ts`
  - `src/utils/__tests__/httpAdapter.test.ts`
  - `src/utils/__tests__/uploadAdapter.test.ts`
- **验证**：
  - 新增 H5 纯 401 响应测试。
  - 新增 upload 纯 401 响应测试。

### 2. H5 fetch timeout 清理

- **目标**：H5 fetch 成功、HTTP 错误、网络异常、JSON 解析异常路径都清理 timeout timer。
- **文件**：
  - `src/utils/httpAdapter.ts`
  - `src/utils/__tests__/httpAdapter.test.ts`
- **验证**：
  - 新增 fetch reject 后 `clearTimeout` 被调用的单测。

### 3. 前台同步错误兜底

- **目标**：App 前台恢复时的同步链路统一捕获错误，避免未来同步逻辑扩展后出现未处理 Promise rejection。
- **文件**：
  - `src/app.tsx`
- **验证**：
  - `npm run lint`
  - `npm run build:weapp`
  - `npm run build:h5`

### 4. 删除隐藏模板页面

- **目标**：删除未引用的 `src/pages/.tsx`，减少维护和扫描噪音。
- **文件**：
  - Delete `src/pages/.tsx`
- **验证**：
  - `npm run lint`
  - `npm run build:weapp`

## Out Of Scope

- 不拆分 `src/services/storage.ts`。
- 不处理 H5 bundle size warning。
- 不 patch Taro 上游 `webpackExports` warning。
- 不做 UI 或交互重设计。

## Verification Checklist

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run build:weapp`
- [x] 分享朋友圈 JSON 注入检查
- [x] `npm run build:h5`
- [x] `npm audit --omit=dev --audit-level=high`
- [x] `git status --short --branch`
