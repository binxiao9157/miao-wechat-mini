# Task 04: 首页动作入口可见化

## Context

首页当前沉浸式视频体验保留了动作按钮 WXML，但 WXSS 同时隐藏了 `topbar` 和 `action-bar`。这导致摸头、踩奶、逗猫等互动强依赖双击、滑动、长按手势，新用户不容易发现。目标是恢复一个轻量动作入口，让按钮点击与现有 `selectAction` 逻辑复用，不增加说明性文案。

## Files

- `miniprogram/pages/home/index.wxml`
- `miniprogram/pages/home/index.wxss`
- `miniprogram/pages/home/index.js`

## Steps

- [x] Step 1: 恢复 `action-bar` 显示，同时保持迁移期 `topbar` 隐藏。
- [x] Step 2: 调整动作按钮尺寸、布局、安全区和缺失态，避免遮挡底部导航与猫咪主体。
- [x] Step 3: 复用已有 `selectAction`，确保缺失动作仍跳转补生成。
- [x] Step 4: 运行 `npm run check:native`，记录验证结果。

## Verification

- 2026-05-14 `npm run check:native` 通过：`native scaffold ok: 36 json files, 56 modules`。

## Acceptance Criteria

- 首页底部导航上方可见动作入口。
- 每个触控目标高度不小于 64rpx，和底部导航有安全距离。
- 已生成动作点击后直接切换视频；未生成动作点击后进入生成页。
- 静态检查通过。
