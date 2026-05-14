# Task Plan: 原生微信小程序系统分析与优化开发

## ⚡ STATUS
- **Goal:** 系统分析当前原生微信小程序功能、问题与优化点，产出完整分析文档和开发计划，并按计划逐步实现代码优化。
- **Current Mode:** Review
- **Current Phase:** Phase 6: 第二批代码审查与收尾
- **Current Task:** Review 第二批优化改动
- **Blockers:** None
- **Last Updated:** 2026-05-14

## 🔑 Key Decisions（关键决策，最多 5 条）
| 决策 | 理由 | 决策时模式 |
|------|------|-----------|
| 分析和改动以 `native-weapp` 原生小程序工程为准 | 当前目录 `Miao_remote` 是 PWA 项目；真正小程序工程位于 `miao-wechat-mini/native-weapp` | Explore |
| 先产出系统分析文档，再生成可执行任务计划，最后逐步开发 | 用户要求同时包含完整 MD、优化计划和代码实现；先审计可避免盲改 | Explore |
| 代码改动优先选择低风险、可验证、跨页面收益高的优化 | 原生小程序页面较多，应先处理通用逻辑/体验问题 | Explore |

## ⚠️ Active Risks（活跃风险）
| 风险 | 缓解措施 | 状态 |
|------|---------|------|
| 小程序工程页面多，单次大改容易引入回归 | 分阶段实施，每个 Task 限定文件范围并运行检查脚本 | active |
| 缺少真实微信开发者工具运行环境 | 通过静态检查、项目脚本和代码审查验证，必要时给出手工验收清单 | active |
| 旧迁移文档可能与当前代码不完全一致 | 以当前 `native-weapp` 代码为唯一依据，旧文档仅作为参考 | active |

---

## Phases（阶段）

### Phase 1: 功能与架构审计
- [x] 初始化 Lodestar 文件和工作上下文
- [x] 扫描小程序页面、服务、工具层、现有文档
- [x] 产出完整分析 MD 文档
- **Status:** completed

### Phase 2: 开发优化计划
- [x] 基于审计结果拆分可验证 Task
- [x] 创建 `docs/plans/impl_plan_index.md`
- [x] 创建 `docs/plans/task_N.md`
- **Status:** completed

### Phase 3: 逐步实现与验证
- [x] 按 Task 执行代码改动
- [x] 每个 Task 运行检查并记录结果
- [x] 完成后进入 Review
- **Status:** completed

### Phase 4: 代码审查与收尾
- [x] 检查 git diff 是否符合计划范围
- [x] 执行最终静态检查
- [x] 更新文档与最终总结
- **Status:** completed

### Phase 5: 第二批系统优化开发
- [x] Task 04 首页动作入口可见化
- [x] Task 05 兑换生成扣分持久化
- [x] Task 06 信件删除同步队列闭环
- [x] 完成后进入 Review
- **Status:** completed

### Phase 6: 第二批代码审查与收尾
- [x] 检查第二批 git diff 是否符合计划范围
- [x] 执行最终静态检查
- [x] 更新分析文档与最终总结
- **Status:** completed

---

## Key Questions（待解答问题）
1. 当前小程序已实现哪些用户功能、后台/调试功能和数据同步能力？
2. 哪些问题最影响功能正确性、业务可维护性和移动端交互体验？
3. 第一批代码优化应选择哪些低风险且收益明显的任务？

## Errors Encountered（错误记录）
| 错误 | 尝试次数 | 解决方案 | 阶段 |
|------|---------|---------|------|
| 心跳请求未在短时间内返回 | 1 | 按技能约束不阻塞主流程，继续执行任务 | Explore |

## Notes（备注）
- 用户明确要求：完整分析 MD 文档、开发优化计划、逐步实现代码开发。
- 本轮不自动提交，除非用户后续明确要求。
