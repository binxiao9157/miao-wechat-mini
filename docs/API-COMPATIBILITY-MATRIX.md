# PWA / 微信小程序 API 对齐矩阵

## 统一请求约定

所有小程序业务请求默认携带：

```text
X-Client-Type: wechat-miniprogram
X-Client-Version: 1.0.0
Authorization: Bearer <token>
```

PWA 请求可携带：

```text
X-Client-Type: pwa
Authorization: Bearer <token>
```

## 认证

| 功能 | 旧接口 | 统一接口 | 状态 |
|---|---|---|---|
| 密码登录 | `/api/auth/login` | `POST /api/v1/auth/password-login` | 已补后端，mini 已接入 |
| 注册 | `/api/auth/register` | `POST /api/v1/auth/register` | 已补后端，mini 已接入 |
| 微信登录 | 无 | `POST /api/v1/auth/wechat-login` | 已补后端，需配置微信密钥 |
| 当前用户 | 无 | `GET /api/v1/me` | 已补后端，mini 已接入 |

## 用户数据

| 功能 | 旧接口 | 统一接口 | 状态 |
|---|---|---|---|
| 猫咪列表 | `GET /api/cats/:userId` | `GET /api/v1/cats` | 已补后端，mini 已接入 |
| 保存猫咪 | `POST /api/cats` | `POST /api/v1/cats` | 已补后端，mini 已接入 |
| 删除猫咪 | `DELETE /api/cats/:userId/:catId` | `DELETE /api/v1/cats/:catId` | 已补后端，mini 已接入 |
| 日记列表 | `GET /api/diaries/:userId` | `GET /api/v1/diaries` | 已补后端，mini 已接入 |
| 保存日记 | `POST /api/diaries` | `POST /api/v1/diaries` | 已补后端，mini 已接入 |
| 信件列表 | `GET /api/letters/:userId` | `GET /api/v1/letters` | 已补后端，mini 已接入 |
| 积分 | `GET/POST /api/points...` | `GET/POST /api/v1/points` | 已补后端，mini 已接入 |

## AI 与资源

| 功能 | 旧接口 | 统一接口 | 状态 |
|---|---|---|---|
| 图片任务 JSON | `/api/ai/generate-image`、`/api/generate-image` | `POST /api/v1/ai/tasks` | 已补后端，mini 已接入 |
| 视频任务 JSON | `/api/ai/generate-video`、`/api/generate-video` | `POST /api/v1/ai/tasks` | 已补后端，mini 已接入 |
| 图片/视频文件上传任务 | mini server `/api/generate-*-file` | `POST /api/v1/ai/tasks-file` | 已补后端，mini 已接入 |
| 任务轮询 | 多套 status 接口 | `GET /api/v1/ai/tasks/:taskId?type=&provider=` | 已补后端，mini 已接入 |
| 视频持久化 | `/api/persist-video` | `POST /api/v1/assets/persist-video` | 已补后端，mini 已接入 |

## 仍需设计

| 功能 | 建议接口 |
|---|---|
| 好友邀请 | `POST /api/v1/friends/invite` |
| 加入好友 | `POST /api/v1/friends/join` |
| 好友列表 | `GET /api/v1/friends` |
| 资源上传到 COS | `POST /api/v1/assets` |
| 积分事件 | `POST /api/v1/points/events` |
