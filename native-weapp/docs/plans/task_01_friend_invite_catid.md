# Task 01: 好友邀请 catId 透传

## Context

日志页添加好友流程允许用户选择代表猫咪，并通过 `/pages/add-friend-qr/index?catId=...` 打开二维码页。但二维码页当前没有读取该 query，`socialStore.createInvite()` 也固定使用 `dataStore.getActiveCat()`，可能导致用户选择 A 猫却生成 B 猫的邀请。

## Files

- `miniprogram/pages/add-friend-qr/index.js`
- `miniprogram/services/social-store.js`

## Steps

- [x] Step 1: 在二维码页保存 `onLoad(options).catId`，并在创建邀请时传给 service。
- [x] Step 2: 扩展 `socialStore.createInvite(catId)`，优先按 `catId` 查找猫咪，找不到时回退 active cat。
- [x] Step 3: 运行 `npm run check:native`，记录验证结果。

## Verification

- 2026-05-13 `npm run check:native` 通过：`native scaffold ok: 36 json files, 56 modules`。

## Acceptance Criteria

- 从日志页选择任意猫咪打开二维码页时，请求体中的 `catId/catName/catAvatar` 与所选猫一致。
- 从个人中心直接进入二维码页时，仍使用 active cat。
- 静态检查通过。
