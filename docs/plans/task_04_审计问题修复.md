# 审计问题修复

## Context

用户提供 `docs/code-audit-report.md`，要求基于最新 `master` 代码判断问题是否真实存在，并对确认的问题给出开发修复计划和代码实施。

## Scope

本轮优先处理 P0/P1 中可确认且会影响真实用户数据或核心生成链路的问题：

- 存储缓存隔离、用户信息脱敏、active cat 更新语义。
- 积分读写副作用和首页积分奖励写入一致性。
- 同步队列 flush 死锁保护。
- 生成页 `AbortController` 兼容、取消确认和兑换积分退回。
- 日记视频媒体文件保存方式。
- 导航空实例和参数解析边界。
- 临时上传文件清理、创建猫咪首帧字段持久化。

## Out Of Scope

- QR 码 UTF-8 编码、海报头像绘制、事件适配器重构、低优先级死代码清理。
- 需要服务端接口协作的 API 契约问题。

## Steps

- [x] 复核审计报告并确认本轮范围。
- [x] 修改存储、认证、同步队列和导航基础设施。
- [x] 修改生成页、创建/上传页和日记媒体保存路径。
- [x] 补充针对性测试并运行验证。
- [x] 汇总已修复与后续待修复事项。

## Confirmed And Fixed

- 用户信息持久化会残留敏感字段：`saveUserInfo` 统一脱敏，登出/清理时清空内存缓存。
- 更新猫咪资料会意外切换 active cat：`saveCatInfo` 只在新增或没有 active cat 时设置默认 active。
- `getPoints` 读操作可能触发写入：改为纯读取并在首页奖励入口使用稳定 transaction id 防重复。
- `syncQueue.flush` 异常后可能卡住：改为逐项成功后删除任务，并用 `finally` 释放 `flushing` 和等待者。
- 生成页在部分小程序运行时 `AbortController` 不可用会中断：增加兼容降级、初始化失败进入 error/retry、取消生成确认与积分退回。
- 创建/上传猫咪缺少稳定首帧字段：持久化 `anchorFrame`、`placeholderImage`。
- 日记视频用 base64 存储风险过高：改为保存文件并只持久化媒体元数据。
- 导航适配器在空 Taro instance 或 H5 参数解析时不稳：增加空值保护和 Web 参数解析。
- 火山任务临时上传文件可能残留：提交结束后清理临时文件。
- 自定义 tab bar 需要覆盖原生视频：改用 `CoverView` / `CoverImage`。

## Deferred

- QR 码 UTF-8 编码、海报头像绘制、事件适配器重构、资源压缩与死代码清理放到后续低风险批次。
- 服务端 API 契约缺口需要后端仓库同步确认，本轮只修正小程序侧契约脚本的默认服务端路径选择。

## Verification

- `npm run lint`
- `npm test`
- `npm run build:weapp`
- `npm run release:scan`
- `git diff --check`

## Success Criteria

- 确认的 P0/P1 问题有对应代码修复或明确记录为后续批次。
- `npm run lint` 和相关测试通过。
- 不引入与当前远端无关的大范围重构。
