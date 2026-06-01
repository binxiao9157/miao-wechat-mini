# Native WeApp QA Checklist

Use WeChat DevTools to import `native-weapp/project.config.json`.

## Import

- Choose "不使用云服务".
- Confirm compile succeeds without missing page/component errors.
- Confirm `request` and `uploadFile` domains are configured for the backend host.

## Auth

- Register with username/password.
- Log out and log in again.
- Open "我的" -> "个人资料设置" and update nickname.
- Open "修改密码" and verify password update.
- Open "忘记密码" from login and verify reset flow.

## Bottom Navigation

- Switch between 首页, 日记, 时光信, 积分, 我的.
- On iPhone models with home indicator, confirm bottom navigation is not clipped.
- Scroll each tab page to the bottom and confirm content is not hidden behind the tab bar.

## Upload And Generation

- Use "生成新猫咪" to choose a photo from album.
- Confirm compressed image preview is shown.
- Submit AI image generation.
- Confirm generation-progress page starts video generation.
- Leave the generation page and re-enter from home; confirm task continues or resumes.
- Generate all four actions: idle, tail, rubbing, blink.
- Confirm home action chips switch videos or prompt generation for missing videos.

## Video Playback

- Confirm home video autoplays, loops, and is muted.
- Tap, double tap, swipe, and long press the cat area.
- Turn network off briefly, reopen home, and confirm video error state shows retry.
- Open cat history and play a cat from cat-player.

## Points Redemption

- Open 积分 and confirm daily login reward appears once per day.
- With less than 100 points, tap redemption and confirm "积分不足".
- With enough points, redeem a new cat.
- Confirm points are deducted only after anchor image generation succeeds.
- Confirm points history displays negative spend correctly.

## Friends

- Open 我的 -> 邀请好友.
- Generate invite code and copy it.
- Open 加入好友 with the code and accept.
- Use scan entry if testing with another device/code.
- Confirm 好友 page shows friend list and friend diaries.

## Content

- Add and delete a diary.
- Add a time letter with a future date.
- Add a time letter with today/tomorrow for unlock verification.
- Open 消息中心 and verify notifications, points, and unlockable letters aggregate.

## Final Smoke

- Kill and reopen the mini program.
- Confirm session recovery routes to home or empty-cat correctly.
- Confirm no console errors appear during the above flows.
