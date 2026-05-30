# Generation Progress Lifecycle Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stale generation-progress async work from updating UI, overwriting cat state, or scheduling dialogs after the page has unmounted or a newer generation attempt has started.

**Architecture:** Add a small run-session guard inside `src/pages/generation-progress/index.tsx`. Every generation attempt gets a generation id plus `AbortController`; async callbacks check the active id and abort state before writing UI/storage. Secondary unlock keeps its intended background behavior, but primary generation no longer writes after unmount or stale retry.

**Tech Stack:** React hooks, Taro 4, Vitest, Testing Library.

---

### Task 1: Reproduce stale primary generation write

**Files:**
- Create: `src/pages/generation-progress/index.test.tsx`
- Modify: `src/pages/generation-progress/index.tsx`

- [x] **Step 1: Write the failing test**

Create a test that mounts `GenerationProgress`, starts a mocked video generation, unmounts the page while `FileManager.downloadVideos` is still pending, then resolves the mocked promise and verifies post-download success side effects such as `storage.setActiveCatId` and `refreshCatStatus` do not run.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/generation-progress/index.test.tsx`
Expected: FAIL because the previous implementation still allowed the late async continuation to call `storage.setActiveCatId` after unmount.

- [x] **Step 3: Implement active-run guard**

In `src/pages/generation-progress/index.tsx`, add helpers:
- `runIdRef` increments for each primary generation attempt.
- `isActiveRun(runId, signal)` returns false when signal is aborted or the run id is stale.
- `beginGenerationRun()` aborts the previous controller, clears pending confirm dialog timers, creates a fresh controller, and returns the active run id.
- Cleanup aborts the controller, clears confirm dialog timer, and invalidates the run id by incrementing `runIdRef`.

- [x] **Step 4: Run focused test**

Run: `npm test -- src/pages/generation-progress/index.test.tsx`
Expected: PASS.

### Task 2: Guard retry from stale attempt overlap

**Files:**
- Modify: `src/pages/generation-progress/index.tsx`
- Modify: `src/pages/generation-progress/index.test.tsx`

- [x] **Step 1: Reset controller on retry**

Change `handleRetry` so every retry clears the old confirm timer, aborts the previous controller, creates a fresh `AbortController`, increments `runIdRef`, and starts generation with the new run id.

- [x] **Step 2: Guard stale callbacks**

Update primary generation code so stale or aborted runs return immediately after `submitTask`, after `pollTaskResult`, after `FileManager.downloadVideos`, inside poll progress callbacks, inside confirm dialog timers, and inside catch blocks.

- [x] **Step 3: Run focused test**

Run: `npm test -- src/pages/generation-progress/index.test.tsx`
Expected: PASS.

### Task 3: Full verification

**Files:**
- No new source files.

- [x] **Step 1: Run static checks**

Run: `npm run lint`
Expected: PASS.

- [x] **Step 2: Run full tests**

Run: `npm test`
Expected: PASS.

- [x] **Step 3: Run platform builds sequentially**

Run: `npm run build:h5`
Expected: PASS with no webpack warning block.

Run: `npm run build:weapp`
Expected: PASS.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/pages/generation-progress/index.tsx src/pages/generation-progress/index.test.tsx docs/superpowers/plans/2026-05-30-generation-progress-lifecycle-hardening.md
git commit -m "fix: harden generation progress lifecycle"
```
