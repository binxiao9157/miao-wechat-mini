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

当前执行步骤：

- 登录、注册、微信登录成功后等待 `/api/v1` 数据同步完成，再判断进入首页或空猫页。
- 欢迎页启动时，如果本地已有登录用户，先同步服务端数据再路由。
- 首页、切换伙伴页、AI 猫咪历史页显示时主动刷新 `/api/v1/cats`。
- 猫咪本地缓存与服务端数据按 `updatedAt/createdAt` 合并，视频动作地址按 `videoPaths` 合并。
- 本地新增、生成完成、解锁动作、删除猫咪时同步写入 `/api/v1/cats`。
- 历史页删除不再只删本地缓存，统一走 `storage.deleteCatById`，同步删除服务端数据。
- 新增小程序侧猫咪生命周期判断：无猫进入领养页，草稿猫进入生成进度页，已生成猫直接进入首页。
- 生成进度页启动时会先检查当前猫是否已有稳定视频，避免登录恢复或误入页面时重复触发 AI 生成。
- 首页、播放器兼容 `videoPaths.idle`、`videoPath`、`remoteVideoUrl` 三类历史视频字段。
- 从服务端恢复猫咪时会把 `/uploads/...` 视频相对地址补齐为 API 域名，适配腾讯云 HTTPS 部署与小程序媒体播放规则。

## 跨端账号登录补充

- 微信一键登录账号默认没有密码，用户名形如 `wx_<openid>`。
- 后端新增 `POST /api/v1/auth/set-password`，通过当前 token 为微信账号设置或修改密码。
- 小程序个人中心新增“设置 PWA 登录密码”入口，设置成功后可在 PWA 使用该微信用户名和新密码登录同一账号。

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
