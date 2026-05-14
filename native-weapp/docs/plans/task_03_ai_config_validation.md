# Task 03: AI 默认清晰度与参数校验

## Context

PWA 当前两套 Provider 默认清晰度均为 `480P`，而原生小程序 `config/env.js` 火山默认是 `720p`。后台配置页允许自由输入清晰度、时长、Seed，配置错误通常要等到生成阶段才暴露。

## Files

- `miniprogram/config/env.js`
- `miniprogram/services/ai-config.js`
- `miniprogram/services/volcano.js`
- `miniprogram/pages/admin-settings/index.js`

## Steps

- [x] Step 1: 将火山默认 `VIDEO_RESOLUTION` 与 Provider 默认值统一到 `480P`。
- [x] Step 2: 在 `ai-config` 中增加 profile 标准化/校验，限制 provider、resolution、duration、seed 等值。
- [x] Step 3: 后台保存前调用标准化/校验，非法配置给出 toast，不写入本地缓存。
- [x] Step 4: 视频任务提交前使用标准化 profile，并在 prompt 中附加当前清晰度/时长/seed/无音频提示，避免参数和提示词脱节。
- [x] Step 5: 运行 `npm run check:native`，记录验证结果。

## Verification

- 2026-05-13 `npm run check:native` 通过：`native scaffold ok: 36 json files, 56 modules`。
- 2026-05-13 使用 Node 直接验证 `validateProfile()`：火山默认 profile 输出 `resolution: "480P"`，非法空模型/清晰度/时长/Seed 均返回错误。

## Acceptance Criteria

- 重置配置后火山和阿里默认清晰度都是 `480P`。
- 空模型、非法清晰度、非法时长、非法 seed 不会保存。
- 视频请求参数与提示词中的清晰度/时长/seed 一致。
- 静态检查通过。
