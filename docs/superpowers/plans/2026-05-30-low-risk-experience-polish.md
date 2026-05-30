# Low Risk Experience Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve low-risk user experience and maintainability without touching H5 bundle-size work.

**Architecture:** Keep changes small and local. Add observable background unlock progress to cat data and surface it on Home/Switch Companion; add targeted tests at the service boundary; make legacy config harder to edit by mistake; leave H5 bundle optimization for a separate performance task.

**Tech Stack:** Taro 4, React, Vitest, Less.

---

### Task 1: Background Unlock Progress

**Files:**
- Modify: `src/services/storage/types.ts`
- Modify: `src/services/fileManager.ts`
- Modify: `src/pages/generation-progress/index.tsx`
- Modify: `src/pages/home/index.tsx`
- Modify: `src/pages/home/index.less`
- Modify: `src/pages/switch-companion/index.tsx`
- Modify: `src/pages/switch-companion/index.less`
- Test: `src/services/__tests__/fileManager.test.ts`

- [x] **Step 1: Write failing service test**

Run: `npm test -- src/services/__tests__/fileManager.test.ts`
Expected: FAIL before `unlockProgress` is supported by `FileManager.updateCatVideos`.

- [x] **Step 2: Add typed progress metadata**

Add `CatUnlockProgress` and `unlockProgress?: CatUnlockProgress` to `CatInfo`.

- [x] **Step 3: Persist progress during secondary unlock**

Update `FileManager.updateCatVideos` to accept optional progress metadata. Update `generation-progress` so secondary unlock starts at `0/3`, increments after each action, tracks failures, and clears `isUnlocking` when complete.

- [x] **Step 4: Surface progress in UI**

Show a compact unlock badge on Home and Switch Companion when `cat.isUnlocking` is true.

- [x] **Step 5: Verify**

Run:
```bash
npm test -- src/services/__tests__/fileManager.test.ts
npm run lint
npm test
```

### Task 2: Legacy Config Guardrail

**Files:**
- Modify: `taro.config.js`

- [x] **Step 1: Make historical config explicit**

Replace the historical config body with a short proxy to `config/index.js`, so future edits to `taro.config.js` cannot silently diverge from the active npm-script config.

- [x] **Step 2: Verify**

Run:
```bash
npm run build:h5
npm run build:weapp
```

### Task 3: Delivery

**Files:**
- All changed files.

- [x] **Step 1: Final checks**

Run:
```bash
git diff --check
npm audit --omit=dev --audit-level=high
```

- [x] **Step 2: Commit and push**

Run:
```bash
git add docs/superpowers/plans/2026-05-30-low-risk-experience-polish.md src/services/storage/types.ts src/services/fileManager.ts src/services/__tests__/fileManager.test.ts src/pages/generation-progress/index.tsx src/pages/home/index.tsx src/pages/home/index.less src/pages/switch-companion/index.tsx src/pages/switch-companion/index.less taro.config.js
git commit -m "feat: surface background unlock progress"
git push
```
