# 审计优化项修复

## Context

第一批 P0/P1 稳定性修复已提交为 `08844e7`。本任务继续处理 `docs/code-audit-report.md` 中已延期但可在小程序侧独立修复的优化项。

## Scope

- 修复 QR 字节模式对非 ASCII 文本的 UTF-8 编码和容量选择。
- 修复好友二维码保存路径，优先保存已导出的二维码图片。
- 修复好友海报头像参数未使用的问题。
- 修复事件适配器的环境判断和 `offAll(event)` 误删全局监听器风险。
- 改进图片压缩在小程序端的降级与告警。
- 清理确认无调用方的 H5 视频工具和未使用依赖。

## Out Of Scope

- 需要产品确认的分享交互重设计。

## Steps

- [x] 修改 QR 编码、二维码保存和海报头像绘制。
- [x] 修改事件适配器与图片压缩降级。
- [x] 清理死代码和未使用依赖。
- [x] 补充/调整测试与静态扫描。
- [x] 运行验证并汇总。

## Result

- QR 码生成改为 UTF-8 字节编码和按字节容量选版，覆盖中文与 emoji。
- 保存好友二维码优先使用已导出的 `qrImageUrl`，离屏 Canvas 不存在时不再直接失败。
- 好友海报开始绘制用户头像和猫咪头像，加载失败时使用文字占位。
- `eventAdapter` 改为运行时环境判断，并只移除 adapter 自己登记过的监听器。
- 小程序端本地图片路径使用 `Taro.compressImage`，base64 或非浏览器环境压缩跳过时有 warning。
- 删除无调用方的 `src/lib/videoUtils.ts`，移除未使用的 `sharp` devDependency。

## Verification

- `npm run lint`
- `npm test`
- `npm run build:weapp`
- `npm run release:scan`
- `npm run release:api-contract`
- `git diff --check`

## Backend Contract Confirmation

- 已先同步相邻后端仓库 `Miao_remote` 到 `origin/main` 最新提交 `e9fcd9a`。
- 最新后端已注册 `/api/v1/security/text`、`/api/v1/security/media`、`/api/v1/security/media-file`。
- 最新后端已接入 `createReleaseHealth`、`checkTextSafety`、`checkMediaSafety`、`createMockTaskPollResponse`。
- 小程序侧 `npm run release:api-contract` 已通过，确认契约缺口关闭。
- 后端侧 `npm run lint`、`npm run verify:baseline` 已通过。

## Success Criteria

- 中文或 emoji 邀请内容不会因 QR 字节编码被截断。
- 保存二维码不依赖已卸载的离屏 Canvas。
- `offAll(event)` 不会移除其他模块注册的同名事件监听。
- 小程序端图片压缩路径有可观察的行为或明确告警。
- 验证命令通过，服务端 API 契约协作项已确认关闭。
