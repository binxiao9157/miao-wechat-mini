# Task 02: 反馈提交失败不再伪成功

## Context

`pages/feedback/index.js` 中问卷和普通反馈提交都会 catch 网络/API 错误但不提示，随后仍展示成功并清空/返回。这会让用户误以为反馈已送达，也会掩盖服务端问题。

## Files

- `miniprogram/pages/feedback/index.js`

## Steps

- [x] Step 1: 为反馈页增加统一失败提示方法，避免吞掉接口错误。
- [x] Step 2: 修改问卷提交失败逻辑：失败时不写 `SURVEY_KEY`，不进入成功页，保留答案。
- [x] Step 3: 修改普通反馈失败逻辑：失败时不清空文本，不进入成功页。
- [x] Step 4: 运行 `npm run check:native`，记录验证结果。

## Verification

- 2026-05-13 `npm run check:native` 通过：`native scaffold ok: 36 json files, 56 modules`。

## Acceptance Criteria

- 接口成功时原有成功页和返回逻辑保持不变。
- 接口失败时按钮 loading 会关闭，页面保留输入，并提示“提交失败/发送失败”。
- 静态检查通过。
