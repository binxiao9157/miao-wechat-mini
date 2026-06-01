# 发布回归修复实施

## Problem Definition

审计确认近期系统优化后存在 P0/P1 回归风险：生成流程可能停在 pending，首页 `Video` 原生层遮挡 tabbar 和上层交互，积分/Miao 页面 header 固定，发布防线尚需补充验证。需要在不改变 Taro 架构、不回退 PWA 视频模型的前提下修复这些问题。

## Proposed Solution

保留已经完成的生成链路、catId、首帧元数据、tabbar cover、ScrollView header 修复；继续补齐首页视频上方 overlay 的原生层级兼容，把点击层、错误重试、提示和 toast 改为可覆盖 `Video` 的 cover 组件或等价实现。补充静态回归测试，确保关键 overlay 不再使用普通 `View/Text`。

## Acceptance Criteria

- 首页视频页面底部 tabbar 使用 `CoverView/CoverImage`，不会被微信 `Video` 原生层盖住。
- 首页视频上层主点击区域、错误重试层、剧情/生成提示、互动气泡、积分 toast 使用 cover 组件或不会被 `Video` 盖住。
- 生成页兼容无 `AbortController` 的真机环境，初始化异常进入 error，不停留在 pending。
- 创建/上传进入生成页时携带显式 `catId` 并保存 `placeholderImage/anchorFrame`。
- 积分页和 Miao 页 header 位于各自 `ScrollView` 内。
- 对上述结构补测试或静态扫描防线。

## Verification Plan

- 先运行针对 codeQuality 和 generation-progress 的定向测试。
- 再运行全量 `npm test`、`npm run lint`、`npm run build:weapp`。
- 真机验证点留给发布验证闭环任务：生成后首页 tabbar 可见、首页点击可触发剧情、错误重试可点、积分/Miao 上滑 header 不固定。

## Risks

- `CoverView` 样式支持弱于普通 `View`，可能需要真机微调视觉。
- 微信 `Video` 多实例在不同基础库上表现可能不同，仍需真机长测。
- 当前任务不处理 H5 体积和 Taro 上游 audit 残留。

## Assumptions

- 不回退 PWA 四段视频模型。
- 当前小程序仍是 Taro 框架，所有修复在 Taro 组件层实现。
- 用户会在上传后进行真实机器验证。
