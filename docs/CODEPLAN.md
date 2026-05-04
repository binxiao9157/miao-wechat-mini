# Miao 功能开发计划

## 一、微信手机号快捷登录

### 1.1 现状分析

当前微信登录流程：`Taro.login()` → 获取 `code` → 发送至后端 `/api/v1/auth/wechat-login` → 后端调用 `jscode2session` 获取 `openid` → 用 `wx_{openid}` 作为 `username` 创建用户。

**核心问题：**
- 微信默认昵称过长含 emoji，UI 溢出
- `username = wx_{openid}` 无意义，用户无法记忆
- 无手机号标识，无法跨设备找回账号

**目标：** 改为手机号快捷登录，以手机号作为唯一标识，首次登录引导设置昵称。

### 1.2 技术实现方案

#### 1.2.1 后端改动（server.ts）

**1. ServerUser 增加 phone 字段**

```typescript
interface ServerUser {
  username: string;
  nickname: string;
  avatar: string;
  password: string;
  phone?: string;      // 新增
  openid?: string;
  unionid?: string;
}
```

**2. 新增 access_token 缓存机制**

微信 `getPhoneNumber` 接口需要 `access_token`（不同于 `jscode2session` 的 code 换取）。需要：

- 新增 `getAccessToken()` 函数，缓存 `access_token`（有效期 2 小时，提前 5 分钟刷新）
- 环境变量：`WECHAT_APPID`、`WECHAT_APPSECRET`
- Mock 模式：未配置时使用 `phoneCode` hash 生成模拟手机号

```typescript
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }
  const resp = await axios.get(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_APPSECRET}`,
    { timeout: 10000, httpsAgent }
  );
  if (!resp.data?.access_token) throw new Error('Failed to get access_token');
  cachedAccessToken = {
    token: resp.data.access_token,
    expiresAt: Date.now() + (resp.data.expires_in - 300) * 1000,
  };
  return cachedAccessToken.token;
}
```

**3. 新增 POST /api/v1/auth/phone-login 接口**

```
请求体：{ phoneCode: string, loginCode?: string }
```

处理流程：
1. 用 `phoneCode` + `access_token` 调用微信 `getPhoneNumber` 接口解密手机号
2. 用 `loginCode` 调用 `jscode2session` 获取 `openid`（可选）
3. 用手机号查找用户：
   - 已存在：更新 `openid`（如有），返回 token + 用户信息
   - 不存在：创建新用户（`username = 手机号`, `phone = 手机号`, `nickname = 喵星人_{尾号4位}`），返回 token + `isNewUser: true`
4. Mock 模式：`phoneCode` hash 后4位作为模拟手机号

**4. 新增 PATCH /api/v1/me 接口**

用于首次登录后设置昵称：

```
请求体：{ nickname?: string, avatar?: string }
响应：{ user: publicUser(user) }
```

#### 1.2.2 前端改动

**1. authService.ts — 新增 phoneLogin 方法**

```typescript
async phoneLogin(phoneCode: string): Promise<UserInfo> {
  const loginRes = await Taro.login();
  const res = await request({
    url: '/api/v1/auth/phone-login',
    method: 'POST',
    data: { phoneCode, loginCode: loginRes.code },
  });
  persistAuth(res.data.token, normalizeUser(res.data.user, '', res.data.user.username));
  return { ...normalizeUser(res.data.user, '', res.data.user.username), isNewUser: res.data.isNewUser };
}
```

**2. AuthContext.tsx — 新增 phoneLogin 方法**

```typescript
const phoneLogin = async (phoneCode: string) => {
  const result = await authService.phoneLogin(phoneCode);
  storage.saveUserInfo(result);
  storage.saveLoginTime(Date.now());
  storage.saveLastActiveTime(Date.now());
  setIsAuthenticated(true);
  setUser(result);
  await storage.syncFromServer(result.username);
  refreshCatStatus();
  return { success: true, isNewUser: result.isNewUser };
};
```

**3. Login 页面 — 新增手机号快捷登录按钮**

- 使用 Taro `<Button openType="getPhoneNumber">` 组件
- `onGetPhoneNumber` 回调获取 `phoneCode`
- 仅在小程序环境显示（`process.env.TARO_ENV === 'weapp'`）
- 需要用户先同意条款，未勾选时弹出协议弹窗
- 按钮样式：绿色圆角按钮 + 手机图标

```tsx
{process.env.TARO_ENV === 'weapp' && (
  <Button
    className="phone-login-btn"
    openType="getPhoneNumber"
    onGetPhoneNumber={handlePhoneLogin}
  >
    手机号快捷登录
  </Button>
)}
```

**4. 新增 set-nickname 页面**

- 路由：`/pages/set-nickname/index`
- 首次手机号登录后（`isNewUser === true`）跳转
- 昵称输入框，2-12 字符，过滤 emoji
- 可跳过（使用默认昵称"喵星人_尾号4位"）
- 保存后调用 `PATCH /api/v1/me { nickname }`

**5. UserInfo 接口扩展**

```typescript
// storage.ts
export interface UserInfo {
  username: string;
  nickname: string;
  avatar: string;
  password?: string;
  passwordSet?: boolean;
  openidBound?: boolean;
  phone?: string;       // 新增
  isNewUser?: boolean;  // 新增（仅登录时使用）
}
```

**6. 昵称展示兜底**

所有展示 `nickname` 的位置添加 `truncate`：

| 文件 | 位置 | 改动 |
|---|---|---|
| `profile/index.tsx` | 昵称展示 | 添加 `className` 限制最大宽度 + `text-overflow: ellipsis` |
| `diary/index.tsx` | 日记作者名 | 同上 |
| `add-friend-qr/index.tsx` | 好友卡片 | 同上 |
| `scan-friend/index.tsx` | 扫码页 | 同上 |
| `edit-profile/index.tsx` | 编辑页 | 可选展示脱敏手机号 `138****1234` |

### 1.3 开发排期

| 阶段 | 任务 | 复杂度 | 涉及文件 |
|---|---|---|---|
| **P0-A** | 后端：ServerUser 增加 phone 字段 + access_token 缓存 + phone-login 接口 + PATCH /api/v1/me | L | `server.ts` |
| **P0-B** | 前端：authService.phoneLogin + AuthContext.phoneLogin + Login 页面手机号按钮 | M | `authService.ts`, `AuthContext.tsx`, `login/index.tsx` |
| **P1-A** | 新增 set-nickname 页面 | M | 新增 `pages/set-nickname/` |
| **P1-B** | UserInfo 扩展 + 昵称展示兜底 | S | `storage.ts`, `profile/index.tsx`, `diary/index.tsx` 等 |
| **P1-C** | 登录后路由逻辑：isNewUser → set-nickname → cat-start | S | `catLifecycle.ts` 或 login 页面 |
| **P2** | EditProfile 展示脱敏手机号 + 补设密码引导 | S | `edit-profile/index.tsx` |
| **P2** | 接口速率限制 | S | `server.ts` 中间件 |

### 1.4 安全要点

- phoneCode 一次性有效，5 分钟过期
- access_token 仅服务端持有，前端不接触
- 手机号完整存储（用于身份校验），前端展示脱敏
- phone-login 接口加速率限制（同 IP 每分钟 ≤10 次）
- 手机号登录用户无密码，JWT token 泄露风险更高，可考虑缩短 token 有效期至 7 天或增加 refresh token

### 1.5 Mock/开发环境兼容

- `WECHAT_APPID` 未配置且非生产环境时，使用 mock 模式
- Mock 模式：用 `phoneCode` hash 生成模拟手机号 `1380000{hash后4位}`
- `Taro.login()` 在开发者工具中返回测试 code，后端 mock 模式下生成测试 openid
- 确保现有密码登录和注册流程不受影响

---

## 二、数据同步刷新架构

### 2.1 现状分析

**当前同步模式：** 本地优先 + 登录时一次性同步 + 写操作 fire-and-forget

**关键缺陷：**

| 问题 | 代码位置 | 影响 |
|---|---|---|
| 注册后不同步服务端数据 | `AuthContext.tsx` register 函数 | 注册后看不到服务端已有数据 |
| App 重开不同步 | `AuthContext.tsx` 初始化 | 多设备数据不一致 |
| 切回前台不同步 | 无 visibilitychange 监听 | 看不到其他设备变更 |
| 好友/通知仅页面挂载时同步 | Diary/NotificationList | 切 Tab 后数据过时 |
| saveDiaries 逐条上传 | `storage.ts:928-943` | 200 条日记 → 200 个请求 |
| savePoints 每分钟上传 | `storage.ts:862-868` | 高频浪费 |
| 好友日记点赞/评论不同步 | `diary/index.tsx` | 其他设备看不到 |
| 积分同步只比 total | `storage.ts:734-753` | 多设备积分字段丢失 |
| syncFromServer 串行执行 | `storage.ts:645-753` | 总耗时叠加 |
| 401 不触发 AuthContext 登出 | `httpAdapter.ts` | UI 状态与实际认证不一致 |
| 双写无重试 | 所有 `syncXxxToServer` | 网络波动时数据丢失 |

### 2.2 分层同步架构设计

```
┌──────────────────────────────────────────────────────────────┐
│  Layer 1: 关键数据 — 登录/注册/切前台时全量同步               │
│  猫咪、日记、信件、积分、好友列表                              │
│  触发：login, register, visibilitychange, app init           │
│  策略：Promise.allSettled 并行，30s 冷却防抖                 │
├──────────────────────────────────────────────────────────────┤
│  Layer 2: 社交数据 — 定时轮询 + 事件驱动                     │
│  好友动态、通知、好友请求                                     │
│  触发：5min interval + 页面激活                               │
│  策略：轻量 GET，增量合并                                    │
├──────────────────────────────────────────────────────────────┤
│  Layer 3: 写操作 — 防抖批量上传                               │
│  日记保存、积分更新、信件保存                                 │
│  触发：本地写操作                                             │
│  策略：脏标记 + 5s 防抖 + 失败重试队列                        │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 技术实现方案

#### 2.3.1 Layer 1：全局 syncAll + 切前台同步

**新增 `services/syncManager.ts`**

```typescript
class SyncManager {
  private lastSyncTime = 0;
  private syncing = false;
  private readonly COOLDOWN_MS = 30_000;

  async syncAll(): Promise<void> {
    if (this.syncing) return;
    const now = Date.now();
    if (now - this.lastSyncTime < this.COOLDOWN_MS) return;

    this.syncing = true;
    try {
      const username = storage.getCurrentUsername();
      if (!username) return;

      await Promise.allSettled([
        storage.syncFromServer(username),
        friendService.syncFriends(),
        friendService.syncFriendDiaries(),
      ]);
      // 派发全局同步完成事件
      Taro.eventCenter.trigger('data-synced', { timestamp: now });
    } finally {
      this.syncing = false;
      this.lastSyncTime = Date.now();
    }
  }
}

export const syncManager = new SyncManager();
```

**AuthContext 改造：**

- `login()` 和 `register()` 后调用 `syncManager.syncAll()`
- App 初始化（已有 token）后调用 `syncManager.syncAll()`

**App.tsx 或首页监听切前台：**

小程序使用 `Taro.onAppShow` / `useDidShow`，PWA 使用 `document.visibilitychange`：

```typescript
// 小程序端
Taro.onAppShow(() => {
  syncManager.syncAll();
});
```

#### 2.3.2 syncFromServer 并行化

当前 `storage.syncFromServer` 串行调用 `syncCats → syncDiaries → syncLetters → syncPoints`，改为并行：

```typescript
syncFromServer: async (username: string) => {
  await Promise.allSettled([
    syncCatsFromServer(),
    syncDiariesFromServer(username),
    syncLettersFromServer(username),
    syncPointsFromServer(username),
  ]);
}
```

#### 2.3.3 Layer 2：社交数据轮询

**Diary 页面好友动态轮询：**

```typescript
useEffect(() => {
  loadDiaries(); // 首次加载
  const intervalId = setInterval(() => {
    friendService.syncFriendDiaries().then(() => {
      setFriendDiaries(storage.getFriendDiaries());
    }).catch(() => {});
  }, 5 * 60 * 1000); // 5 分钟
  return () => clearInterval(intervalId);
}, []);
```

**通知红点合并服务端：**

Profile 页面的 `computeNotifications` 需要合并服务端通知：

```typescript
const checkNotifications = useCallback(async () => {
  const local = computeNotifications();
  let server: NotificationItem[] = [];
  try {
    server = await fetchServerNotifications();
  } catch {}
  const all = [...server, ...local];
  setUnreadCount(all.filter(n => !n.isRead).length);
}, []);
```

#### 2.3.4 Layer 3：防抖批量上传队列

**新增 `services/syncQueue.ts`**

```typescript
type SyncTask = {
  type: 'diary' | 'letter' | 'points' | 'cat';
  id?: string;
  action: 'upsert' | 'delete';
  payload?: any;
  retries?: number;
};

class SyncQueue {
  private dirty = new Map<string, SyncTask>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 5000;
  private readonly MAX_RETRIES = 3;

  enqueue(task: SyncTask) {
    const key = task.id ? `${task.type}:${task.id}` : task.type;
    this.dirty.set(key, { ...task, retries: task.retries ?? 0 });
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

    const username = storage.getCurrentUsername();
    if (!username) return;

    for (const task of tasks) {
      try {
        await this.executeTask(username, task);
      } catch {
        if ((task.retries ?? 0) < this.MAX_RETRIES) {
          this.enqueue({ ...task, retries: (task.retries ?? 0) + 1 });
        }
      }
    }
  }

  private async executeTask(username: string, task: SyncTask) {
    switch (task.type) {
      case 'diary':
        await storage.syncDiaryToServer(username, task.payload);
        break;
      case 'letter':
        await storage.syncLetterToServer(username, task.payload);
        break;
      case 'points':
        await storage.syncPointsToServer(username, task.payload);
        break;
      case 'cat':
        await storage.syncCatToServer(username, task.payload);
        break;
    }
  }

  // 应用切前台时立即 flush
  flushNow() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}

export const syncQueue = new SyncQueue();
```

**改造 storage.ts 中的双写调用：**

| 函数 | 改造前 | 改造后 |
|---|---|---|
| `saveDiaries` | 逐条 `syncDiaryToServer` | `syncQueue.enqueue({ type: 'diary', id, action: 'upsert', payload })` |
| `savePoints` | 直接 `syncPointsToServer` | `syncQueue.enqueue({ type: 'points', action: 'upsert', payload })` |
| `saveTimeLetters` | 逐条 `syncLetterToServer` | `syncQueue.enqueue({ type: 'letter', id, action: 'upsert', payload })` |
| `saveCatInfo` | 直接 `syncCatToServer` | `syncQueue.enqueue({ type: 'cat', id, action: 'upsert', payload })` |

#### 2.3.5 积分合并策略优化

当前只比 `total` 取较大值，改为字段级合并：

```typescript
function mergePoints(local: PointsInfo, remote: PointsInfo): PointsInfo {
  return {
    total: Math.max(local.total, remote.total),
    lastLoginDate: latest(local.lastLoginDate, remote.lastLoginDate),
    dailyInteractionPoints: Math.max(local.dailyInteractionPoints, remote.dailyInteractionPoints),
    lastInteractionDate: latest(local.lastInteractionDate, remote.lastInteractionDate),
    onlineMinutes: Math.max(local.onlineMinutes, remote.onlineMinutes),
    lastOnlineUpdate: Math.max(local.lastOnlineUpdate, remote.lastOnlineUpdate),
    history: mergeHistories(local.history, remote.history),
  };
}

function mergeHistories(local: PointTransaction[], remote: PointTransaction[]): PointTransaction[] {
  const map = new Map<string, PointTransaction>();
  for (const t of [...local, ...remote]) {
    const existing = map.get(t.id);
    if (!existing || t.timestamp > existing.timestamp) map.set(t.id, t);
  }
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
}
```

#### 2.3.6 401 自动登出修复

**httpAdapter.ts 改造：**

当前 401 只清除 token，不通知 AuthContext。需要：

```typescript
// 401 处理时派发全局事件
if (statusCode === 401 && data?.code === 'UNAUTHORIZED') {
  removeItem('miao_auth_token');
  removeItem('miao_current_user');
  Taro.eventCenter.trigger('auth:unauthorized');
}
```

**AuthContext.tsx 监听：**

```typescript
useEffect(() => {
  const handler = () => {
    setIsAuthenticated(false);
    setUser(null);
    Taro.reLaunch({ url: '/pages/login/index' });
  };
  Taro.eventCenter.on('auth:unauthorized', handler);
  return () => Taro.eventCenter.off('auth:unauthorized', handler);
}, []);
```

#### 2.3.7 好友日记互动同步

当前点赞/评论仅修改本地 storage，不同步到服务端。需要：

**后端新增接口：**

```
POST /api/v1/friend-diaries/:diaryId/like    — 点赞/取消点赞
POST /api/v1/friend-diaries/:diaryId/comment — 添加评论
```

**前端改造：** diary/index.tsx 中好友动态的 `handleLike` 和 `handleAddComment` 在本地操作后，调服务端接口同步。

### 2.4 开发排期

| 阶段 | 任务 | 复杂度 | 涉及文件 |
|---|---|---|---|
| **P0-A** | syncFromServer 并行化（Promise.allSettled） | S | `storage.ts` |
| **P0-B** | 新增 SyncManager + AuthContext 调用 syncAll | M | 新增 `syncManager.ts`，改 `AuthContext.tsx` |
| **P0-C** | 切前台同步（Taro.onAppShow） | S | `app.tsx` |
| **P0-D** | 401 自动登出修复 | S | `httpAdapter.ts`, `AuthContext.tsx` |
| **P1-A** | 新增 SyncQueue 防抖批量上传 | L | 新增 `syncQueue.ts`，改 `storage.ts` |
| **P1-B** | Diary 页面好友动态 5 分钟轮询 | S | `diary/index.tsx` |
| **P1-C** | Profile 红点合并服务端通知 | S | `profile/index.tsx` |
| **P1-D** | 积分合并策略改为字段级合并 | M | `storage.ts` |
| **P2-A** | 好友日记点赞/评论同步到服务端 | M | `diary/index.tsx`, `server.ts` |
| **P2-B** | 统一 data-synced 事件总线 | M | 全局 |
| **P2-C** | saveDiaries 只上传脏数据（diff） | M | `storage.ts` |
| **P3** | 清理 mockFriendService 死代码 + login 冗余调用 | S | 删除文件 |

### 2.5 数据流图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   本地写入    │────▶│  SyncQueue   │────▶│   服务端 API  │
│ (save/save)  │     │ (5s 防抖)    │     │ (批量/去重)  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │ 失败                    ▲
                            ▼ 重试                    │
                     ┌──────────────┐          ┌──────────────┐
                     │  重试队列     │          │   服务端数据   │
                     │ (max 3次)    │          │              │
                     └──────────────┘          └──────────────┘
                                                      │
┌──────────────┐     ┌──────────────┐                  │
│  切前台/登录  │────▶│ SyncManager  │─────────────────┘
│ /注册/重开    │     │ (全量拉取)   │
└──────────────┘     └──────────────┘
                            │
                            ▼ 派发事件
                     ┌──────────────┐
                     │ data-synced  │
                     │  事件通知     │
                     └──────────────┘
                            │
                   ┌────────┼────────┐
                   ▼        ▼        ▼
              Diary页   Points页   Profile页
              (刷新列表) (刷新积分) (刷新红点)
```

### 2.6 风险与注意事项

1. **SyncQueue 持久化**：当前 SyncQueue 仅在内存中，App 被杀后未 flush 的脏数据会丢失。P0 阶段可接受（用户重新打开时 Layer 1 全量同步会修复），P2 阶段可考虑将脏标记写入 storage。

2. **并发冲突**：多设备同时修改同一数据时，last-write-wins 策略可能丢失数据。日记/信件当前无 `updatedAt` 字段，需要补充。

3. **积分合并边界**：`mergePoints` 中 `Math.max` 策略在极端情况下（两设备同时获得不同积分）可能丢失部分积分。可考虑服务端作为积分的唯一权威来源，客户端只读。

4. **好友日记互动同步**：当前后端没有好友日记的写入 API，需要新增。且好友日记的点赞/评论是写在本地 `friendDiaries` 中的，需要同步到服务端并关联到原始日记。

5. **小程序 vs PWA 差异**：切前台监听方式不同（`Taro.onAppShow` vs `visibilitychange`），SyncManager 需要同时兼容两端。积分在线计时器（Home 页 `setInterval`）每分钟调用 `savePoints`，改造后应入队 SyncQueue 而非直接调 `syncPointsToServer`。