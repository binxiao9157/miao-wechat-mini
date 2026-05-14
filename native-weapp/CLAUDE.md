# Lodestar 协议合规

<!-- Lodestar 协议强化 — CLAUDE.md 优先级高于 skill，能有效防止协议偏离。 -->
<!-- 独立使用：复制到项目根目录即可。合并使用：将本文件内容追加到已有 CLAUDE.md 末尾。 -->

## 强制规则

1. **Plan 产出物不可替代**：Plan 阶段的产出物必须是 `docs/plans/impl_plan_index.md`（索引）+ `docs/plans/task_N_name.md`（步骤详情）。不要创建自定义设计文档来替代这些文件。设计思考写入 `findings.md`，实现计划必须用上述标准格式。

2. **Execute 前必须有 Plan 产出物**：进入 Execute 模式前，`impl_plan_index.md` 和至少一个 `task_N.md` 必须已创建。如果缺少这些文件，必须先完成 Plan 阶段。

3. **Step 级状态追踪不可省略**：每个 Step 执行前标记 🔵，完成后立即标记 [x]。不要批量更新多个 Step 的状态。这是会话恢复的基础。

4. **所有 Task 完成后必须进入 Review**：Execute 结束不是终点。Review（Code Review + Simplify Pass + Test Plan）是交付前的必经环节。跳过 Review 等于未经审查就交付代码。

5. **不要自作主张改变工作流**：如果 Lodestar 协议要求创建某些文件或执行某些步骤，按协议执行。不要用"我觉得没必要"来跳过协议步骤。协议存在的理由是防止上下文丢失和进度失控。

6. **范围守卫**：修改文件前确认在计划范围内。如果要修改计划外的文件，先停下来确认。

7. **Explore Gate 不可跳过**：从 Explore 切换到 Plan 前，`findings.md` 必须包含非空的：确认的需求（Confirmed Requirements）、技术决策（Technical Decisions）、约束与被否决方案（Constraints & Rejected Alternatives）。用户说"够了"不等于 Gate 通过。

8. **标记后 VERIFY 回读**：每次在 `task_N.md` 中标记 🔵 或 [x] 后，必须立即回读该文件确认标记已生效。如果未生效，重新标记并再次验证。这是最常见的合规失败点。

9. **Task 完成必须写 Checkpoint**：每个 Task 完成后，必须在 `progress.md` 中写入 Checkpoint（完成内容、关键决策、文件列表、测试结果）并更新 5 问自检。不可省略。

10. **2-Action 写盘规则**：每执行 2 次搜索/读取操作后，必须将发现写入 `findings.md` 或 `progress.md`。视觉/多模态内容必须立即写入。

11. **文件是唯一真相来源**：对话历史可能随时被压缩，磁盘文件不会。任何重要信息必须立即写入文件，不要依赖对话记忆。

12. **行动前先验证**：修改文件前先 Read，引用函数前先 Grep，声称"测试通过"前先运行并记录输出。不要基于假设操作。

13. **3-Strike 错误协议**：同一问题最多尝试 3 次，每次方法必须不同。Strike 1 → 诊断修复 → Strike 2 → 换方法 → Strike 3 → 重新审视假设 → 3 次后 → 升级给用户。

## 合规检查

运行 `bash scripts/check-protocol.sh` 可随时检查协议合规状态。

## 更多信息

详见 Lodestar skill 的 SKILL.md 和 protocols/ 目录。
