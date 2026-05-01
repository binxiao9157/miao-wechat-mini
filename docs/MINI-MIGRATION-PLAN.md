# Miao 微信小程序迁移执行计划

## 当前策略

- 继续在 `miao-wechat-mini` 分支开发小程序前端。
- 正式后端统一使用 `Miao_remote/server.ts` 演进出的 `/api/v1` API。
- `miao-wechat-mini/server` 仅保留为历史参考，不再作为生产后端继续开发。
- PWA 与小程序共享账号、猫咪、日记、信件、积分、AI 任务与资源持久化接口。

## 阶段 1：基础联调

已落地：

- `httpAdapter` 默认注入 `X-Client-Type`、`X-Client-Version`、`Authorization`。
- 新增 `uploadAdapter`，统一 `Taro.uploadFile` 鉴权请求头。
- 新增 `authService`，支持 token 持久化、密码登录、微信登录、`/api/v1/me`。
- `AuthContext` 改为优先走服务端登录，失败时才回退本地演示用户。
- `fileManager` 的视频持久化改为 `/api/v1/assets/persist-video`。
- AI 图片/视频提交与轮询改为 `/api/v1/ai/tasks`。

待继续：

- 真机验证微信登录，需要服务端配置 `WECHAT_APPID` 和 `WECHAT_APPSECRET`。
- 清理剩余 Web 专属页面或在小程序中隐藏。

## 阶段 2：核心猫咪链路

目标：

- 登录后创建或上传猫咪。
- 通过统一 AI 任务接口生成图片/视频。
- 生成视频由后端持久化，客户端保存稳定 URL。
- 退出重进后可从服务端恢复猫咪列表。

验收：

- 同一账号在 PWA 和小程序可看到同一只猫。
- 小程序播放的视频不是 AI 供应商临时 URL。

## 阶段 3：数据同步链路

目标：

- 猫咪、日记、信件、积分全部走 `/api/v1`。
- 本地存储只做缓存。
- 服务端 token 推导用户身份，客户端不再决定 `userId` 权限。

验收：

- PWA 发布的数据，小程序可见。
- 小程序发布的数据，PWA 可见。

## 阶段 4：好友、分享、通知

目标：

- 好友从本地 mock 改为服务端邀请码。
- 扫码使用 `Taro.scanCode`。
- 分享使用小程序 `onShareAppMessage`。
- PWA 通知与小程序订阅消息分开实现。

## 阶段 5：上线治理

必须完成：

- 微信 AppSecret 只保存在服务端 `.env`。
- 生产环境 `JWT_SECRET` 必须配置为强随机值。
- request/upload/download 合法域名配置为 HTTPS 域名。
- JSON 文件数据库迁移到正式数据库。
- 本地 `uploads` 迁移到 COS/CDN。
- `/api/proxy-resource` 增加白名单或下线。
