# Release Code Approval Rule

## 正式版发布审批准则

进行代码工程审批时，必须以“准备发布正式版”为目标，对整个工程做系统性代码审计，不只是构建和主流程验证。

审计范围必须覆盖：

1. 构建、类型检查、测试、发布脚本、依赖和配置。
2. 用户主流程、异常路径、取消/重试/失败恢复、并发竞态。
3. 小程序运行时兼容性，包括 Taro/微信 JSCore、原生组件、Canvas、Video、文件系统、storage、eventCenter。
4. 数据安全和隐私，包括本地存储敏感字段、账号切换隔离、内容安全接口、权限授权。
5. API 契约，包括客户端实际调用的所有接口是否在服务端存在，参数/返回结构/鉴权是否一致。
6. 资源与性能，包括 base64 存储、临时文件清理、图片/视频压缩、包体积、未使用依赖。
7. 死代码、未调用模块、H5-only 代码混入小程序、重复逻辑。
8. 发布风险，包括远端仓库最新代码同步、release scan、微信项目配置、域名/上传/sourceMap 设置。

输出要求：

1. 先同步或确认最新相关仓库代码。
2. 按 P0/P1/P2 分级列出真实问题，不能只复述扫描结果。
3. 每个问题要说明：证据文件、触发场景、影响、是否真实存在、修复建议。
4. 对确认的问题直接制定开发计划并实施修复。
5. 修完后必须运行 lint、test、build、release scan、API contract 等验证。
6. 最后提交 commit，并说明仍未处理的风险。

## Goal

When approving this project for release, use "ready for production release" as the target. The review must be a systematic code audit of the whole engineering project, not only a build check or happy-path validation.

## Required Scope

1. Build, type checking, tests, release scripts, dependencies, and project configuration.
2. User primary flows, exceptional paths, cancel/retry/failure recovery, and concurrency races.
3. Mini program runtime compatibility, including Taro, WeChat JSCore, native components, Canvas, Video, file system, storage, and eventCenter.
4. Data security and privacy, including sensitive local storage fields, account switching isolation, content safety APIs, and permission authorization.
5. API contracts, including whether every client-called endpoint exists on the backend and whether params, response shape, and auth behavior match.
6. Resource and performance risks, including base64 storage, temp file cleanup, image/video compression, package size, and unused dependencies.
7. Dead code, uncalled modules, H5-only code mixed into the mini program, and duplicated logic.
8. Release risks, including latest remote repository sync, release scan, WeChat project config, domain/upload/sourceMap settings.

## Required Output

For every release approval run:

1. Sync or explicitly confirm the latest related repositories first.
2. List real issues by P0/P1/P2. Do not merely repeat scanner output.
3. For each issue, include:
   - Evidence file.
   - Trigger scenario.
   - Impact.
   - Whether it truly exists.
   - Recommended fix.
4. For confirmed issues, create a concrete development plan and implement the fix directly.
5. After fixes, run lint, tests, build, release scan, API contract checks, and any focused regression tests needed by the changed risk area.
6. Commit the final code and state any remaining risks that were not handled.

## Severity Guide

- P0: Blocks release or can cause severe data loss, account leakage, payment/points corruption, security exposure, unusable generation flow, or a hard crash in normal production use.
- P1: High-impact release risk, including broken abnormal paths, runtime incompatibility, stale sync state, missing backend contract, media persistence failure, or concurrency race.
- P2: Important but not release-blocking, including misleading UI, cleanup gaps, weak diagnostics, minor performance waste, low-risk dead code, or maintainability issues.

## Execution Gate

A release approval is not complete until:

1. Latest remote code has been checked.
2. P0/P1 issues are either fixed or explicitly documented as blocked with evidence.
3. Confirmed P2 fixes that are low-risk and local are applied, or documented as deferred.
4. The full release validation command has passed.
5. The final commit hash is reported.
