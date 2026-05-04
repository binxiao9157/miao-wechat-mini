# 本地代码修改复盘分析报告

> 日期：2026-05-03
> 基线提交：小程序 `4698159` (feat: align mini-program with PWA — Phase 0-2 complete) / PWA `83165c9` + 3 个未提交文件

---

## 一、变更概览

### 小程序 (`miao-wechat-mini`)

41 个文件变更，+2637/-575 行。最新提交 `4698159` 包含所有修改。

| 分类 | 文件 | 变更摘要 |
|------|------|---------|
| **认证与状态** | `AuthContext.tsx` | 新增 `isInitializing`/`hasCat`/`catCount` 状态、`updateProfile` 方法、`useMemo` 优化 |
| **积分兑换** | `empty-cat/index.tsx` | 透传 `isRedemption`/`redemptionAmount` 路由参数 |
| | `create-companion/index.tsx` | 同上 |
| | `upload-material/index.tsx` | 同上 |
| | `generation-progress/index.tsx` | 积分扣退逻辑 + 沉浸式状态文案 + 步骤标签重命名 |
| | `points/index.tsx` | 兑换入口跳转改为带积分参数 |
| **页面重构** | `feedback/index.tsx` + `.less` | 简单反馈 → 问卷调研 + 简易反馈双模式 |
| | `notifications/index.tsx` + `.less` | 通知列表 → 通知设置页（Switch 开关） |
| | `privacy-policy/index.tsx` + `.less` | 占位文本 → 完整法律隐私政策 |
| | `terms-of-service/index.tsx` + `.less` | 占位文本 → 完整法律服务条款 |
| **头像组件** | `CatAvatar.tsx` + `.less` | **新组件**：统一头像展示 + 加载失败兜底 |
| | `diary/index.tsx` | `activeCat` 含 avatar、视频 poster 用猫头像、add-friend-qr 参数简化 |
| | `cat-history/index.tsx` | Image → CatAvatar |
| | `switch-companion/index.tsx` | Image → CatAvatar |
| | `join-friend/index.tsx` + `.less` | 新增 inviterAvatar/catAvatar 展示 |
| | `scan-friend/index.tsx` + `.less` | 新增好友头像展示 |
| | `add-friend-qr/index.tsx` + `.less` | 远程 QR 图片 → Canvas 本地生成 + 保存相册 |
| **首页增强** | `home/index.tsx` + `.less` | 互动气泡、积分 Toast、时间问候 |
| **时光信件** | `time-letters/index.tsx` | 快进模式（5击触发）、长按强制解锁、CatAvatar 替换 |
| **组件增强** | `FrostedGlassBubble.tsx` + `.less` | 新增 `bubbleId`/`exiting` 属性、动画改进、less 文件名修正 |
| | `ShareSheet.tsx` + `.less` | 好友列表分享、微信分享、移除朋友圈、less 文件名修正 |
| **密码输入** | `change-password/index.tsx` | `type="text"` + `password` 属性 → `type` 动态切换 |
| | `reset-password/index.tsx` | 同上 |
| | `login/index.less` | 密码输入框布局修复 |
| **管理后台** | `admin-settings/index.tsx` + `.less` | 新增预设猫咪管理、`skipImageStage` 开关 |
| **存储层** | `storage.ts` | `request` 函数重构（移除 Web 分支 + 错误处理） |
| **AI 配置** | `aiConfig.ts` | 新增 `skipImageStage` 字段 |
| **QR 工具** | `utils/qrCanvas.ts` | **新文件**：自实现 QR Code 生成器（Version 1-6） |

### PWA (`Miao_remote`)

3 个文件未提交，+147/-34 行。

| 文件 | 变更摘要 |
|------|---------|
| `ChangePassword.tsx` | 本地密码校验 → 服务端 API `POST /api/v1/auth/set-password` |
| `friendService.ts` | 邀请链接从 `https://` URL 改为 `miao://` 深度链接协议 |
| `storage.ts` | 新增 `updatedAt` 字段、`mergeCat`/`normalizeCatVideoUrls`/`hasMeaningfulCatDifference`、`saveCatInfo` 自动更新 `updatedAt` |

---

## 二、严重问题（必须修复）

### 1. 积分兑换流程 — 退款不可靠，积分可丢失

**文件**: `generation-progress/index.tsx`

```typescript
// 扣积分（纯本地操作）
if (isRedemption && redemptionAmount > 0) {
  const success = storage.deductPoints(redemptionAmount, '解锁新伙伴');
  if (!success) throw new Error('积分不足...');
  pointsDeducted = redemptionAmount;
}
// ... 生成过程 ...
catch (err) {
  if (pointsDeducted > 0) {
    storage.addPoints(pointsDeducted, '生成失败退还');  // 退还也可能失败
  }
}
```

**问题**:
- 积分扣退均为本地 storage 操作，无服务端校验
- 用户在扣积分后关闭小程序 → 积分已扣但不会退还
- `catch` 中的 `addPoints` 也可能因 storage 异常失败，无重试机制
- **建议**: 积分操作应走服务端事务，或至少增加本地事务性保证（如先记录待退还状态）

### 2. 积分兑换参数可被 URL 篡改

**文件**: `empty-cat/index.tsx`、`create-companion/index.tsx`、`upload-material/index.tsx`、`generation-progress/index.tsx`

`isRedemption` 和 `redemptionAmount` 均从 URL 参数获取：
```typescript
const isRedemption = router?.params?.isRedemption === '1';
const redemptionAmount = Number(router?.params?.redemptionAmount) || 0;
```

**问题**:
- 用户可手动构造 URL `?isRedemption=0` 跳过积分扣除
- 用户可传入 `redemptionAmount=1` 以最低成本兑换
- **建议**: 兑换参数应从服务端获取或至少在 `generation-progress` 页面内重新校验积分余额

### 3. `upload-material` 参数拼接不一致

**文件**: `upload-material/index.tsx` vs `empty-cat/index.tsx`

```typescript
// upload-material: 带前缀 &
navigateTo({ url: `/pages/generation-progress/index?source=uploaded${redemptionParams}` });
// redemptionParams = '&isRedemption=1&redemptionAmount=100'

// empty-cat: 去掉前缀 &
navigateTo({ url: `/pages/upload-material/index?${redemptionParams.slice(1)}` });
// redemptionParams.slice(1) = 'isRedemption=1&redemptionAmount=100'
```

`empty-cat` 用 `slice(1)` 去掉 `&`，而 `upload-material` 直接拼接。两者拼接方式不统一但各自场景下恰好正确。不过这种隐式约定容易出错。

### 4. `storage.ts` request 函数 — 丢失 Web 环境分支和错误处理

**文件**: `src/services/storage.ts`

| | 远程版本 | 本地版本 |
|---|---------|---------|
| Web 环境 | `fetch()` + `response.ok` 检查 | **已删除** |
| 错误处理 | `!response.ok` 抛异常 | 无 |
| 参数格式 | `body: JSON.stringify(...)` + `Content-Type` | `data: {...}`（依赖 Taro 自动序列化） |

**问题**:
- 如果代码在 H5/Web 环境运行，所有 `request` 调用会失败
- `taroRequest` 返回的 `res.data` 可能包含错误结构（如 `{code: 400, message: "..."}`），调用方无法区分成功和失败
- `syncCatToServer` 等函数不再显式设置 `Content-Type`，依赖 Taro 默认行为

### 5. AuthContext `useMemo` 依赖不完整

**文件**: `src/context/AuthContext.tsx`

```typescript
const contextValue = useMemo(() => ({
  user, isAuthenticated, isInitializing, hasCat, catCount,
  login, wechatLogin, register, logout, updateProfile, refreshCatStatus,
}), [user, isAuthenticated, isInitializing, hasCat, catCount]);
```

`login`/`wechatLogin`/`register`/`logout`/`updateProfile`/`refreshCatStatus` 未加入依赖数组。当前因这些函数只依赖 `setState`（引用稳定）和模块级 `storage`，不会导致 bug。但未来如果函数引用了会变化的值，将产生闭包陷阱。

### 6. FrostedGlassBubble.less / ShareSheet.less — import 路径已修正

远程版本导入 `./index.less`（文件不存在），本地改为 `./FrostedGlassBubble.less` 和 `./ShareSheet.less`。这是**修复**，不是问题。✅

---

## 三、中等问题（建议修复）

### 7. notifications 页面 — 通知列表功能被完全删除

**文件**: `notifications/index.tsx`

远程版本是通知列表页（展示点赞、评论、好友申请），本地完全替换为通知设置页（3 个 Switch 开关）。

**问题**:
- 通知列表功能被删除，无迁移
- 如果有其他页面链接到"消息通知"，会进入设置页而非列表
- `pushNotifications`/`greetingsEnabled`/`timeLetterReminder` 三个开关**只保存到本地，没有任何代码读取这些设置来控制实际推送行为**，开关是"死"的

### 8. feedback 问卷 — 数据未上传服务端

**文件**: `feedback/index.tsx`

```typescript
const handleSurveySubmit = () => {
  // 校验必答题...
  storage.setHasSubmittedSurvey(true);  // 只标记本地
  setIsSuccess(true);
  setTimeout(() => navigateBack(), 2000);
};
```

- `surveyAnswers` 未发送到服务端，数据丢失
- `handleSimpleSubmit` 同样未上传
- 用户清除缓存后可重复提交

### 9. add-friend-qr — Canvas 二维码尺寸单位不匹配

**文件**: `add-friend-qr/index.tsx`

```tsx
// CSS 尺寸用 rpx
<Canvas style={{ width: '320rpx', height: '320rpx' }} />
// JS 绘制用 px
const size = 320;
canvas.width = size * dpr;
```

CSS `320rpx` ≈ `160px`（标准屏），但 Canvas 像素尺寸为 `320 * dpr`（如 2x 屏 = 640px）。绘制区域与显示区域不匹配，二维码可能变形或显示不全。

### 10. add-friend-qr — 保存图片未检查 qrReady

```typescript
const handleSaveImage = async () => {
  if (isSaving || !invitePayload || !cat) return;
  // 缺少: if (!qrReady) return;
```

用户在二维码绘制完成前点击保存，可能导出空白图片。

### 11. ShareSheet — 好友分享功能是假的

**文件**: `src/components/common/ShareSheet.tsx`

```typescript
onClick={() => {
  Taro.showToast({ title: `已分享给 ${friend.nickname}`, icon: 'none' });
  onClose();
}}
```

点击好友只弹 Toast，**没有实际发送分享消息**。`Taro.shareAppMessage` 不能在普通 onClick 中调用，只能在 `onShareAppMessage` 生命周期或 `open-type="share"` 按钮中使用。

### 12. time-letters — 快进模式 + 强制解锁的数据风险

**文件**: `time-letters/index.tsx`

- **快进模式**（标题 5 击触发）：倒计时除以 60，普通用户误触会导致所有信件倒计时异常加速
- **强制解锁**直接修改 `unlockAt = Date.now() - 1`，永久修改数据。关闭快进模式后信件仍显示为已解锁
- **建议**: 快进模式应增加确认弹窗；强制解锁应只在快进模式下可用，且应有"恢复原始时间"的选项

### 13. PWA storage.ts — `mergeCat` 的 `JSON.stringify` 比较 key 顺序敏感

**文件**: `Miao_remote/src/services/storage.ts`

```typescript
function hasMeaningfulCatDifference(a: CatInfo, b: CatInfo): boolean {
  return JSON.stringify({...a, placeholderImage: undefined, ...}) !==
         JSON.stringify({...b, placeholderImage: undefined, ...});
}
```

如果服务端返回的字段顺序与本地不同，`JSON.stringify` 结果不同，会产生误判导致不必要的同步。应使用深度比较或排序 key 后再比较。

### 14. PWA ChangePassword — 离线不可用

**文件**: `Miao_remote/src/pages/ChangePassword.tsx`

从本地密码校验改为纯服务端 API 校验。离线时修改密码会直接显示"网络错误"。

### 15. PWA friendService — `miao://` 深度链接未注册

**文件**: `Miao_remote/src/services/friendService.ts`

从 `https://` URL 改为 `miao://friend?invite=...`。如果应用未注册此 URL scheme，链接将无法打开。

---

## 四、轻微问题（可选修复）

### 16. generation-progress — useEffect 依赖缺失

```typescript
useEffect(() => {
  // ... 使用了 statusText 但未加入依赖
}, [progress, phase]);
```

缺少 `statusText` 依赖。当前是有意为之（避免循环），但不符合 hooks 规则。可用 `useRef` 替代。

### 17. admin-settings — `skipImageStage` 未被使用

`AIProfile` 接口新增了 `skipImageStage` 字段，admin-settings 页面有 Switch 控制，但**没有任何代码读取此值来跳过图片生成阶段**。属于半成品功能。

### 18. qrCanvas.ts — 自实现 QR 编码器可靠性

350 行自实现 QR Code 生成器，只支持 Version 1-6、Mask Pattern 0、EC Level M。未经过广泛测试，可能存在边缘情况编码错误。建议使用成熟库（如 `qrcode`）。

### 19. add-friend-qr — 缩进错误

```typescript
Taro.setClipboardData({
     inviteText,    // 多了 4 个空格
    success: () => {
```

不影响功能，但影响代码规范。

### 20. change-password / reset-password — Input type 修改

从 `type="text"` + `password={!showCurrent}` 改为 `type={showCurrent ? 'text' : 'password'}`。这是**修复**，因为 Taro 的 `password` 属性在部分平台上不生效。✅

### 21. privacy-policy / terms-of-service — 乱码修复

远程版本有乱码（`更新时间�?026�?�?日`），本地已替换为完整法律文本。✅

---

## 五、PWA 修改详细分析

### `ChangePassword.tsx`

| 变更 | 分析 |
|------|------|
| 本地密码校验 → `POST /api/v1/auth/set-password` | 正确：服务端校验更安全，防止本地密码绕过 |
| 新增 `saving` 状态 + loading 提示 | 正确：防止重复提交 |
| 错误码映射 `INVALID_CURRENT_PASSWORD`/`INVALID_PASSWORD_LENGTH` | 正确：更好的用户体验 |
| 成功后 `storage.updatePassword()` 同步本地 | 正确：保持本地缓存一致 |
| **风险**: 离线不可用 | 中等：PWA 离线场景较少 |

### `friendService.ts`

| 变更 | 分析 |
|------|------|
| `window.location.origin/scan-friend?invite=` → `miao://friend?invite=` | 需确认深度链接注册 |

### `storage.ts`

| 变更 | 分析 |
|------|------|
| `CatInfo` 新增 `updatedAt` | 正确：支持基于时间戳的合并 |
| `normalizePlayableVideoUrl()` | 正确：修复 localhost → 127.0.0.1、相对路径转绝对路径 |
| `mergeCat()` | 正确：智能合并 videoPaths、fallback 逻辑 |
| `hasMeaningfulCatDifference()` | 🟡 JSON.stringify 比较 key 顺序敏感 |
| `syncWithServer()` 重写 | 正确：使用 mergeCat + 排序 + 校验 activeCatId + 仅同步有差异的猫 |
| `saveCatInfo()` 自动更新 `updatedAt` | 正确：保证时间戳一致性 |

---

## 六、问题汇总

| 等级 | 数量 | 关键问题 |
|------|------|---------|
| 🔴 严重 | 5 | 积分扣退不可靠、URL 参数可篡改、request 函数丢失 Web 分支和错误处理、useMemo 依赖不完整 |
| 🟡 中等 | 9 | 通知功能丢失、问卷数据未上传、Canvas 尺寸不匹配、好友分享是假的、快进模式风险、JSON.stringify 比较、离线密码修改、深度链接未注册、保存图片未检查 qrReady |
| 🟢 轻微 | 6 | useEffect 依赖、skipImageStage 未使用、QR 编码器可靠性、缩进错误、CatAvatar 兜底逻辑正确性、change-password type 修复 |

---

## 七、优先修复建议

1. **积分兑换流程** — 服务端校验 + 事务性保证，或至少在 generation-progress 内重新校验积分余额
2. **`storage.ts` request 函数** — 补回错误处理（检查 `res.statusCode` 或 `res.data.code`），考虑补回 Web 分支
3. **`upload-material` 参数拼接** — 统一参数传递方式，避免隐式 `slice(1)` 约定
4. **notifications 开关** — 要么实现实际的推送控制逻辑，要么标注为"即将上线"
5. **feedback 问卷** — 增加服务端提交接口，或至少在本地存储问卷答案
6. **add-friend-qr Canvas 尺寸** — 使用 `Taro.createSelectorQuery()` 获取实际节点尺寸
7. **ShareSheet 好友分享** — 使用 `open-type="share"` 按钮或实现实际的分享消息发送