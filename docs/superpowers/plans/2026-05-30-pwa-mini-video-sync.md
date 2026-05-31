# PWA Mini Video Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the WeChat mini program with the PWA's newer four-stage cat video workflow while preserving old user data and platform-specific behavior.

**Architecture:** Add a shared mini-side video action model that prefers `v1_approach/v2_wait/v3_return/v4_fetch` and falls back to `idle/tail/rubbing/blink`. Extend the AI task protocol to carry first/last-frame metadata, then update generation and playback flows to use the new model without removing old action keys.

**Tech Stack:** Taro 4, React 18, Vitest, TypeScript, Express backend in the PWA project.

---

### Task 1: Video Action Model And Cat Compatibility

**Files:**
- Create: `src/services/videoActions.ts`
- Test: `src/services/__tests__/videoActions.test.ts`
- Modify: `src/services/storage/types.ts`
- Modify: `src/services/catLifecycle.ts`
- Modify: `src/services/fileManager.ts`
- Test: `src/services/__tests__/fileManager.test.ts`

- [ ] Write failing tests for primary video selection: v1-v4 is preferred, legacy idle is fallback, direct `videoPath` remains fallback.
- [ ] Implement `videoActions.ts` constants and helpers.
- [ ] Add v1-v4 and `actionGenerationError` fields to `CatInfo`.
- [ ] Update cat readiness and FileManager primary URL selection to use the helper.
- [ ] Verify targeted tests pass.

### Task 2: AI Task Protocol

**Files:**
- Modify: `src/services/volcanoService.ts`
- Test: `src/services/__tests__/volcanoService.test.ts`

- [ ] Write failing tests for JSON task payload carrying `first_frame`, `last_frame`, `has_last_frame`, and duration.
- [ ] Write failing tests for file task formData carrying optional `last_frame` and `has_last_frame`.
- [ ] Update `ACTION_PROMPTS` to include PWA v1-v4 prompts and durations while keeping legacy prompts.
- [ ] Extend `VolcanoService.submitTask` with a backward-compatible options object.
- [ ] Verify targeted tests pass.

### Task 3: Generation Flow

**Files:**
- Modify: `src/pages/generation-progress/index.tsx`
- Test: `src/pages/generation-progress/index.test.tsx`

- [ ] Write/update test proving the first generated video is persisted as `v1_approach`.
- [ ] Generate secondary actions as `v2_wait/v3_return/v4_fetch`.
- [ ] Preserve abort/runId, point refund, and background unlock status behavior.
- [ ] Keep old data compatible by only changing new generation output keys.
- [ ] Verify targeted tests pass.

### Task 4: Home Playback

**Files:**
- Modify: `src/pages/home/index.tsx`
- Modify: `src/pages/cat-player/index.tsx`

- [ ] Prefer v1-v4 videos in home and player pages.
- [ ] Add a mini-compatible story playback state using a single Taro Video source switch.
- [ ] Keep legacy gesture actions for old cats.
- [ ] Surface action generation failure through the existing bubble UI.
- [ ] Verify TypeScript and build checks catch no regressions.

### Task 5: PWA Backend Compatibility

**Files:**
- Modify: `/Users/yxj/Documents/Codex/AiStudio/Miao/server.ts`

- [ ] Add authenticated `/api/v1/security/text`, `/api/v1/security/media`, and `/api/v1/security/media-file` endpoints with conservative local validation and provider-ready response shape.
- [ ] Update `/api/v1/ai/tasks-file` to honor `last_frame`, `has_last_frame`, `duration`, `prompt_extend`, and `audio` from formData.
- [ ] Run `npm run lint` in the PWA project.

### Task 6: Final Verification

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build:h5`
- `npm run build:weapp`
- `npm run lint` in `/Users/yxj/Documents/Codex/AiStudio/Miao`
- `git diff --check`

- [ ] Run all verification commands fresh.
- [ ] Review diff for accidental unrelated churn.
- [ ] Summarize implementation, remaining risks, and exact verification evidence.
