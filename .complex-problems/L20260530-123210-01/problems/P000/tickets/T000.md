# 工程遍历与风险识别 Ticket

## Problem Definition

需要对当前 Taro 小程序工程做一次面向稳定性、健壮性、维护性的系统巡检。巡检范围包括工程结构、依赖与构建配置、入口与路由、认证与网络请求、上传链路、本地存储与同步队列、关键页面状态处理、测试覆盖和已知构建告警。输出必须是可实施的问题清单，而不是泛泛建议。

## Proposed Solution

通过静态扫描和现有验证命令建立工程风险图谱：

1. 扫描目录结构、配置、脚本、依赖锁和测试文件，确认工程边界。
2. 遍历 `src` 下 services、utils、store、hooks、pages、components 的关键调用链。
3. 使用 `rg` 查找高风险模式，例如未捕获 Promise、裸 `Taro.request`、存储键重复、上传/认证边界、队列并发、TODO/FIXME、console、any/ts-ignore、动态 import 魔法注释等。
4. 结合 `npm test`、`npm run lint`、`npm run build:weapp`、`npm run build:h5`、`npm audit --omit=dev --audit-level=high` 的结果，把问题分为本轮应修复、需后续专项、仅观察三类。

## Acceptance Criteria

- 形成一份覆盖工程主要模块的巡检记录。
- 每个问题点说明风险、证据文件、建议动作和优先级。
- 明确本轮实施范围，避免把大规模重构混入稳定性修复。
- 不修改业务行为，除非问题能通过清晰证据证明会影响稳定性或健壮性。

## Verification Plan

- 运行 `git status --short --branch` 确认基线。
- 运行结构/模式扫描命令并记录关键发现。
- 运行测试、类型检查、双端构建和生产 audit 作为基线。
- 将巡检结论同步到 Lodestar `findings.md` 和后续计划任务。

## Risks

- 代码面较宽，容易把优化建议扩大成重构；需要限定到高确定性、小改动、高收益问题。
- 某些告警来自上游依赖或 H5 bundle 体积，不应被误判为必须立即修复的业务 bug。

## Assumptions

- 本轮主要目标是提升稳定性和健壮性，不做视觉重设计。
- 当前 `master` 是用户希望继续推进的主线分支。
