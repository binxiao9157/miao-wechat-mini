# Miao 数据刷新同步架构分析

## 1. 现状问题总览

当前项目的数据同步本质上是"本地优先 + 登录时一次性同步 + 写操作 fire-and-forget"的模式，缺少系统性的实时/准实时同步机制。

### 1.1 同步时机严重不足

| 场景 | 当前行为 | 问题 |
|---|---|---|
| 登录后 | `syncFromServer` 拉取猫咪/日记/信件/积分 | 唯一的全量同步点 |
| 注册后 | 仅 `refreshCatStatus()` | **不调用 syncFromServer** |
| App 重开 | `ensureServerAccountForLocalUser` | **不同步服务端数据**，只确保账号存在 |
| 切回前台 | 无任何同步 | 用户看不到其他设备的变更 |
| 好友相关 | 仅 Diary 页面挂载时同步 | 其他页面看不到好友更新 |
| 通知 | 仅打开通知页时拉取 | Profile 红点只基于本地计算，与服务端不一致 |

**关键代码位置：**

- `AuthContext.tsx:104-115` — App 初始化只做 `ensureServerAccountForLocalUser`，不调用 `syncFromServer`
- `AuthContext.tsx:167-190` — `register` 函数只调用 `refreshCatStatus()`，不同步服务端
- `AuthContext.tsx:117-165` — `login` 函数在登录成功后调用 `syncFromServer`，是唯一的全量同步点
- `MainLayout.tsx` — 无 `visibilitychange` 监听，切回前台不触发同步

### 1.2 写操作全量上传问题

| 操作 | 当前行为 | 代码位置 | 问题 |
|---|---|---|---|
| `saveDiaries` | 逐条调用 `syncDiaryToServer` | `storage.ts:928-943` | 200 条日记 → 200 个请求 |
| `saveTimeLetters` | 逐条调用 `syncLetterToServer` | `storage.ts:973-979` | 同上 |
| `savePoints` | 每次调用都 `syncPointsToServer` | `storage.ts:862-868` | 在线计时每分钟 1 次，高频浪费 |
| 好友日记点赞/评论 | 仅修改本地 `storage` | `Diary.tsx:234-287` | **不同步到服务端**，其他设备看不到 |

### 1.3 跨页面状态不一致

MainLayout 使用 `renderPersistentTab`（`MainLayout.tsx:52-84`）实现类 Keep-Alive 效果——页面挂载后不会卸载。这意味着：

- **Diary 页面**：首次挂载时 `syncFriends` + `syncFriendDiaries`，之后不再刷新
- **Points 页面**：只在 `visibilitychange` 时重新读取本地 `storage.getPoints()`，不从服务端拉取
- **NotificationList 页面**：只在路由激活时 `loadAll()`，切到其他 Tab 后新通知不会出现
- **Profile 红点**：只计算本地通知（`computeNotifications`），不含服务端通知

### 1.4 其他问题

| 问题 | 代码位置 | 说明 |
|---|---|---|
| `syncFromServer` 串行执行 | `storage.ts:645-753` | 猫咪→日记→信件→积分串行请求，总耗时叠加 |
| 积分同步策略粗糙 | `storage.ts:734-753` | 只比较 `total` 值取较大者，不合并 `history`/`onlineMinutes` 等字段 |
| 双写无重试 | `storage.ts:221-294` | 所有 `syncXxxToServer` 调用都是 `.catch(() => {})`，失败后无重试 |
| 跨 Tab 状态不同步 | `storage.ts:310-324` | `storage` 事件只清缓存不触发 React 重渲染 |
| login 中 refreshCatStatus 冗余调用 | `AuthContext.tsx:127-128` | 调用了两次 |
| mockFriendService 死代码 | `mockFriendService.ts:98-125` | `initializeMockData` 未被任何地方调用 |

---

## 2. 推荐方案：分层同步架构

根据数据实时性要求，将数据分为三层，采用不同同步策略：

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: 关键数据 — 登录/切前台时全量同步            │
│  猫咪、日记、信件、积分、好友列表                      │
├──────────────────────────────────────────────────────┤
│  Layer 2: 社交数据 — 定时轮询 + 事件驱动              │
│  好友动态、好友邀请、通知                              │
├──────────────────────────────────────────────────────┤
│  Layer 3: 写操作 — 防抖批量上传                        │
│  日记保存、积分更新、信件保存                          │
└──────────────────────────────────────────────────────┘
```

### 2.1 Layer 1：关键数据 — 登录/切前台时全量同步

**触发时机：**

- 登录成功后（已有）
- 注册成功后（需补充）
- App 从后台切回前台（`visibilitychange`，核心新增）
- 首次打开 App 且已有本地用户（`AuthContext` 初始化，需补充）

**实现方式：** 在 `AuthContext` 中新增全局 `syncAll()` 方法，替代当前分散的同步调用：

```typescript
// AuthContext.tsx 新增
const syncAll = useCallback(async () => {
  const currentUser = storage.getUserInfo();
  if (!currentUser) return;

  try {
    // 并行请求，而非当前 syncFromServer 的串行
    await Promise.allSettled([
      storage.syncFromServer(currentUser.username),  // 猫咪/日记/信件/积分
      friendService.syncFriends(),                    // 好友列表
      friendService.syncFriendDiaries(),              // 好友动态
    ]);
    refreshCatStatus();
  } catch (e) {
    // 静默失败，不阻断用户操作
  }
}, [refreshCatStatus]);
```

**切前台同步：** 在 `MainLayout` 或 `App.tsx` 顶层监听：

```typescript
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      syncAll();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [syncAll]);
```

**防抖：** 切前台同步加 30 秒冷却时间，避免频繁切换导致重复请求：

```typescript
let lastSyncTime = 0;
const handleVisibility = () => {
  if (document.visibilityState === 'visible' && Date.now() - lastSyncTime > 30_000) {
    lastSyncTime = Date.now();
    syncAll();
  }
};
```

### 2.2 Layer 2：社交数据 — 定时轮询 + 事件驱动

#### 2.2.1 好友动态刷新

当前 Diary 页面（`Diary.tsx:79-101`）只在挂载时同步一次。改为定时轮询：

```typescript
// Diary.tsx
useEffect(() => {
  loadData(); // 首次加载

  const intervalId = setInterval(() => {
    friendService.syncFriendDiaries().then(() => {
      setFriendDiaries(storage.getFriendDiaries());
    }).catch(() => {});
  }, 5 * 60 * 1000); // 每 5 分钟静默刷新

  return () => clearInterval(intervalId);
}, []);
```

#### 2.2.2 通知红点一致性

当前 Profile 页面（`Profile.tsx:70-90`）的 `computeNotifications` 只计算本地通知，需要合并服务端通知：

```typescript
// Profile.tsx
const checkNotifications = useCallback(async () => {
  const local = computeNotifications();
  let server: NotificationItem[] = [];
  try {
    server = await fetchServerNotifications();
  } catch {}
  const all = [...server, ...local];
  const unread = all.filter(n => !n.isRead);
  setUnreadCount(unread.length);
}, []);
```

#### 2.2.3 好友邀请通知

当前没有"被添加为好友"的推送机制。建议：

- **方案 A（轻量）**：在 `syncFriends` 时对比好友列表长度，新增好友时生成一条本地通知
- **方案 B（完整）**：服务端新增 `/api/v1/friends/pending` 接口，返回待处理的好友请求

### 2.3 Layer 3：写操作 — 防抖批量上传

**核心问题：** 当前 `saveDiaries` 每次保存都逐条上传所有日记，`savePoints` 每分钟上传一次。

**解决方案：** 引入脏标记 + 防抖同步队列

```typescript
// services/syncQueue.ts（新文件）
type SyncTask = {
  type: 'diary' | 'letter' | 'points' | 'cat';
  id?: string;       // 资源 ID（日记/信件/猫咪）
  action: 'upsert' | 'delete';
  payload?: any;
};

class SyncQueue {
  private dirty = new Map<string, SyncTask>();  // key = `${type}:${id}`
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 5000;  // 5 秒防抖

  enqueue(task: SyncTask) {
    const key = task.id ? `${task.type}:${task.id}` : task.type;
    this.dirty.set(key, task);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.DEBOUNCE_MS);
  }

  private async flush() {
    const tasks = Array.from(this.dirty.values());
    this.dirty.clear();
    this.timer = null;

    // 按类型分组，批量发送
    const grouped = new Map<string, SyncTask[]>();
    for (const t of tasks) {
      const group = grouped.get(t.type) || [];
      group.push(t);
      grouped.set(t.type, group);
    }

    for (const [type, items] of grouped) {
      try {
        if (type === 'points') {
          // 积分：只发最新值
          await syncPointsToServer(getCurrentUsername(), storage.getPoints());
        } else {
          // 日记/信件/猫咪：批量上传
          for (const item of items) {
            await this.syncSingleItem(item);
          }
        }
      } catch {
        // 失败的重新入队
        for (const item of items) this.enqueue(item);
      }
    }
  }
}

export const syncQueue = new SyncQueue();
```

**改造 `storage.ts` 中的双写：**

```typescript
// 改造前：saveDiaries 逐条上传
saveDiaries: (diaries: DiaryEntry[]): boolean => {
  // ... 保存到 localStorage ...
  const userId = getCurrentUsername();
  if (userId) {
    for (const d of trimmed) syncDiaryToServer(userId, d);  // 逐条上传
  }
  return success;
};

// 改造后：入队防抖批量上传
saveDiaries: (diaries: DiaryEntry[]): boolean => {
  // ... 保存到 localStorage ...
  const userId = getCurrentUsername();
  if (userId) {
    for (const d of trimmed) {
      syncQueue.enqueue({ type: 'diary', id: d.id, action: 'upsert', payload: d });
    }
  }
  return success;
};

// 积分改造
savePoints: (points: PointsInfo) => {
  const key = getUserKey(USER_DATA_KEYS.POINTS);
  storage.setItem(key, JSON.stringify(points));
  invalidateCache(key);
  // 不再立即上传，入队防抖
  syncQueue.enqueue({ type: 'points', action: 'upsert', payload: points });
};
```

---

## 3. syncFromServer 并行化优化

当前 `storage.syncFromServer`（`storage.ts:645-753`）串行执行 4 个请求，可以改为并行：

```typescript
// 改造前：串行，总耗时 = 猫咪 + 日记 + 信件 + 积分
syncFromServer: async (username: string): Promise<void> => {
  await syncCats();
  await syncDiaries();
  await syncLetters();
  await syncPoints();
};

// 改造后：并行，总耗时 = max(猫咪, 日记, 信件, 积分)
syncFromServer: async (username: string): Promise<void> => {
  await Promise.allSettled([
    syncCats(),
    syncDiaries(),
    syncLetters(),
    syncPoints(),
  ]);
};
```

---

## 4. 积分同步策略优化

当前策略（`storage.ts:734-753`）：`serverTotal > localTotal ? 取服务端 : 上传本地`

问题：不合并 `history`、`onlineMinutes`、`dailyInteractionPoints` 等字段。

**改进方案：** 字段级合并

```typescript
function mergePoints(local: PointsInfo, remote: PointsInfo): PointsInfo {
  return {
    total: Math.max(local.total, remote.total),
    lastLoginDate: latest(local.lastLoginDate, remote.lastLoginDate),
    dailyInteractionPoints: Math.max(local.dailyInteractionPoints, remote.dailyInteractionPoints),
    lastInteractionDate: latest(local.lastInteractionDate, remote.lastInteractionDate),
    onlineMinutes: Math.max(local.onlineMinutes, remote.onlineMinutes),
    lastOnlineUpdate: Math.max(local.lastOnlineUpdate, remote.lastOnlineUpdate),
    // history 合并：按 id 去重，保留最新
    history: mergeHistories(local.history, remote.history),
  };
}

function latest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function mergeHistories(local: PointTransaction[], remote: PointTransaction[]): PointTransaction[] {
  const map = new Map<string, PointTransaction>();
  for (const t of [...local, ...remote]) {
    const existing = map.get(t.id);
    if (!existing || t.timestamp > existing.timestamp) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
}
```

---

## 5. 全局事件总线优化

当前用 `window.dispatchEvent(new CustomEvent(...))` 做跨组件通信，事件列表分散：

| 事件名 | 触发位置 | 监听位置 |
|---|---|---|
| `active-cat-changed` | `storage.setActiveCatId` | Home, Diary, Profile |
| `cat-updated` | Home 删除猫咪后 | Home |
| `diary-updated` | `storage.saveDiaries` | Profile |
| `notifications-read` | `storage.markNotificationsAsRead` | Profile |
| `fast-forward-changed` | `storage.setIsFastForward` | Profile, NotificationList |

**问题：** 事件名是硬编码字符串，没有类型安全；新增数据类型时容易遗漏。

**建议：** 统一为 `DataSyncEvent`，在 `syncAll` 完成后统一派发：

```typescript
// 事件类型
type SyncEventType =
  | 'cats-synced'
  | 'diaries-synced'
  | 'points-synced'
  | 'friends-synced'
  | 'notifications-synced'
  | 'all-synced';

// syncAll 完成后
window.dispatchEvent(new CustomEvent('data-synced', {
  detail: { type: 'all-synced', timestamp: Date.now() }
}));
```

各页面统一监听 `data-synced` 事件，根据 `detail.type` 决定是否刷新。

---

## 6. 当前各页面数据请求清单

| 页面 | 文件 | useEffect 请求 | 触发条件 | 问题 |
|---|---|---|---|---|
| Home | `Home.tsx:89-171` | 积分初始化 + 登录奖励 + 在线时长 setInterval(60s) | 挂载一次 | 每分钟触发 savePoints → syncPointsToServer |
| Diary | `Diary.tsx:79-101` | `loadData()`: 日记 + syncFriends + syncFriendDiaries | 挂载 + cat-changed | 串行 await，无定时刷新 |
| Points | `Points.tsx:24-47` | `storage.getPoints()` + visibilitychange | 挂载一次 | 只读本地，不从服务端拉取 |
| SwitchCompanion | `SwitchCompanion.tsx:15-28` | `storage.getCatList()` + `getPoints()` + visibilitychange | 挂载一次 | 同上 |
| NotificationList | `NotificationList.tsx:158-164` | `loadAll()`: 本地通知 + 服务端通知 | 路由激活 | 无后台轮询 |
| Profile | `Profile.tsx:22-66` | `loadStats()` + 事件监听 | 挂载一次 | 红点只基于本地通知 |
| TimeLetters | `TimeLetters.tsx:245-249` | 刷新信件列表 | 路由激活 | 无服务端同步触发 |
| AddFriendQR | `AddFriendQR.tsx:30` | `friendService.createInvite()` | 挂载一次 | 无问题 |
| ScanFriend | `ScanFriend.tsx:170-182` | 启动扫码器 + URL 参数处理 | 挂载一次 | 无问题 |
| AuthContext | `AuthContext.tsx:104-115` | `ensureServerAccountForLocalUser` | 挂载一次 | 不同步服务端数据 |

---

## 7. 实施优先级

| 优先级 | 改动 | 预期收益 | 涉及文件 |
|---|---|---|---|
| **P0** | `syncFromServer` 改为 `Promise.allSettled` 并行 | 登录同步速度提升 3-4 倍 | `storage.ts` |
| **P0** | `AuthContext` 初始化 + 注册后调用 `syncAll` | 修复注册后不同步、App 重开不同步的 bug | `AuthContext.tsx` |
| **P0** | `MainLayout` 监听 `visibilitychange` 触发 `syncAll` | 切回前台时数据自动更新 | `MainLayout.tsx` 或 `App.tsx` |
| **P1** | 引入 `SyncQueue` 防抖批量上传 | 减少网络请求量 80%+ | 新增 `syncQueue.ts`，改造 `storage.ts` |
| **P1** | Diary 页面增加 5 分钟轮询刷新好友动态 | 好友内容准实时更新 | `Diary.tsx` |
| **P1** | Profile 红点合并服务端通知 | 修复红点数不一致 | `Profile.tsx` |
| **P2** | 积分合并策略改为字段级合并 | 避免多设备积分丢失 | `storage.ts` |
| **P2** | 好友日记点赞/评论同步到服务端 | 多设备好友互动一致 | `Diary.tsx`, `server.ts` |
| **P2** | 统一 `data-synced` 事件总线 | 降低维护成本，类型安全 | 全局 |
| **P3** | `saveDiaries` 只上传脏数据（diff） | 进一步减少上传量 | `storage.ts` |
| **P3** | 清理 `mockFriendService` 死代码 | 代码整洁 | 删除 `mockFriendService.ts` |
| **P3** | 修复 `login` 中 `refreshCatStatus` 冗余调用 | 消除重复渲染 | `AuthContext.tsx:127-128` |