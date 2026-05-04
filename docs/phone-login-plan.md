# Miao 手机号快捷登录方案

## 1. 背景与目标

当前 Miao 登录体系仅支持用户名+密码方式，微信一键登录使用 `openid` 作为用户标识，存在以下问题：

- 微信默认昵称过长（如"不忘初心方得始终的小猫咪🐱🐱🐱"），导致 UI 溢出
- 昵称含 emoji，显示宽度不可控
- `username` 为 `wx_{openid}` 格式，无实际意义，用户无法记忆

**目标**：参考主流小程序做法，将微信一键登录改为**手机号快捷登录**，以手机号作为用户唯一标识，解决昵称过长问题，提升登录体验。

---

## 2. 整体流程

```
用户点击「手机号快捷登录」按钮
  → 微信弹窗授权："Miao 请求获取你的手机号" [允许] [拒绝]
  → 用户允许后，前端拿到 phoneCode
  → 前端同时调用 wx.login() 获取 loginCode
  → 前端将 { phoneCode, loginCode } 发送到后端 /api/v1/auth/phone-login
  → 后端用 phoneCode 调用微信 getPhoneNumber 接口 → 解密得到手机号
  → 后端用 loginCode 调用 jscode2session → 获取 openid
  → 后端用手机号查找用户：
    → 已注册：更新 openid（如有），返回 token + 用户信息
    → 未注册：自动创建账号（username=手机号, phone=手机号），返回 token + 用户信息
  → 前端存储 token
  → 首次登录：跳转「设置昵称」引导页
  → 非首次登录：直接进入首页
```

---

## 3. 用户模型变更

### 3.1 现有 ServerUser 结构

```typescript
// server.ts:65
interface ServerUser {
  username: string;    // 登录标识
  nickname: string;    // 展示昵称
  avatar: string;
  password: string;    // 密码登录用户有值，微信用户为空
  openid?: string;     // 微信绑定
  unionid?: string;
}
```

### 3.2 新增 phone 字段

```typescript
interface ServerUser {
  username: string;    // 登录标识（密码登录：用户自定义；手机号登录：手机号）
  nickname: string;    // 展示昵称（用户设置，非微信昵称）
  avatar: string;
  password: string;    // 密码登录用户有值，手机号快捷登录用户为空（后续可补设）
  phone?: string;      // 手机号（手机号快捷登录用户必填）
  openid?: string;     // 微信 openid
  unionid?: string;    // 微信 unionid
}
```

### 3.3 各登录方式字段对照

| 字段 | 密码登录用户 | 手机号快捷登录用户 |
|---|---|---|
| `username` | 用户自定义（如 "catfan"） | 手机号（如 "13812341234"） |
| `nickname` | 注册时设置 | 首次登录后引导设置 |
| `password` | 有值 | 为空（可在设置页补设） |
| `phone` | 可选 | 必填 |
| `openid` | 可选 | 有值 |

---

## 4. 后端 API 设计

### 4.1 新增接口：手机号快捷登录

```
POST /api/v1/auth/phone-login
```

**请求体：**

```json
{
  "phoneCode": "xxx",    // 微信 getPhoneNumber 返回的 code
  "loginCode": "xxx"     // wx.login() 返回的 code（可选，用于获取 openid）
}
```

**处理逻辑：**

1. 用 `phoneCode` + `access_token` 调用微信接口获取手机号
2. （可选）用 `loginCode` 调用 `jscode2session` 获取 `openid`
3. 用手机号在用户表中查找：
   - **已存在**：更新 `openid`（如有），返回 token
   - **不存在**：创建新用户，`username = 手机号`，`phone = 手机号`，`nickname = "喵星人_{手机尾号4位}"`，返回 token

**响应体：**

```json
{
  "token": "jwt_token_xxx",
  "user": {
    "username": "13812341234",
    "nickname": "喵星人_1234",
    "avatar": "",
    "phone": "13812341234",
    "openidBound": true,
    "passwordSet": false,
    "isNewUser": true
  }
}
```

### 4.2 微信接口调用

#### 获取 access_token

```
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={APPID}&secret={APPSECRET}
```

- 需要缓存 `access_token`（有效期 2 小时），避免频繁请求
- 环境变量：`WECHAT_APPID`、`WECHAT_APPSECRET`

#### 获取手机号

```
POST https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={ACCESS_TOKEN}

Body: { "code": "phoneCode" }
```

响应：

```json
{
  "errcode": 0,
  "errmsg": "ok",
  "phone_info": {
    "phoneNumber": "13812341234",
    "purePhoneNumber": "13812341234",
    "countryCode": "86"
  }
}
```

#### 获取 openid（已有逻辑）

```
GET https://api.weixin.qq.com/sns/jscode2session?appid={APPID}&secret={APPSECRET}&js_code={loginCode}&grant_type=authorization_code
```

### 4.3 access_token 缓存设计

```typescript
// server.ts 中新增
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }
  const resp = await axios.get(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_APPSECRET}`,
    { timeout: 10000, httpsAgent }
  );
  if (!resp.data?.access_token) {
    throw new Error('Failed to get access_token: ' + JSON.stringify(resp.data));
  }
  // 提前 5 分钟过期，避免边界情况
  cachedAccessToken = {
    token: resp.data.access_token,
    expiresAt: Date.now() + (resp.data.expires_in - 300) * 1000,
  };
  return cachedAccessToken.token;
}
```

### 4.4 开发环境 Mock

与现有 `wechat-login` 接口一致，当 `WECHAT_APPID` 未配置且 `NODE_ENV !== "production"` 时，使用 mock 模式：

```typescript
if (!process.env.WECHAT_APPID || !process.env.WECHAT_APPSECRET) {
  if (process.env.NODE_ENV !== "production" || process.env.WECHAT_LOGIN_DEV_MOCK === "true") {
    // Mock 模式：使用 phoneCode 的 hash 作为手机号后4位
    const mockPhone = `1380000${phoneCode.slice(-4)}`;
    // ... 查找或创建用户
    return res.json({ token, user, isNewUser: true, devMock: true });
  }
  return res.status(501).json({ error: "WeChat login is not configured" });
}
```

---

## 5. 前端设计

### 5.1 登录页布局（Login.tsx）

```
┌─────────────────────────────┐
│       Logo + 标题            │
│       猫咪头像               │
│                             │
│   [用户名输入框]             │
│   [密码输入框]               │
│   [忘记密码?]               │
│   [☑ 同意条款]              │
│   [登 录]                   │
│   [注 册]                   │
│                             │
│   ─── 其他登录方式 ───       │
│   [📱 手机号快捷登录]  ← 仅小程序环境显示
│                             │
│   隐私政策 · 服务条款        │
└─────────────────────────────┘
```

**关键设计要点：**

- 手机号快捷登录按钮放在密码登录下方，用分割线隔开
- 按钮样式：绿色圆角按钮 + 手机图标，与主登录按钮（橙色）形成区分
- 同样需要检查 `isAgreed`（条款勾选），未勾选时弹出协议弹窗
- **PWA/Web 环境下隐藏此按钮**（无法调用微信 API）

### 5.2 环境检测

```typescript
// utils/platform.ts
export const isWeChatMiniProgram = (): boolean => {
  try {
    return typeof wx !== 'undefined' && typeof wx.login === 'function';
  } catch {
    return false;
  }
};
```

### 5.3 AuthContext 新增方法

```typescript
// context/AuthContext.tsx
interface AuthContextType {
  // ... 现有方法
  phoneLogin: (phoneCode: string, loginCode: string) => Promise<{
    success: boolean;
    isNewUser?: boolean;
    error?: 'network' | 'denied';
  }>;
}
```

实现逻辑：

```typescript
const phoneLogin = async (phoneCode: string, loginCode: string) => {
  try {
    const data = await requestAuth('/api/v1/auth/phone-login', { phoneCode, loginCode });
    const userInfo = toUserInfo(data.user, '', data.user.username);
    storage.saveUserInfo(userInfo);
    storage.saveToken(data.token);
    storage.saveLoginTime(Date.now());
    storage.saveLastActiveTime(Date.now());
    setIsAuthenticated(true);
    setUser(userInfo);
    refreshCatStatus();
    return { success: true, isNewUser: data.user?.isNewUser || data.isNewUser };
  } catch (error) {
    if (!(error instanceof AuthApiError)) {
      return { success: false, error: 'network' as const };
    }
    return { success: false, error: 'denied' as const };
  }
};
```

### 5.4 小程序端按钮实现

```xml
<!-- 小程序 WXML -->
<button open-type="getPhoneNumber" bindgetphonenumber="onGetPhoneNumber">
  手机号快捷登录
</button>
```

```javascript
// 小程序 JS
onGetPhoneNumber(e) {
  if (e.detail.code) {
    const phoneCode = e.detail.code;
    wx.login({
      success: (res) => {
        const loginCode = res.code;
        // 调用后端接口
        wx.request({
          url: 'https://your-server/api/v1/auth/phone-login',
          method: 'POST',
           { phoneCode, loginCode },
          success: (response) => {
            const { token, user } = response.data;
            // 存储 token，跳转首页或设置昵称页
          }
        });
      }
    });
  } else {
    // 用户拒绝授权
  }
}
```

---

## 6. 昵称处理策略

### 6.1 默认昵称生成规则

手机号快捷登录创建新用户时：

```typescript
const nickname = `喵星人_${phone.slice(-4)}`;
// 示例：13812341234 → "喵星人_1234"
```

- 长度固定为 `4 + 1 + 4 = 9` 字符，不会溢出
- 手机尾号有辨识度，用户可区分

### 6.2 首次登录引导设置昵称

新增 `/set-nickname` 页面（首次手机号登录后跳转）：

```
┌─────────────────────────────┐
│                             │
│      🐱                     │
│   给自己取个名字吧           │
│                             │
│   [昵称输入框]               │
│   2-12个字符                 │
│                             │
│   [开始使用 Miao]           │
│                             │
│   可跳过，稍后在设置中修改    │
└─────────────────────────────┘
```

**逻辑：**

- `isNewUser === true` 时跳转此页
- 昵称限制 2-12 字符，过滤 emoji 超长序列
- 可跳过（使用默认昵称）
- 保存后调用 `PATCH /api/v1/me { nickname }` 更新

### 6.3 前端展示层兜底

所有展示 `nickname` 的位置统一加 `truncate` 截断，作为最终兜底：

```tsx
<h2 className="text-xl font-black text-on-surface truncate max-w-[160px]">
  {user?.nickname || "喵星人"}
</h2>
```

涉及文件：

| 文件 | 位置 | 当前代码 |
|---|---|---|
| `Profile.tsx:191` | 个人页昵称 | `{user?.nickname \|\| "喵星人"}` |
| `AddFriendQR.tsx:345` | 好友卡片昵称 | `{user.nickname}` |
| `ScanFriend.tsx:405` | 扫码页昵称 | `{currentUser?.nickname}` |
| `DiaryCard.tsx:84` | 日记卡片作者 | `{nickname \|\| "喵星人"}` |

---

## 7. UserInfo 接口变更

```typescript
// services/storage.ts
export interface UserInfo {
  username: string;
  nickname: string;
  avatar: string;
  password?: string;
  phone?: string;    // 新增：手机号
}
```

---

## 8. PWA 与小程序双端兼容

| 功能 | PWA/Web | 微信小程序 |
|---|---|---|
| 用户名+密码登录 | 支持 | 支持 |
| 注册 | 支持 | 支持 |
| 手机号快捷登录 | 不支持（隐藏按钮） | 支持 |
| 忘记密码 | 支持（已有手机号验证流程） | 支持 |

**环境检测控制按钮显示：**

```tsx
{isWeChatMiniProgram() && (
  <>
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-outline-variant/30" />
      <span className="text-xs text-on-surface-variant/50">其他登录方式</span>
      <div className="flex-1 h-px bg-outline-variant/30" />
    </div>
    <button className="miao-btn-wechat py-3">
      手机号快捷登录
    </button>
  </>
)}
```

---

## 9. 影响范围汇总

| 文件 | 改动内容 | 优先级 |
|---|---|---|
| `server.ts` | 新增 `/api/v1/auth/phone-login` 接口；`ServerUser` 增加 `phone` 字段；新增 `getAccessToken` 缓存逻辑 | P0 |
| `Login.tsx` | 新增"手机号快捷登录"按钮（小程序环境显示）；新增环境检测 | P0 |
| `AuthContext.tsx` | 新增 `phoneLogin()` 方法；`UserInfo` 增加 `phone` 字段 | P0 |
| `storage.ts` | `UserInfo` 接口增加 `phone?` 字段 | P0 |
| 新增 `SetNickname.tsx` | 首次手机号登录后的昵称设置引导页 | P1 |
| `Profile.tsx` | 昵称展示加 `truncate`；可选展示脱敏手机号 | P1 |
| `AddFriendQR.tsx` | 昵称展示加 `truncate` | P1 |
| `ScanFriend.tsx` | 昵称展示加 `truncate` | P1 |
| `DiaryCard.tsx` | 昵称展示加 `truncate` | P1 |
| `EditProfile.tsx` | 可选：展示脱敏手机号（138****1234） | P2 |
| `Register.tsx` | 可选：增加昵称输入框（区分 username 和 nickname） | P2 |
| 新增 `utils/platform.ts` | 环境检测工具函数 `isWeChatMiniProgram()` | P1 |

---

## 10. 安全注意事项

1. **手机号不脱敏存储**：服务端存储完整手机号用于身份校验，前端展示时脱敏（`138****1234`）
2. **phoneCode 一次性有效**：微信返回的 `phoneCode` 只能使用一次，且 5 分钟内过期
3. **access_token 安全**：仅服务端持有 `WECHAT_APPSECRET`，前端永远不接触
4. **速率限制**：`/api/v1/auth/phone-login` 接口应加速率限制（如同一 IP 每分钟最多 10 次），防止滥用
5. **HTTPS 强制**：小程序要求所有请求必须走 HTTPS
6. **token 有效期**：当前 JWT 有效期 30 天（`server.ts:82`），手机号登录用户无密码，token 泄露风险更高，可考虑缩短至 7 天或增加 refresh token 机制