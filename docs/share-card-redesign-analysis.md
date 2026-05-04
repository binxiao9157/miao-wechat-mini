# 日记分享卡片重设计分析

> 分析日期：2026-05-04
> 对比文件：`pic/stitch_remix_of_remix_of_1.`（日记主页）与 `pic/stitch_remix_of_remix_of_1. (1)`（分享卡片设计稿）

## 一、当前小程序分享朋友圈完整链路

```
用户点击分享按钮 → handleShare(diary)
  ├─ 1. updateSharingDiary(diary)  // 保存当前日记到 ref
  ├─ 2. generateShareCardImage(diary)  // Canvas 绘制分享卡片图
  │     └─ generateShareCard({ canvasId, catName, catAvatar, content, mediaUrl })
  │         → 600×600px Canvas 2D 绘制 → canvasToTempFilePath → 返回临时图片路径
  └─ 3. setShowShareSheet(true)  // 打开 ShareSheet 面板

ShareSheet 面板（底部弹出）：
  ├─ 好友列表 → 直接通过 API 发送站内通知
  ├─ 微信好友 → <Button openType="share"> → 触发 useShareAppMessage
  └─ 朋友圈 → handleShareToMoments()
        └─ Taro.showShareImageMenu({ path: shareCardPath })
            → 系统分享面板 → 用户保存/分享到朋友圈

补充：useShareTimeline 也注册了，会使用 Canvas 生成的卡片图作为 imageUrl
```

**涉及的关键文件：**

| 文件 | 职责 |
|------|------|
| `src/utils/shareCard.ts` | Canvas 绘制分享卡片图 |
| `src/utils/qrCanvas.ts` | QR 码生成（自实现，无外部依赖） |
| `src/components/common/ShareSheet.tsx` | 分享面板 UI |
| `src/components/common/ShareSheet.less` | 分享面板样式 |
| `src/pages/diary/index.tsx` | 日记页面，集成分享逻辑 |
| `scripts/taro-plugin-share-timeline.js` | 构建插件，注入 enableShareTimeline |
| `docs/wechat-timeline-share.md` | 朋友圈分享技术方案文档 |

## 二、当前 Canvas 分享卡片设计（shareCard.ts）

| 属性 | 当前实现 |
|------|---------|
| **尺寸** | 600×600px（1:1 正方形） |
| **背景** | 米白 `#FFF9F5`，顶部渐变条 `#FF9D76→#FF6B3D` |
| **布局** | 纵向排列：头像+名字+日期 → 图片(280px高) → 文字(4-8行) → QR码+品牌 |
| **头像** | 圆形 52px，带阴影+白色边框环 |
| **图片** | 居中 560×280，圆角 16px，aspect-cover 裁剪 |
| **文字** | 15px sans-serif，最多4行(有图)/8行(无图)，自动省略 |
| **QR码** | 左下角 56×56，白底圆角卡片包裹，内容 `miao://diary` |
| **品牌** | "Miao" 粗体 + "长按识别小程序码" + "记录猫咪的美好时光" |
| **分隔线** | 渐变分隔线 `rgba(232,159,113,0.15→0.3→0.15)` |

**数据模型接口：**

```typescript
interface ShareCardOptions {
  canvasId: string;
  catName: string;
  catAvatar?: string;
  content: string;
  mediaUrl?: string;
  width?: number;
  height?: number;
}
```

## 三、设计稿分析（stitch_remix_of_remix_of_1. (1)）

设计稿为 HTML/CSS 实现，标题为 "Miao Journal - Social Share"，采用 Tailwind CSS + Material Symbols 图标。

| 属性 | 设计稿 |
|------|--------|
| **尺寸** | 390px 宽，9:19 竖屏比例（约 390×822） |
| **背景** | 渐变 `#FFF5F0→#FFE8D6`，白色 8px 半透明边框（`border-white/40`），圆角 3xl |
| **布局** | 顶部 Header → 大图(4:5) → 标题+文字 → 底部 QR footer |
| **Header** | Miao logo（pets 图标）+ "Daily Journal" 胶囊标签（`bg-white/40 backdrop-blur-md`） |
| **图片** | 4:5 比例，圆角 2xl，左上角浮层日期徽章（日历图标+格式化日期） |
| **标题** | 2xl 粗体，tracking-tight（"懒洋洋的午后"） |
| **文字** | sm 正文，带装饰性爱心分隔线 |
| **QR 区域** | 独立 footer 区，毛玻璃背景（`bg-white/20 backdrop-blur-sm`）+ 白色/30 上边框，圆角顶部 |
| **QR码** | 80×80，白底圆角卡片，微旋转 3deg，左上角浮动 qr_code_2 图标 |
| **品牌文案** | 左侧 "Scan to meet" / "My Digital Cat" / 脉冲动画点 + "Miao Mini Program" |
| **装饰** | 背景浮动模糊光斑（orange/5, brown/5，blur-3xl） |
| **阴影** | `japanese-minimalist-shadow`：`0 10px 40px -10px rgba(135, 77, 32, 0.12)` |

**设计稿色系（brand token）：**

| Token | Hex | 用途 |
|-------|-----|------|
| brand-brown | `#874D20` | 主文字、标题 |
| brand-orange | `#E69B67` | 图标、强调色 |
| brand-beige | `#FFF5F0` | 浅背景 |
| brand-cream | `#FFE8D6` | 渐变终点 |
| brand-dark | `#1F1B17` | 深色文字 |

## 四、关键差异对比

| 维度 | 当前实现 | 设计稿 | 差距评估 |
|------|---------|--------|----------|
| **比例** | 1:1 正方形 (600×600) | 9:19 竖屏 (390×822) | ⚠️ **重大差异** — 朋友圈竖屏卡片视觉效果更佳，当前正方形偏矮 |
| **Header** | 无品牌 Header，直接头像+名字 | Miao logo + Daily Journal 标签 | ⚠️ 缺少品牌标识区 |
| **日期** | 头像旁小字 | 图片上浮层徽章（日历图标+格式化日期） | ⚠️ 设计稿更精致 |
| **图片** | 560×280 (2:1)，偏扁 | 4:5 竖图，更大更突出 | ⚠️ 设计稿图片占比更大 |
| **标题** | 无独立标题，只有内容文字 | 独立标题行（"懒洋洋的午后"） | ⚠️ **缺失** — 当前 DiaryEntry 没有 title 字段 |
| **文字区** | 纯文字 | 文字 + 装饰性爱心分隔线 | 小差异 |
| **QR码** | 左下角 56×56，平铺 | 右下 80×80，微旋转3°，浮动图标 | 设计稿更有设计感 |
| **品牌区** | QR 旁简单文字 | 独立 footer，毛玻璃背景，多层文案 | ⚠️ 设计稿更丰富 |
| **装饰** | 无 | 背景模糊光斑 | 设计稿更精致 |
| **数据模型** | `{ catName, catAvatar, content, mediaUrl }` | 需要 `{ title, image, content, qrCode }` | ⚠️ **缺少 title 字段** |

## 五、能否直接使用设计稿？

**结论：不能直接使用，需要适配改造。** 核心阻碍如下：

### 5.1 数据模型缺字段

当前 `DiaryEntry` 没有 `title` 字段，设计稿中展示的"懒洋洋的午后"标题无处取值。需要：
- 方案 A：在 `DiaryEntry` 数据模型中增加 `title` 字段（需同步修改创建日记流程）
- 方案 B：分享卡片中用内容前 N 字自动截取作为标题（无需改数据模型，但效果有限）

### 5.2 Canvas 绘制 vs HTML/CSS

设计稿是 Tailwind HTML，小程序分享卡片**必须**用 Canvas API 绘制（微信 `showShareImageMenu` 只接受图片路径）。需要将设计稿的视觉效果翻译成 Canvas 绘制指令，不能直接用 HTML。

### 5.3 比例需要调整

当前 1:1 → 设计稿 9:19。Canvas 尺寸需要重新定义。朋友圈竖屏卡片更合理，但需确认微信 `showShareImageMenu` 对非正方形图片的实际表现。

### 5.4 QR码内容需修正

当前 QR 内容是 `miao://diary`（硬编码占位符），无法扫码跳转。设计稿暗示应放真正的小程序码。需要：
- 接入微信 `wxacode.getUnlimited` API 生成可跳转的小程序码
- 或在后端实现小程序码生成服务

### 5.5 装饰效果在 Canvas 中实现复杂

毛玻璃（backdrop-blur）、模糊光斑（blur-3xl）、微旋转等效果在 Canvas 2D 中需要手动模拟或简化：
- 毛玻璃 → 可用半透明白色覆盖 + 模糊预渲染模拟
- 模糊光斑 → 可用 Canvas shadowBlur 绘制渐变圆
- 微旋转 → Canvas 支持 `ctx.rotate()`，可实现

### 5.6 字体限制

设计稿用 Plus Jakarta Sans，小程序 Canvas 不支持自定义字体（除非通过 `wx.loadFontFace` 预加载且字体文件在白名单域名下），实际渲染会回退到系统字体。

## 六、改造路径建议

| 优先级 | 改造项 | 工作量 | 说明 |
|--------|--------|--------|------|
| **P0** | 调整 Canvas 尺寸为竖屏比例（如 600×1067，即 9:16） | 小 | 朋友圈竖屏图更符合用户阅读习惯 |
| **P0** | 增加 Header 品牌区（Miao logo 文字 + 标签） | 小 | 用 Canvas fillText 绘制，无需图标字体 |
| **P0** | 增加独立标题行 | 中 | 需同步修改 DiaryEntry 数据模型和创建日记 UI |
| **P1** | 图片改为 4:5 比例 + 日期浮层 | 中 | 日期浮层用 Canvas 叠加绘制 |
| **P1** | 重构底部 QR 区为独立 footer 区 | 中 | 毛玻璃效果用半透明白底模拟 |
| **P1** | QR码替换为真正的小程序码 | 大 | 需后端 API 或云函数调用微信接口 |
| **P2** | 添加装饰性元素（分隔线、光斑） | 小 | Canvas shadowBlur 实现模糊光斑 |
| **P2** | QR码微旋转 + 浮动图标 | 小 | `ctx.rotate(3 * Math.PI / 180)` |
| **P2** | 自定义字体加载（Plus Jakarta Sans） | 中 | `wx.loadFontFace` + 白名单域名配置 |

## 七、设计稿色系与现有小程序色系对照

| 设计稿 Token | 设计稿 Hex | 小程序对应 Token | 小程序 Hex | 匹配度 |
|-------------|-----------|-----------------|-----------|--------|
| brand-brown | `#874D20` | on-surface | `#633E1D` | 接近，设计稿更深 |
| brand-orange | `#E69B67` | primary-container | `#E69B67` | ✅ 完全一致 |
| brand-beige | `#FFF5F0` | background | `#FFF9F5` | 接近，设计稿更暖 |
| brand-cream | `#FFE8D6` | — | — | 小程序无直接对应 |
| brand-dark | `#1F1B17` | on-primary-fixed | `#311300` | 色调方向不同 |

色系整体一致，均为暖棕/蜜桃色调，可直接沿用现有小程序 design token，局部微调即可。

## 八、总结

设计稿在视觉效果上显著优于当前 Canvas 实现，核心提升在于：竖屏比例、品牌 Header、独立标题、精致 QR 区域。但受限于小程序 Canvas 绘制能力和数据模型，需要逐步适配。建议按 P0→P1→P2 优先级分阶段实施，P0 改造即可获得明显的视觉提升。