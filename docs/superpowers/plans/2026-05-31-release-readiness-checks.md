# Release Readiness Checks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 固化发布前检查链路，并安全降低开发工具链 audit 风险。

**Architecture:** 新增独立 Node 发布静态扫描脚本，`release:check` 通过 npm scripts 串起测试、类型检查、生产依赖 audit、双端构建和静态扫描。依赖升级只处理与 Taro runner 解耦的 TypeScript ESLint 工具链，不使用 `audit fix --force`。

**Tech Stack:** Node.js ESM scripts, npm scripts, Vitest guardrails, Taro 4.2.0.

---

### Task 1: Guard Release Scripts

**Files:**
- Modify: `src/utils/__tests__/codeQuality.test.ts`
- Modify: `package.json`
- Create: `scripts/release-static-scan.mjs`

- [ ] **Step 1: Write the failing guard test**

Add assertions that `package.json` exposes `release:scan` and `release:check`, and that `scripts/release-static-scan.mjs` includes the checks for app route registration, demo domains, debug verification logs, unused H5 dependencies, and committed WeChat URL settings.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run src/utils/__tests__/codeQuality.test.ts`

Expected: FAIL because the scripts do not exist yet.

- [ ] **Step 3: Implement scripts**

Create `scripts/release-static-scan.mjs` with Node `fs`/`path` scanning and add package scripts:

```json
{
  "release:scan": "node scripts/release-static-scan.mjs",
  "release:check": "npm test && npm run lint && npm audit --omit=dev --audit-level=high && npm run build:weapp && npm run build:h5 && npm run release:scan"
}
```

- [ ] **Step 4: Run the focused test again**

Run: `npx vitest run src/utils/__tests__/codeQuality.test.ts`

Expected: PASS.

### Task 2: Safe Dev Audit Reduction

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Upgrade only decoupled lint tooling**

Upgrade `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` to `^8.60.0`, and pin ESLint compatibility to `^8.57.1`. Do not change Taro CLI, Taro H5, Taro webpack runner, or forced webpack overrides in this task.

- [ ] **Step 2: Verify lockfile and tooling**

Run: `npm install`

Run: `npm run lint`

Expected: install succeeds and TypeScript check passes.

### Task 3: Final Verification

**Files:**
- No additional code changes expected.

- [ ] **Step 1: Run full release verification**

Run: `npm run release:check`

Expected: tests, type check, production audit, weapp build, H5 build, and release scan all pass.

- [ ] **Step 2: Re-check full audit**

Run: `npm audit --audit-level=high --json`

Expected: Remaining findings, if any, are limited to Taro/webpack runner/build chain items that require a separate Taro migration or upstream runner fix.

- [ ] **Step 3: Report status**

Report changed files, verification output, and remaining risk class. Do not include `.closure-lodestar` or `.complex-problems` artifacts in a product commit.
