# Debug Console Design

## Goal

Keep enough diagnostics for real release troubleshooting while removing the current risk where hidden local taps expose Mock mode, points cheat, fast-forward, AI profile editing, and preset management to normal production users.

## Scope

This design covers the mini program client only. It does not require backend changes to be merged first, but it adds optional user fields that the backend can return later: `debugAllowed`, `debugRole`, and `debugExpiresAt`.

## Architecture

The client has two debug surfaces:

- `diagnostics`: safe production diagnostics. This page can exist in the normal release bundle and only exposes read-only or low-risk actions.
- `admin-settings`: dangerous debug console. This page is included only in admin/debug builds and is additionally guarded at runtime.

All debug decisions go through one module: `src/utils/debugAccess.ts`. Pages and services must not read `process.env` directly for debug policy.

## Access Model

Build-time flags:

- `TARO_APP_ENABLE_ADMIN=true`: include admin console route in the bundle.
- `TARO_APP_DEBUG_BUILD=true`: enable local dangerous debug capabilities for dev or staging packages.

Runtime user fields:

- `debugAllowed`: backend-authorized debug access.
- `debugRole`: `developer`, `operator`, `support`, or `none`.
- `debugExpiresAt`: optional Unix timestamp in milliseconds. Expired access is ignored.

Rules:

- Diagnostics is always accessible.
- Admin route is accessible when the admin bundle is enabled and either debug build is enabled or the current user has valid `developer`/`operator` debug authorization.
- Dangerous toggles are allowed only in debug builds. Normal production release builds force them off even if stale local storage says otherwise.

## Feature Behavior

Profile 5-tap no longer navigates directly to admin settings. It opens diagnostics. Diagnostics may show an admin entry only when `canAccessAdminConsole(user)` is true.

Safe diagnostics includes:

- app version, environment, API base URL, AI provider
- current auth state and user identity summary
- active cat count and active cat id
- pending and exhausted sync queue counts
- local cache key count
- low-risk queue actions: flush now, retry exhausted, clear exhausted

Admin settings remains the home for:

- AI profile editing
- preset cat editing
- Mock mode
- points cheat
- time fast-forward

Admin settings must render an access-denied screen when runtime access is not allowed.

## Release Guarding

`aiConfig.getProfile()` must return `mockMode: false` when dangerous debug storage is disabled. `aiConfig.saveProfile()` must not persist `mockMode: true` in normal release builds.

Storage-level dangerous flags must also be release guarded:

- `storage.getIsFastForward()` returns `false` unless dangerous debug storage is enabled.
- `storage.setIsFastForward(true)` is ignored unless dangerous debug storage is enabled.
- `storage.getIsPointsCheat()` returns `false` unless dangerous debug storage is enabled.
- `storage.setIsPointsCheat(true)` is ignored unless dangerous debug storage is enabled.

Mock video/image responses must not use third-party demo URLs. Debug mock responses use local mock scheme strings only, and release builds cannot reach them because `mockMode` is forced off.

## Testing

Add unit tests for:

- debug access matrix
- AI Mock mode forced off in release
- dangerous storage flags forced off in release
- auth normalization preserves debug authorization fields
- code-quality guards preventing admin route from being unconditional and preventing demo media URLs in AI service

Run:

- `npm test`
- `npm run lint`
- `npm run build:weapp`
- `git diff --check`

