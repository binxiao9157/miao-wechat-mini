# 正式发布前全量审计

## Context

用户要求按正式发布前代码审计标准全量扫描，不只看构建和主流程，必须覆盖异常路径、运行时兼容、数据安全、API 契约、资源性能、死代码和依赖风险。第一步已确认小程序本地已有三份提交，`Miao_remote` 已同步到 `origin/main`。

## Scope

- 构建、类型检查、测试、发布脚本、依赖和配置。
- 用户主流程、异常路径、取消/重试/失败恢复、并发竞态。
- Taro/微信小程序运行时：JSCore、原生组件、Canvas、Video、文件系统、storage、eventCenter。
- 数据安全和隐私：本地敏感字段、账号切换隔离、内容安全接口、权限授权。
- API 契约：客户端实际调用接口与后端路由、鉴权、返回结构一致性。
- 资源与性能：base64、临时文件、图片/视频压缩、包体积、未使用依赖。
- 死代码、H5-only 代码混入小程序、重复逻辑。
- 发布风险：微信项目配置、域名/sourceMap、release scan。

## Steps

- [x] 确认小程序和后端远端基线。
- [x] 执行全量静态扫描和脚本验证。
- [x] 复核 P0/P1/P2 真实问题。
- [x] 修复可确认问题并补守卫。
- [x] 跑完整发布验证并提交。

## Findings

- P0: 未发现当前最新小程序/后端基线下阻断发布的 P0。
- P1: 猫咪首帧字段在同步到服务端前被剥离，跨设备或重装后会丢 `placeholderImage` / `anchorFrame`。已修复：服务端同步保留首帧字段，并用测试守卫防止回归。
- P1: 日记本地媒体同步服务端时会将 `miao_media:*` 读成 `data:video/...;base64` 后通过 JSON 写入服务端，存在请求体和 JSON 数据文件膨胀风险。已修复：本地日记媒体先走 `/api/v1/upload` 上传，服务端保存为 `/uploads/media/*` URL；视频 base64 JSON 同步被阻止。
- P2: 服务端 `/api/v1/upload` 原先只允许图片扩展名，不能承接日记视频上传。已修复：后端同一路由支持日记媒体视频，并按用途保存到 `uploads/media`。
- P2: 客户端实际 API 调用与后端路由自动比对无缺口，生产依赖 audit 无高危，隐私敏感 API 现有静态守卫未发现新增漏授权。

## Verification

- `npm run release:check`
- 后端 `Miao_remote`: `npm run lint`
- 后端 `Miao_remote`: `npm run verify:baseline`
