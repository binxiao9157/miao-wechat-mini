# Debug Console Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safer debug console model with production-safe diagnostics, guarded admin settings, and release guards for Mock/cheat/fast-forward behavior.

**Architecture:** Add a single debug access policy module and route all debug page visibility plus dangerous service flags through it. Keep diagnostics safe in production, while admin settings becomes debug-build or backend-authorized only.

**Tech Stack:** Taro 4.2, React 18, TypeScript, Vitest.

---

### Task 1: Debug Access Policy

**Files:**
- Create: `src/utils/debugAccess.ts`
- Test: `src/utils/__tests__/debugAccess.test.ts`

- [ ] Write tests covering diagnostics access, admin bundle gating, debug build access, remote authorization, expired authorization, and dangerous debug storage.
- [ ] Implement `debugAccess.ts` with `canAccessDiagnostics`, `canAccessAdminConsole`, `canUseDangerousDebug`, `isAdminBundleEnabled`, and `isDangerousDebugStorageEnabled`.
- [ ] Run `npm test -- src/utils/__tests__/debugAccess.test.ts`.

### Task 2: Auth Debug Fields

**Files:**
- Modify: `src/services/storage/types.ts`
- Modify: `src/services/authService.ts`
- Test: `src/services/__tests__/authService.test.ts`

- [ ] Extend `UserInfo` with optional `debugAllowed`, `debugRole`, and `debugExpiresAt`.
- [ ] Normalize backend user payloads into these fields.
- [ ] Add auth test proving debug authorization survives login/current-user normalization.
- [ ] Run `npm test -- src/services/__tests__/authService.test.ts`.

### Task 3: Release Guards For Dangerous Flags

**Files:**
- Modify: `src/services/aiConfig.ts`
- Modify: `src/services/storage.ts`
- Test: `src/services/__tests__/debugReleaseGuards.test.ts`

- [ ] Add failing tests that release mode forces `mockMode`, `isFastForward`, and `isPointsCheat` to false.
- [ ] Add failing tests that debug build can persist and read the same flags.
- [ ] Implement guards by using `isDangerousDebugStorageEnabled()`.
- [ ] Run `npm test -- src/services/__tests__/debugReleaseGuards.test.ts`.

### Task 4: Diagnostics Page And Safer Navigation

**Files:**
- Create: `src/pages/diagnostics/index.tsx`
- Create: `src/pages/diagnostics/index.less`
- Modify: `src/app.config.ts`
- Modify: `src/pages/profile/index.tsx`

- [ ] Add diagnostics route to app config.
- [ ] Make admin route conditional on `TARO_APP_ENABLE_ADMIN=true` or `TARO_APP_DEBUG_BUILD=true`.
- [ ] Change profile 5-tap target from admin settings to diagnostics.
- [ ] Implement diagnostics UI with safe build/user/cache/sync information and low-risk sync queue actions.

### Task 5: Admin Runtime Guard And Demo URL Removal

**Files:**
- Modify: `src/pages/admin-settings/index.tsx`
- Modify: `src/services/volcanoService.ts`
- Test: `src/utils/__tests__/codeQuality.test.ts`

- [ ] Add runtime access denied screen to admin settings when `canAccessAdminConsole(user)` is false.
- [ ] Hide dangerous switches unless `canUseDangerousDebug(user)` is true.
- [ ] Replace Mock demo URLs in AI service with non-network mock scheme strings.
- [ ] Add code-quality tests preventing unconditional admin route and third-party demo URLs in `volcanoService.ts`.

### Task 6: Final Verification

**Files:**
- All touched files

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build:weapp`.
- [ ] Run `git diff --check`.
- [ ] Scan `dist` for `w3schools`, `picsum`, `unsplash`, and unconditional admin route leaks.

