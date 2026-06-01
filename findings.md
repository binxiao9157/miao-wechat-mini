# 发现与决策

## ⚡ Active Context（活跃上下文，前 5 条）
1. 原生微信小程序工程位于 `/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/miao-wechat-mini/native-weapp`，当前分支 `native-weapp-mvp`。
2. 小程序页面入口在 `miniprogram/app.json`，包含登录注册、猫咪创建/生成、主页、日志、时光信件、积分、通知、个人中心、后台配置、好友分享等页面。
3. 服务层位于 `miniprogram/services/`，包含鉴权、AI 配置、火山引擎、数据存储、内容存储、社交存储、同步队列、生成任务等模块。
4. 工具层位于 `miniprogram/utils/`，包含请求、上传、媒体 URL、分享卡片、二维码画布、布局、安全导航、事件总线、存储等能力。
5. 第二批开发任务已确定：Task 04 首页动作入口可见化、Task 05 兑换生成扣分持久化、Task 06 信件删除同步队列闭环。

## ⚡ Explore Progress
- [x] Step 1: Initialize Planning Files + Deploy CLAUDE.md
- [x] Step 2: Understand the Problem
- [x] Step 3: Propose Approaches
- [x] Step 3.5: Explore → Plan Gate
- [x] Step 4: Transition to Plan

---

## Confirmed Requirements（确认的需求）
- 系统分析当前原生微信小程序已实现功能。
- 从功能逻辑、业务实现、交互体验三个维度识别问题和优化点。
- 给出完整的分析 Markdown 文档。
- 给出开发优化计划。
- 按任务逐步实现具体代码开发。

## Constraints & Rejected Alternatives（约束与被否决的方案）
### Constraints（约束）
- 以当前 `native-weapp` 原生微信小程序代码为准，不把 PWA 工程当作本次主体。
- 改动应分阶段、可验证，避免一次性重构大量页面。
- 不在未验证前提交代码，除非用户明确要求。

### Rejected Alternatives（被否决的方案）
| 方案 | 否决理由 |
|------|---------|
| 直接凭历史 PWA 经验改小程序代码 | 用户要求分析当前原生实现，必须先读代码 |
| 一次性重写 UI 或数据层 | 风险高，页面多，难以逐步验证 |

## Technical Decisions（技术决策）
| 决策 | 理由 | 日期 |
|------|------|------|
| 使用 Lodestar 文件跟踪本次多步骤任务 | 用户显式调用 `$lodestar`，任务涉及分析、计划、多个文件开发 | 2026-05-13 |
| 审计文档放在 `docs/native-weapp-system-analysis.md` | 与已有小程序 docs 目录保持一致 | 2026-05-13 |
| 第一批实现优先做好友邀请、反馈失败、AI 参数校验 | 三项改动范围小、收益明确、可用静态检查与手工路径验证 | 2026-05-13 |

## Available Skills（可用技能）
### Code Review Skills
| Skill Name | 用途 | 是否选用 |
|------------|------|----------|
| lodestar | 多步骤规划、执行和审查 | ✅ |

### Testing Skills
| Skill Name | 用途 | 是否选用 |
|------------|------|----------|
| 本地脚本 `scripts/check.js` | 小程序工程静态检查 | ✅ |

### Other Skills（Debugging / Design / Simplification / Parallel / Planning）
| Skill Name | 用途 | 是否选用 | 集成点 |
|------------|------|----------|--------|
| lodestar | Explore/Plan/Execute 工作流 | ✅ | 全流程 |

## Research Findings（调研发现）
- `project.config.json` 指向 `miniprogram/`，项目名 `miao-weapp-native`。
- `miniprogram/app.json` 配置 31 个页面，使用自定义导航和全局 `native-tab-bar` 组件。
- 当前工程已有大量迁移与验收文档，后续只作为参考，最终结论以代码审计为准。
- `app.js` 启动时通过 `authService.getToken()` 与缓存用户恢复会话；前台 `onShow` 会触发 `syncManager.syncAll()`。
- `syncManager` 使用 30 秒冷却和 `Promise.allSettled` 同步猫咪、日志、信件、积分、通知、好友；失败不会阻断其他同步。
- `dataStore`、`contentStore`、`socialStore` 均使用 `userScopedKey` 做用户级本地缓存隔离。
- `request.js` 与 `upload.js` 统一注入 `Authorization`、`X-Client-Type`、`X-Client-Version`，并在 401 时清除登录态、广播 `auth:unauthorized`。
- `ai-config.js` 默认 Provider 是 `volcengine`，图片模型 `doubao-seedream-4-5-251128`，视频模型 `doubao-seedance-1-5-pro-251215`；但默认 `VIDEO_RESOLUTION` 为 `720p`，需与业务期望核对。
- `volcano.js` 中 `ACTION_PROMPTS` 未显式包含 480P/720p 清晰度描述；视频参数从 `aiConfig` 传递到后端。
- 页面审计确认核心用户链路包含：欢迎/登录/注册、创建预设猫、上传素材生成锚点图、分动作视频生成、主页互动、切换/历史、猫咪播放器、日志动态、时光信件、积分兑换、通知、个人资料、好友二维码/扫码/邀请、隐私与反馈。
- `pages/generation-progress` 对兑换解锁有积分扣减与失败退款逻辑，但扣减状态仅在页面实例内存中保存，若生成过程中页面被销毁或小程序重启，退款/幂等存在风险。
- `npm run check:native` 通过，输出 `native scaffold ok: 36 json files, 56 modules`；此前关于 `replaceDiaryMedia` 重复 `let nextType` 的疑点已被代码回读和检查脚本排除。
- `pages/add-friend-qr` 的入口可携带 `catId`，但 `socialStore.createInvite()` 当前总是使用 active cat，可能导致从日志页为指定猫咪分享时生成错猫邀请。
- `services/sync-queue.js` 目前只持久化任务队列，未发现调度处理入口，说明离线同步队列能力尚未真正闭环。
- `pages/feedback` 提交接口失败时仍会清空表单并显示成功，体验上容易让用户误判反馈已送达。
- `pages/admin-settings` 已是独立后台配置页，视觉主色使用 `#E89F71/#FF9D76`，整体与小程序治愈系风格接近；但 AI 配置的模型、分辨率、时长、Seed 都是自由输入，缺少可选项/合法值约束，配置错误不易发现。
- 交互体验上，首页沉浸视频把 visible action bar 和 topbar 全部隐藏，核心互动依赖点击/双击/长按/滑动手势，缺少可见替代入口，存在可发现性风险。
- `miniprogram/config/env.js` 当前默认视频清晰度为 `720p`，而 `dashscope` 默认是 `480P`；如果业务要求两套视频生成都固定 480P，需要统一 env 默认、后台默认值和保存逻辑。
- 已按 `ui-ux-pro-max` 核心规则审视移动端体验：需关注触控目标、安全区、手势替代入口、表单反馈、固定底部栏遮挡、配置项输入合法性。
- 已产出完整审计文档 `docs/native-weapp-system-analysis.md`，推荐第一批实现 Task 01 好友邀请 `catId` 透传、Task 02 反馈失败处理、Task 03 AI 参数校验。
- 第一批 3 个任务已实现：好友邀请按所选 `catId` 创建、反馈失败不再伪成功、AI 默认清晰度对齐 `480P` 并增加参数校验/视频 prompt 附加生成参数。
- 2026-05-14 用户要求继续按计划系统开发；基于分析文档剩余优先级，新增 Task 04/05/06，范围分别是首页可发现性、生成兑换可靠性、同步队列闭环。
- 首页 `action-bar` 已存在于 WXML，但 WXSS 用 `.topbar, .action-bar { display: none; }` 和 `.home-page .action-bar { display: none; }` 隐藏；适合以小范围 CSS 恢复。
- `generation-progress` 当前只用实例字段 `pointsSpent` 保存兑换扣分状态；`generationTasks` 可作为用户级持久化事务存储。
- `sync-queue.js` 当前无调用点；时光信件删除只改本地，可作为第一条 pending task 闭环。
- 第二批 3 个任务已实现：首页动作入口恢复显示、兑换扣分事务持久化、时光信件删除接入 tombstone 与同步队列重试。

## Issues & Resolutions（问题与解决）
| 问题 | 解决方案 | 关联 Task |
|------|---------|----------|
| 初始工作目录是 PWA 仓库，不是小程序工程 | 在上层工作区定位到 `miao-wechat-mini/native-weapp` 并切换分析主体 | Explore |

## Resources（资源）
- `/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/miao-wechat-mini/native-weapp/project.config.json`
- `/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/miao-wechat-mini/native-weapp/miniprogram/app.json`
- `/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/miao-wechat-mini/native-weapp/miniprogram/pages/`
- `/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/miao-wechat-mini/native-weapp/miniprogram/services/`
- `/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/miao-wechat-mini/native-weapp/miniprogram/utils/`

## Visual/Browser Findings（视觉/浏览器发现）
- 暂未进行小程序开发者工具视觉验证；当前阶段为代码与文档审计。

---
*每 2 次搜索/读取操作后更新此文件（2-Action 规则）。*
