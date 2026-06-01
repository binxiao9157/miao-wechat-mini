# Release Audit 2026-06-01

Goal: prepare the mini program and its backend contract for a formal production release.

## Latest Code Confirmation

- `miao-wechat-mini`: fetched `origin/master`; local `master` is current at `434dad1`.
- `Miao`: fetched `origin/main`; local `main` is current at `67b7f3e`.
- The formal release approval rule now includes the Chinese production-release audit requirements and is guarded by `src/utils/__tests__/codeQuality.test.ts`.

## P0

No confirmed P0 issue was found in this pass.

## P1

### API Contract Release Gate Was Incomplete

- Evidence: `scripts/check-api-contract.mjs`; client calls in `src/services/authService.ts`, `src/services/storage.ts`, `src/services/friendService.ts`, `src/pages/feedback/index.tsx`, `src/pages/notification-list/index.tsx`.
- Trigger: backend changes or removes a non-generation endpoint such as auth, profile, cats, diaries, friends, notifications, or feedback, while `npm run release:check` still passes.
- Impact: a formal release can ship with broken user flows even though the release API contract gate reports success.
- Real: yes. The previous contract check only covered health, upload, safety, asset persistence, and AI task routes.
- Fix implemented: expanded `scripts/check-api-contract.mjs` to cover the mini program's v1 API surface and validate HTTP method plus `authRequired` expectation.
- Verification: `npm run release:api-contract` passed against `../Miao_remote/server.ts`; `npm test -- src/utils/__tests__/codeQuality.test.ts` passed.

### Public Diagnostics Write Endpoint

- Evidence: `../Miao_remote/server.ts` route `POST /api/v1/diagnostics/client-log`; client sender in `src/utils/clientDiagnostics.ts`.
- Trigger: unauthenticated clients or scripts post arbitrary diagnostics payloads.
- Impact: production logs can be spammed, and diagnostic fields such as cat id, playback state, resource host, and resource path classification are accepted without session validation.
- Real: yes. The route was registered without `authRequired`.
- Fix implemented: added `authRequired` to the backend diagnostics route and made the mini release contract gate assert that this route is protected.
- Verification: backend `npm run lint` and `npm run verify:baseline` passed; mini `npm run release:api-contract` passed.

## P2

### Release Approval Rule Needed Canonical Chinese Scope

- Evidence: `docs/RELEASE-CODE-APPROVAL-RULE.md`.
- Trigger: future release approval is performed from the repo document, but the user's required Chinese rule text is not present as the canonical rule.
- Impact: reviewers may treat release approval as a narrower build/happy-path check instead of a full production readiness audit.
- Real: yes. The document had the same intent in English, but did not include the requested Chinese approval rule verbatim enough for future local review.
- Fix implemented: added the Chinese release approval rule and a code-quality guardrail test that checks the required audit scope and output requirements.
- Verification: `npm test -- src/utils/__tests__/codeQuality.test.ts` passed as part of `npm run release:check`.

### Unused ESLint Dev Dependencies

- Evidence: `package.json`; there is no `.eslintrc.*` or `eslint.config.*`, and `npm run lint` is `tsc --noEmit`.
- Trigger: install/audit/build setup includes unused ESLint packages that are not part of any release command.
- Impact: unnecessary dependency and audit surface in a release candidate.
- Real: yes.
- Fix implemented: removed direct unused dev dependencies `eslint`, `eslint-config-taro`, `eslint-plugin-react`, `@typescript-eslint/eslint-plugin`, and `@typescript-eslint/parser`; removed the now-unused `@typescript-eslint/typescript-estree` override; updated guardrail tests.
- Verification: `npm test -- src/utils/__tests__/codeQuality.test.ts` passed; production `npm audit --omit=dev --audit-level=high` passed.

## Remaining Risks

- Full dev dependency audit still reports high vulnerabilities in Taro build-tool transitive dependencies such as `@tarojs/cli`, `@tarojs/webpack5-runner`, `@tarojs/plugin-platform-h5`, `html-minifier`, `got`, `git-clone`, `lodash-es`, and `serialize-javascript`. `npm audit fix` removed only non-required install artifacts and left no committable package changes; `npm audit fix --force` would install incompatible Taro packages. Production dependency audit is clean.
- WeChat real-device validation, upload domain whitelist, and production upload settings still require verification in WeChat DevTools and the Mini Program admin console.

## Verification Completed

- Mini: `npm run release:check` passed.
- Mini: `npm audit --audit-level=high` still reports dev-toolchain-only high vulnerabilities listed under Remaining Risks.
- Backend: `npm run lint` passed.
- Backend: `npm run verify:baseline` passed.
- Backend production dependency audit: `npm audit --omit=dev --audit-level=high` passed.
