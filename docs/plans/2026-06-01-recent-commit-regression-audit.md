# 2026-06-01 最近大范围提交回归审计

## 结论

最近真机问题不是历史遗留的普通小问题，而是 2026-05-30 到 2026-05-31 多个系统级提交叠加后暴露的发布回归。主线收益是明确的：Taro 4 架构升级、AI 生成链路跑通、后台调试收口、发布检查增强、PWA 视频模型对齐。但这些提交同时把小程序真机特有约束推到了前台，尤其是微信 `Video` 原生层级、`ScrollView` 页面结构、真机运行时 API 兼容和前后端部署一致性。

当前应按“发布回归修复”处理，而不是继续扩功能。优先修 P0：生成流程不再卡 pending、首页视频上方交互和导航可用、积分/Miao 页面滚动体验恢复、发布前能识别前后端合约和产物不一致。

## 最近大提交与影响

| 提交 | 修改面 | 正向收益 | 暴露/引入风险 | 风险等级 |
|---|---:|---|---|---|
| `2647aaa` Taro 4 构建栈升级 | 6 文件，lockfile 大幅变化 | 项目进入 Taro 4.2.0，解决一部分旧构建链问题 | Taro 4 + webpack5 runner 对上游依赖版本敏感，audit 强升 webpack 仍可能破坏构建 | P1 |
| `3feae21` audit advisories | 3 文件，lockfile 大幅变化 | 当前 `npm audit --omit=dev --audit-level=high` 已为 0 vulnerabilities | Taro 4 + webpack5 runner 仍对依赖版本敏感，后续不能用 `audit fix --force` 盲升 | P2 |
| `43d16aa`/`b45a33a`/`a066d0d` 稳定性与同步 | 49/74/14 文件 | 认证、存储、同步队列、生命周期容错增强 | 覆盖面大，容易影响启动、登录、上传、同步边界；需要靠回归测试锁住 | P1 |
| `732feb8` 生成进度生命周期 | 3 文件 | 生成页防重复、轮询生命周期更稳 | 真机若 `AbortController` 不存在，可能在提交视频任务前中断，表现为猫咪 pending、没有 taskId | P0 |
| `63d4ee0` 发布准备 + PWA 视频模型 | 84 文件 | 后台调试、隐私授权、内容安全、首页四段视频模型、发布扫描初步建立 | 小程序 `Video` 原生层覆盖普通 `View`，导致首页底部导航消失、视频上层点击/提示/错误层可能不可用 | P0 |
| `d81ebb6` 真机 release flow | 10 文件 | 修正导航适配、debug 入口、退出登录等真机问题 | 改动集中在导航和 Profile，需要继续防止“按钮无反应”类回归 | P1 |
| `6d493fe` 发布部署防线 | 4 文件 | 增加后端 API 合约检查，避免服务端没部署导致 404 | 只能做源码/合约检查，不能替代真实线上部署版本检查 | P1 |
| `9f90453` catId 路由生成 | 5 文件 | 创建/上传后按显式 catId 进入生成页，避免 activeCat 被旧数据串扰 | 需要和本地 first-frame 元数据、生成页异常处理一起验证 | P0 |

## 真机问题映射

| 真机现象 | 代码归因 | 状态 |
|---|---|---|
| 图片生成成功、猫咪已创建，但视频任务 pending 或未发起 | `generation-progress` 初始化链路在 `startGeneration()` 前可能因 `AbortController` 或本地 cat 读取异常中断；创建/上传后也需要明确 catId 和首帧元数据 | 本地已修：兼容无 `AbortController`、启动异常进入 error、创建/上传写入 `placeholderImage/anchorFrame` |
| 服务端 404 `/api/v1/security/text` | 前端内容安全接口已经接入，但线上服务端代码/部署版本不匹配 | 已补 API 合约检查，仍需部署后看 `/api/health` |
| provider 仍是 `dashscope` | 小程序本地 AI 配置缓存未迁移或未清理 | 已有 provider 迁移逻辑，但真机仍需要看诊断日志确认 |
| 首页视频生成后只剩全屏猫咪，底部导航消失 | `63d4ee0` 引入多段 Taro `Video`，自定义 tabbar 仍是普通 `View/Image`，被微信原生层盖住 | 本地已修：tabbar 改为 `CoverView/CoverImage` |
| 首页视频上层点击/提示/错误按钮可能失效 | `story-touch-layer`、错误遮罩、气泡、toast、生成中提示仍是普通 `View/Text`，和 tabbar 属于同一类原生层级风险 | 本地已修：首页视频上方关键 overlay 已改为 `CoverView` |
| 积分页和 Miao 页上滑有顶部固定区域 | header 在 `ScrollView` 外，页面禁用原生滚动后 header 变成固定区域 | 本地已修：header 移入 `ScrollView` |

## 风险分级

### P0 必须修完再上传真机

- 首页视频页面所有位于 `Video` 上方的可见/可点 UI 必须不被原生层遮挡：底部 tabbar、点击层、错误重试、生成中/剧情未完成提示、互动气泡、积分 toast。
- 生成流程不能因为真机缺失 `AbortController` 或本地数据异常停在 pending；失败必须进入明确 error 状态。
- 创建/上传生成必须绑定显式 `catId`，首帧必须作为 `anchorFrame/placeholderImage` 传递。

### P1 发布前必须有防线

- 发布前检查 dist 产物、后端 API 合约、`/api/health` 版本能力，避免“前端代码有了但线上服务端没部署/小程序产物没替换”。
- Profile/Points 等 tab 页滚动结构需要静态测试锁住，防止 header 再被挪到 `ScrollView` 外。
- 导航适配器、debug 入口、退出登录、后台页注册保持一致。

### P2 真机回归重点

- Cover 组件样式能力弱于普通 View，首页 tabbar 和提示层需要真机确认视觉是否降级。
- 四段视频模型在微信 `Video` 上的 ended/error/seek/play 时序需要真机长测。
- 当前 production audit 已无 high 漏洞；Taro 4 依赖治理仍需单独维护，后续避免强制升级 webpack 破坏 runner。

## 开发计划

1. P0 首页原生视频层级修复
   - 已修 tabbar 为 `CoverView/CoverImage`。
   - 已修首页 `story-touch-layer`、错误重试层、生成中提示、剧情未完成提示、互动气泡和积分 toast，保证真机视频上方 UI 可见可点。
   - 已增加代码级防线，禁止首页视频上方关键 overlay 回退为普通 `View/Text`。

2. P0 生成链路防 pending
   - 已修 `AbortController` 降级、启动异常 error、显式 catId、首帧元数据。
   - 继续检查 `isUnlocking/actionGenerationError` 的失败落盘，避免后台动作失败后用户无反馈。

3. P1 页面滚动和导航回归防线
   - 已修积分/Miao header 移入 `ScrollView`。
   - 保留静态测试锁住结构。
   - 补充 Profile/Points 真机验证清单。

4. P1 发布防线
   - 运行 `npm test`、`npm run lint`、`npm run build:weapp`、`npm run release:scan`、`npm run release:api-contract`。
   - 上传前确认 `dist/app.json`、后端 `/api/health` 能力、微信开发者工具产物版本。

5. P2 后续单独项
   - Taro 4/audit 上游告警单独治理。
   - H5 真实体积优化不混入本轮。
   - 首页四段视频真机手势和播放状态做长测记录。
