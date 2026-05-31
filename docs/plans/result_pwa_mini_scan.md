# 扫描两端工程结果

## Summary

已完成 `Miao` PWA 工程与 `miao-wechat-mini` 小程序工程的只读扫描。确认 `Miao` 是当前 PWA/全栈工程：React 19 + Vite + React Router + Express，服务端入口为 `server.ts`。小程序工程为 Taro 4 + React，通过适配层调用同一类 `/api/v1/*` 后端接口。

## Evidence

- PWA 技术栈：`Miao/package.json` 使用 Vite、React 19、React Router、Express、Multer、Axios、Tailwind。
- 小程序技术栈：`miao-wechat-mini/package.json` 使用 Taro 4.2.0、React 18、Taro weapp/h5 runner。
- PWA 路由：`Miao/src/App.tsx` 定义登录、注册、猫咪创建、生成、首页、日志、时光、积分、个人中心、管理员等页面。
- 小程序路由：`miao-wechat-mini/src/app.config.ts` 定义同名功能页面，并额外有 `cat-start`、`join-friend`、微信端隐私/授权相关页面。
- PWA 最近提交集中在：
  - `feat: optimize video workflow and UI styling`
  - `feat(ai): optimize cat interaction prompts and flow`
  - `fix: improve image URL normalization and ratio validation`
  - `refactor(video): enforce strict video persistence and error handling`
  - `feat(cat): update animation state machine and video logic`
  - `feat(admin): secure and modularize admin management`
- PWA 当前核心新增/变更能力：
  - 四段视频动作键：`v1_approach`、`v2_wait`、`v3_return`、`v4_fetch`。
  - 前后帧视频生成参数：`first_frame`、`last_frame`、`has_last_frame`。
  - 首页四视频状态机：`READY`、`PLAYING_V1`、`LOOPING_V2`、`PLAYING_V3`、`PLAYING_V4`。
  - 视频持久化严格失败显式报错。
  - 后台动作生成失败通过 `actionGenerationError` 反馈到首页气泡。
  - 管理后台抽出 `adminService`，并调用 `/api/v1/admin/*`。
- 小程序当前状态：
  - 页面数量与核心业务基本覆盖 PWA。
  - AI 动作仍为旧体系：`idle`、`tail`、`rubbing`、`blink`。
  - 首页仍是单视频 `currentAction` 切换，不是 PWA 四段状态机。
  - `VolcanoService.submitTask` 尚不支持外部传入 `firstFrame`、`lastFrame`、`has_last_frame`。
  - `FileManager` 已具备严格视频持久化和 `unlockProgress`，但主视频键仍按 `idle` 优先。
  - 小程序新增了隐私授权、内容安全前端调用和同步队列稳健性修复，PWA 端未见对应内容安全接口实现。

## Outcome

第一阶段扫描完成。可以进入差异矩阵分析：重点不再是“页面有没有”，而是“视频生成状态机、AI 参数、文件持久化、积分兑换、后台管理、内容安全与平台能力”是否业务语义对齐。
