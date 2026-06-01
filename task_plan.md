# Task Plan

## STATUS

- **Goal:** 按正式发布前代码审计标准全量扫描小程序工程，覆盖异常路径、运行时兼容、数据安全、API 契约、资源性能、死代码和依赖风险，并修复可确认问题
- **Mode:** Execute
- **Phase:** Release Audit
- **Task:** docs/plans/task_06_正式发布前全量审计.md
- **Blockers:** None

## Key Decisions

- Closure Lodestar is active: Lodestar files are the project-level source of truth.
- Recursive Closure ledgers are task-level closure engines under `.complex-problems/`.

## Scope

To be refined in docs/plans/task_N.md files.

## Recovery

On resume, read this file, `findings.md`, `progress.md`, `docs/plans/impl_plan_index.md`, and `.closure-lodestar/task-ledgers.json`; then run:

```bash
python3 ~/.codex/skills/closure-lodestar/scripts/recover.py --workspace .
```
