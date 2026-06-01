# 回归修复实施结果

## Summary

已完成本轮 P0/P1 回归修复的代码实施。除之前已经落地的生成链路、catId、首帧元数据、tabbar cover、积分/Miao 滚动修复外，本次新增修复首页视频上方 overlay 层级问题：点击层、错误重试、剧情/生成提示、互动气泡、积分 toast 均改为 `CoverView`，避免被微信原生 `Video` 盖住。

## Done

- `src/custom-tab-bar/index.tsx`：tabbar 使用 `CoverView/CoverImage`。
- `src/pages/home/index.tsx`：首页视频上方 `story-touch-layer`、错误重试、unlock badge、points toast、互动 bubble 使用 `CoverView`。
- `src/pages/home/index.test.tsx`：补充 `CoverView` 测试 mock。
- `src/pages/generation-progress/index.tsx`：生成初始化兼容无 `AbortController`，启动异常进入 error，首帧优先使用 `anchorFrame/placeholderImage`。
- `src/pages/create-companion/index.tsx` / `src/pages/upload-material/index.tsx`：创建/上传猫咪时保存首帧元数据并携带显式 `catId` 进入生成页。
- `src/pages/profile/index.tsx` / `src/pages/points/index.tsx`：header 移入 `ScrollView`。
- `src/utils/__tests__/codeQuality.test.ts`：增加 tabbar、首页 overlay、滚动容器、首帧元数据防线。

## Verification

- `npm test -- src/utils/__tests__/codeQuality.test.ts`：27 tests passed。
- `npm test -- src/pages/home/index.test.tsx`：7 tests passed。
- `npm test -- src/pages/generation-progress/index.test.tsx`：5 tests passed。
- `npm test -- src/pages/profile/index.test.tsx src/utils/__tests__/navigateAdapter.test.ts src/services/__tests__/debugReleaseGuards.test.ts`：7 tests passed。
- `npm test -- src/services/__tests__/volcanoService.test.ts src/services/__tests__/fileManager.test.ts src/services/__tests__/videoActions.test.ts`：13 tests passed。

## Gaps

- 全量测试、lint、weapp 构建和发布扫描放到发布验证闭环任务统一执行。
- `CoverView` 的视觉细节仍需真机确认。

## Artifacts

- `src/pages/home/index.tsx`
- `src/custom-tab-bar/index.tsx`
- `src/pages/generation-progress/index.tsx`
- `src/pages/create-companion/index.tsx`
- `src/pages/upload-material/index.tsx`
- `src/pages/profile/index.tsx`
- `src/pages/points/index.tsx`
- `src/utils/__tests__/codeQuality.test.ts`
