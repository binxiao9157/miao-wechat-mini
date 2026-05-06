# 调试模式统一方案

## 现状

当前存在 3 个独立的调试模式入口，分散在不同页面：

| # | 调试模式 | 入口 | 状态存储 | 效果 |
|---|---------|------|---------|------|
| 1 | 积分作弊 | 积分页 5 点击标题 / 底部可见文字 | `useState`（页面级，不持久化） | `effectivePoints` 强制 ≥ 兑换阈值 |
| 2 | 时光快进 | 时光信件页 5 点击标题 | `storage.setIsFastForward()`（持久化） | 倒计时 ÷60，解锁判定 ×60 |
| 3 | Admin 后台 | 个人中心 5 点击标题 → 跳转 | 无状态，仅导航 | AI 模型配置 + 预设猫管理 |

问题：
- 入口分散，开发者需记住三个不同页面的触发位置
- 积分页底部有可见的"调试模式点击入口"文字，生产环境虽已隐藏但仍属冗余
- 积分作弊不持久化，离开页面即丢失
- 三个页面各自重复实现 5 点击计数逻辑

## 目标

将 #1、#2 移入 #3 的 Admin Settings 页面，**个人中心 5 点击成为唯一调试入口**。

## 具体改动

### 1. `storage.ts` — 新增积分调试持久化

新增 key 和方法：

```typescript
const POINTS_CHEAT_KEY = 'miao_debug_points_cheat';

getIsPointsCheat(): boolean {
  return getItem(POINTS_CHEAT_KEY) === 'true';
}

setIsPointsCheat(val: boolean): void {
  setItem(POINTS_CHEAT_KEY, String(val));
}
```

当前 #1 不持久化（离开页面即丢失），改为与 #2 一致持久化到 storage。

### 2. `admin-settings/index.tsx` — 新增"调试工具"分区

在现有"AI 模型配置"和"预设猫管理"之后，新增调试工具区块：

```
┌─ 调试工具 ─────────────────────┐
│  积分作弊    [Switch]           │
│  时光快进    [Switch]           │
│  (提示文字：仅开发环境可用)      │
└────────────────────────────────┘
```

- 两个 Switch 组件，读写对应的 storage key
- 切换时同步更新 storage + 本地 state
- 整个区块用 `process.env.NODE_ENV === 'development'` 守卫，生产环境不渲染

### 3. `points/index.tsx` — 移除独立调试逻辑

- 删除 `isDebugMode`、`debugTapRef`、`debugTimerRef`、`handleDebugTap`
- 删除底部 `<View className="debug-entry">` 可见入口
- `effectivePoints` 改为从 `storage.getIsPointsCheat()` 读取
- 标题 `onClick` 移除
- 新增 `useDidShow` 重新读取 storage 值（见下文说明）

### 4. `time-letters/index.tsx` — 移除独立调试入口

- 删除 `debugTapRef`、`debugTimerRef`、`handleDebugTap`
- 保留 `isFastForward` state，初始值从 `storage.getIsFastForward()` 读取（已有）
- 开关由 admin-settings 控制，本页不再提供切换入口
- 标题 `onClick` 移除
- 新增 `useDidShow` 重新读取 storage 值（见下文说明）

### 5. `profile/index.tsx` — 保持不变

5 点击跳转 admin-settings 的逻辑不变，作为唯一调试入口。

## useDidShow 同步说明

Taro 小程序中，`navigateTo` 跳转时当前页面不会卸载，只是隐藏。`navigateBack` 回来时组件不会重新 mount，`useState` 初始值不会重新执行。

场景示例：

1. 用户打开时光信件页 → `isFastForward` 从 storage 读到 `false`
2. 用户去个人中心 → 5 点击 → 进入 admin-settings
3. 在 admin-settings 打开"时光快进"开关 → storage 写入 `true`
4. 用户返回时光信件页 → 组件仍在内存中，`isFastForward` 仍为 `false`

因此需要在 `useDidShow` 中重新读取 storage：

```typescript
// time-letters/index.tsx
useDidShow(() => {
  setIsFastForward(storage.getIsFastForward());
});

// points/index.tsx
useDidShow(() => {
  setIsPointsCheat(storage.getIsPointsCheat());
});
```

这是将开关移到其他页面后才出现的问题——当前 #1 和 #2 的开关在本页面上，state 是本地点击直接改的，不存在同步问题。

## 数据流变化

```
Before:
  积分页 5点击 → 本地 state → 影响积分显示
  时光页 5点击 → storage → 影响倒计时/解锁
  个人中心 5点击 → 导航 admin-settings

After:
  个人中心 5点击 → 导航 admin-settings
    ├→ 积分作弊 Switch → storage → 积分页 useDidShow 读取
    └→ 时光快进 Switch → storage → 时光页 useDidShow 读取
```

## 优点

- **单一入口**：开发者只需记住一个入口
- **集中管理**：所有调试开关在同一页面，状态一目了然
- **消除可见文字**：移除积分页底部"调试模式点击入口"
- **持久化统一**：#1 原来不持久化，现在也持久化了，切换页面不丢失
- **代码精简**：移除积分页和时光页的重复 5 点击逻辑

## 注意事项

- 积分页和时光页必须在 `useDidShow` 中重新读取 storage 值，否则从 admin-settings 切回来不会刷新
- 如果未来调试开关增多（如 mock 用户、模拟通知等），admin-settings 页面需要滚动，可考虑分 tab
- 所有调试相关代码均已有 `process.env.NODE_ENV === 'development'` 守卫，生产环境不可用