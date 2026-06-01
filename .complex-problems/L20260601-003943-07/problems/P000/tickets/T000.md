# 发布验证闭环

## Problem Definition

回归修复已经完成代码实施，但必须通过全量测试、类型检查、Taro weapp 构建、发布静态扫描和后端 API 合约检查，才能认为本地产物具备再次上传真机验证的基础。

## Proposed Solution

运行本轮发布前验证命令，记录通过/失败证据。若失败，回到修复任务；若通过，输出真机验证清单和剩余风险。

## Acceptance Criteria

- `npm test` 通过。
- `npm run lint` 通过。
- `npm run build:weapp` 通过。
- `npm run release:scan` 通过。
- `npm run release:api-contract` 通过。
- 输出真机验证清单：生成后首页 tabbar、首页点击剧情、错误重试、积分/Miao 上滑、诊断/health/后端部署版本。

## Verification Plan

- 顺序运行全部发布前命令，读取 exit code 和关键输出。
- 检查 git diff/stat，确认修改范围符合本轮目标。
- 记录无法由本地自动验证覆盖的真机风险。

## Risks

- 本地 API 合约检查只能检查源码存在，不代表服务器已经部署。
- `CoverView` 视觉和微信 `Video` 行为仍需要真机验证。
- 微信开发者工具上传不在本任务自动执行，除非用户明确要求。

## Assumptions

- 本机依赖已经安装。
- 后端源码路径为默认 `../Miao`。
