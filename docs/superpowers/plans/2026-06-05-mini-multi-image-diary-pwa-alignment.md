# Mini Multi-Image Diary PWA Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the PWA multi-image diary publishing behavior and visual presentation to the Taro WeChat mini program while preserving existing single-image/video diary compatibility.

**Architecture:** Extend the diary model with optional `images[]` and keep `media/mediaType` as backward-compatible first-media fields. The compose page will manage an image list and a single video as mutually exclusive media modes. Storage sync will resolve each local `miao_media:*` image to an uploaded `/uploads/media/*` URL before sending `images[]` to the server.

**Tech Stack:** Taro 4, React 18, TypeScript, Vitest, existing `mediaStorage`, `uploadAdapter`, `contentSafetyService`, and `/api/v1/upload`.

---

### Task 1: Add Multi-Image Data Contract and Sync Coverage

**Files:**
- Modify: `src/services/storage/types.ts`
- Modify: `src/services/storage.ts`
- Modify: `src/services/__tests__/storageReleaseAudit.test.ts`

- [x] **Step 1: Write failing sync test**

Add a Vitest case that saves two local image files and expects `serverSync.syncDiaryToServer` to upload both and send `images[]` URLs.

- [x] **Step 2: Run targeted test to verify failure**

Run: `npm test -- src/services/__tests__/storageReleaseAudit.test.ts`
Expected before implementation: FAIL because `DiaryEntry` has no `images[]` support in sync payload.

- [x] **Step 3: Implement `images?: string[]` and resolver**

Update `DiaryEntry` and `resolveServerDiaryPayload` so each local `miao_media:*` image in `images[]` is uploaded with `purpose=diary`, and remote URLs remain unchanged.

- [x] **Step 4: Run targeted test to verify pass**

Run: `npm test -- src/services/__tests__/storageReleaseAudit.test.ts`
Expected: PASS.

### Task 2: Port Compose Multi-Image Selection and Publishing

**Files:**
- Modify: `src/pages/diary/index.tsx`
- Modify: `src/pages/diary/index.less`

- [x] **Step 1: Replace single image state with media list**

Introduce `selectedMediaList` for images and video, keep video single-item mode, and make image selection count fill up to 9.

- [x] **Step 2: Persist every selected image**

On publish, run media safety for each image, save each file as `miao_media:<diaryId>_img_<index>`, set `images[]`, and keep `media` as first image for old cards/share fallback.

- [x] **Step 3: Update compose UI**

Render a PWA-style 3-column image grid with per-image remove buttons and an add-image tile. Disable video when images exist and replace images when choosing a video.

### Task 3: Port Multi-Image Card Rendering

**Files:**
- Modify: `src/components/common/DiaryCard.tsx`
- Modify: `src/components/common/DiaryCard.less`
- Modify: `src/pages/diary/index.tsx`

- [x] **Step 1: Add resolved image list**

Load `diary.images[]` local media references into `imageUrls[]`; fallback to `mediaUrl` for old entries.

- [x] **Step 2: Render PWA-aligned grid**

Display one image full-width, two/four as 2-column grid, and other counts as 3-column grid. Use `Taro.previewImage` for tap preview.

### Task 4: Verify and Commit

**Files:**
- Modify only files listed above plus this plan.

- [x] **Step 1: Run validation**

Run: `npm test`, `npm run lint`, `npm run build:weapp`, `npm run release:scan`, `npm run release:api-contract`.

- [x] **Step 2: Review diff and commit**

Commit message: `feat: align mini diary multi-image publishing`.

### Additional Backend Contract Fix

The mini release API contract also required backend support for safety and diagnostics routes. `Miao_remote/server.ts` now registers authenticated `/api/v1/security/text`, `/api/v1/security/media`, `/api/v1/security/media-file`, and `/api/v1/diagnostics/client-log`, plus shared release health and mock task polling helpers.
