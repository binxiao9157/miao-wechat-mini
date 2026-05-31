# Stability Follow-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix startup, upload-auth, profile-avatar, and sync-queue stability risks, then attempt a separate Taro dependency upgrade with full verification.

**Architecture:** Keep changes narrow and aligned with existing adapters. Startup routing stays in the existing welcome/auth flow, uploads use the existing upload adapter, auth expiry reuses `auth:unauthorized`, and sync queue fixes stay inside `SyncQueue` with behavior covered by unit tests.

**Tech Stack:** Taro 3.x/4.x, React 18, TypeScript, Vitest/jsdom, npm.

---

### Task 1: Startup Bootstrap Routing

**Files:**
- Modify: `src/app.config.ts`
- Test: `src/app.config.test.ts`

- [x] Write a failing test that asserts `pages/welcome/index` is first.
- [x] Move `pages/welcome/index` to the first page entry and keep login available.
- [x] Verify with `npm test -- src/app.config.test.ts`.

### Task 2: Profile Avatar Upload Reliability

**Files:**
- Modify: `src/pages/edit-profile/index.tsx`
- Test: `src/pages/edit-profile/index.test.tsx`

- [x] Write failing tests for temporary avatar upload and upload failure.
- [x] Replace direct `Taro.uploadFile` usage with `uploadFile({ url: '/api/v1/upload', filePath, name: 'file' })`.
- [x] Stop save when upload fails or returns no URL.
- [x] Verify with `npm test -- src/pages/edit-profile/index.test.tsx`.

### Task 3: Upload 401 Unified Logout

**Files:**
- Modify: `src/utils/uploadAdapter.ts`
- Test: `src/utils/__tests__/uploadAdapter.test.ts`

- [x] Write a failing test for 401 `{ code: 'UNAUTHORIZED' }`.
- [x] Clear `miao_auth_token`, clear `miao_current_user`, and trigger `auth:unauthorized`.
- [x] Verify with `npm test -- src/utils/__tests__/uploadAdapter.test.ts`.

### Task 4: Sync Queue Concurrency And Bad Task Protection

**Files:**
- Modify: `src/services/syncQueue.ts`
- Test: `src/services/__tests__/syncQueue.test.ts`

- [x] Write failing tests for concurrent `flushNow()` callers and malformed delete tasks.
- [x] Replace single flush resolver with a waiter array.
- [x] Validate hydrated/enqueued tasks and drop malformed delete tasks.
- [x] Verify with `npm test -- src/services/__tests__/syncQueue.test.ts`.

### Task 5: Separate Taro Dependency Upgrade

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] Inspect current/latest Taro versions with `npm outdated` and `npm view`.
- [x] Attempt Taro 4 upgrade in a separate change.
- [x] Do not keep the dependency upgrade because `npm run build:weapp` fails under Taro 4.2.0/webpack5 runner with `ProgressPlugin` schema validation, and production audit still reports `swiper` critical through `@tarojs/components`.

**Outcome:** Taro 3.6.40 is the latest Taro 3 line available from npm. A safe dependency-only audit cleanup is not available in this project shape; clearing the remaining production audit issues needs a dedicated Taro 4 migration that updates the runner/compiler stack and validates generated mini-program output.

### Task 6: Final Verification And Commit

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build:weapp`.
- [x] Run dependency audit.
- [ ] Commit and push verified changes.
