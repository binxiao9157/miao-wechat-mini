# Implementation Plan Index

## Goal

重新检查 Miao PWA 与 miao-wechat-mini 小程序的功能与业务逻辑差异，评估同步对齐可能性

## Architecture

- Lodestar owns project status and review.
- Recursive Closure owns task-level legal transitions.

## Task Index

| # | Status | Task | File | Recursive Ledger |
|---|---|---|---|---|
| 1 | done | 扫描两端工程 | `docs/plans/task_01_扫描两端工程.md` | `L20260530-234419-02` |
| 2 | done | 差异矩阵分析 | `docs/plans/task_02_差异矩阵分析.md` | `L20260530-234419-04` |
| 3 | done | 同步方案输出 | `docs/plans/task_03_同步方案输出.md` | `L20260530-234419-05` |

## File Structure

- `task_plan.md`
- `findings.md`
- `progress.md`
- `docs/plans/impl_plan_index.md`
- `docs/plans/task_N_*.md`
- `.closure-lodestar/task-ledgers.json`
- `.complex-problems/`
