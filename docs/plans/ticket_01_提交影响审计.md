# 最近大提交影响审计

## Problem Definition

近期连续提交覆盖 Taro 4 构建栈、H5 构建告警、启动/登录/上传/同步稳定性、AI 生成链路、后台调试、发布防线、首页视频模型、真机生成修复等多个系统面。真机测试已经暴露出生成链路 pending/404/provider 缓存、首页视频遮挡底部导航、积分页和 Miao 页顶部固定区域等问题。需要把最近时间跨度和改动面较大的提交逐项梳理，明确哪些改动带来收益，哪些改动引入或暴露风险，并形成后续修复计划。

## Proposed Solution

基于 `git log`、`git show --stat`、关键文件 diff、现有真机反馈和本地未提交修复，整理一份审计报告。报告需要覆盖最近大范围提交的修改内容、影响面、关联真机问题、风险等级、已修复状态、待修复项和验证方式。审计结果同步到 `findings.md` 或专门的发布回归报告文件，并作为后续回归修复任务的输入。

## Acceptance Criteria

- 列出最近时间跨度和改动面较大的提交，至少覆盖 Taro 升级、稳定性生命周期、生成链路、首页视频模型、发布防线、真机 release flow、catId 路由等提交。
- 每个提交或提交组说明修改内容、正向收益、潜在影响、已暴露问题、风险等级。
- 将真机问题映射到具体提交或代码结构，避免泛泛归因。
- 输出一份可执行开发计划，按 P0/P1/P2 标注修复顺序和验证方式。
- 明确哪些问题已在本地修复，哪些还需要补防线或真机验证。

## Verification Plan

- 使用 `git log --stat`、`git show --stat`、`git diff` 生成证据。
- 检查受影响文件：`src/pages/home`、`src/custom-tab-bar`、`src/pages/generation-progress`、`src/pages/profile`、`src/pages/points`、`src/utils/navigateAdapter`、发布脚本。
- 对已修复项运行现有测试、lint 和 `build:weapp`，并将结果纳入后续发布验证任务。

## Risks

- 真机渲染层问题无法完全由单元测试覆盖，需要保留真机验证清单。
- Closure/Lodestar 历史任务文件可能存在旧任务残留，报告需要聚焦当前三项任务，避免被旧上下文干扰。
- 大提交之间存在叠加效应，单一提交归因只能按证据判断，不能替代真机回归。

## Assumptions

- 本轮目标只针对 `miao-wechat-mini` Taro 小程序，不切换到原生小程序或 Miao_App 服务端。
- 用户最近真机反馈是当前最高优先级验收依据。
- 已有本地未提交修复可以作为本轮回归修复任务的输入继续验证。
