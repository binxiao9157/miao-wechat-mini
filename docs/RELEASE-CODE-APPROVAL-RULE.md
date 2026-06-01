# Release Code Approval Rule

## Goal

When approving this project for release, use "ready for production release" as the target. The review must be a systematic code audit of the whole engineering project, not only a build check or happy-path validation.

## Required Scope

1. Build, type checking, tests, release scripts, dependencies, and project configuration.
2. User primary flows, exceptional paths, cancel/retry/failure recovery, and concurrency races.
3. Mini program runtime compatibility, including Taro, WeChat JSCore, native components, Canvas, Video, file system, storage, and eventCenter.
4. Data security and privacy, including sensitive local storage fields, account switching isolation, content safety APIs, and permission authorization.
5. API contracts, including whether every client-called endpoint exists on the backend and whether params, response shape, and auth behavior match.
6. Resource and performance risks, including base64 storage, temp file cleanup, image/video compression, package size, and unused dependencies.
7. Dead code, uncalled modules, H5-only code mixed into the mini program, and duplicated logic.
8. Release risks, including latest remote repository sync, release scan, WeChat project config, domain/upload/sourceMap settings.

## Required Output

For every release approval run:

1. Sync or explicitly confirm the latest related repositories first.
2. List real issues by P0/P1/P2. Do not merely repeat scanner output.
3. For each issue, include:
   - Evidence file.
   - Trigger scenario.
   - Impact.
   - Whether it truly exists.
   - Recommended fix.
4. For confirmed issues, create a concrete development plan and implement the fix directly.
5. After fixes, run lint, tests, build, release scan, API contract checks, and any focused regression tests needed by the changed risk area.
6. Commit the final code and state any remaining risks that were not handled.

## Severity Guide

- P0: Blocks release or can cause severe data loss, account leakage, payment/points corruption, security exposure, unusable generation flow, or a hard crash in normal production use.
- P1: High-impact release risk, including broken abnormal paths, runtime incompatibility, stale sync state, missing backend contract, media persistence failure, or concurrency race.
- P2: Important but not release-blocking, including misleading UI, cleanup gaps, weak diagnostics, minor performance waste, low-risk dead code, or maintainability issues.

## Execution Gate

A release approval is not complete until:

1. Latest remote code has been checked.
2. P0/P1 issues are either fixed or explicitly documented as blocked with evidence.
3. Confirmed P2 fixes that are low-risk and local are applied, or documented as deferred.
4. The full release validation command has passed.
5. The final commit hash is reported.
