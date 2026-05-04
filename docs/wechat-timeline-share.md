# 微信小程序朋友圈分享技术分析

> 以快团团为案例，分析小程序分享到微信朋友圈的完整技术链路。

## 1. 整体流程

```
团长创建商品团购页 → 用户点击"分享" → 系统调用 onShareTimeline
→ 动态生成分享卡片 → 用户添加配文发表 → 朋友圈展示卡片
→ 朋友点击卡片 → 单页模式打开小程序 → 加载商品详情
```

---

## 2. 核心 API：onShareTimeline

微信小程序在基础库 2.11.3 开始支持 `onShareTimeline`，允许小程序内容分享到朋友圈。

### 2.1 基本用法

```javascript
Page({
  // 必须同时声明 onShareAppMessage，否则 onShareTimeline 不生效
  onShareAppMessage() {
    return {
      title: '商品标题',
      path: '/pages/goods/index?id=xxx',
      imageUrl: '/assets/share-card.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '【团购】新鲜水果 产地直发 29.9元/箱',
      query: 'id=xxx&from=timeline',       // 页面参数，跳转时带入
      imageUrl: '/assets/share-card.jpg'    // 朋友圈卡片图（建议 1:1）
    };
  }
});
```

### 2.2 关键约束

| 约束项 | 说明 |
|---|---|
| 必须同时声明 `onShareAppMessage` | 否则 `onShareTimeline` 不生效 |
| 仅页面级声明有效 | 不支持全局 `App.onShareTimeline` |
| 单页模式限制 | 页面必须设置为非"单页模式"（`"singlePage": false`） |
| 基础库要求 | ≥ 2.11.3 |
| `imageUrl` 建议 | 朋友圈卡片为 1:1 正方形，建议 500×500 以上 |

### 2.3 onShareTimeline 与 onShareAppMessage 的差异

| 特性 | `onShareAppMessage`（聊天） | `onShareTimeline`（朋友圈） |
|---|---|---|
| 触发方式 | 按钮 `open-type="share"` 或右上角菜单 | 右上角菜单"分享到朋友圈" |
| 卡片样式 | 横向卡片（5:4 比例） | 正方形卡片（1:1 比例） |
| `imageUrl` | 支持 http/云文件/临时文件 | 支持 http/云文件/临时文件 |
| `path` | 小程序页面路径 | **不支持**，使用当前页面路径 |
| `query` | 不支持（路径参数写在 path 里） | 页面参数字符串 |
| 用户配文 | 不支持 | 支持（朋友圈发表时可添加文字） |
| 跳转行为 | 直接打开小程序页面 | 先打开单页模式，再进入完整小程序 |

**关键区别：** `onShareTimeline` 没有 `path` 参数，只能分享当前页面。参数通过 `query` 传递，而非 `path` 中的 query string。如果需要跳转到不同页面，必须在当前页面内做路由判断。

---

## 3. 分享卡片生成策略

快团团的分享卡片并非简单的页面截图，而是动态生成的定制化图片，包含商品图、标题、价格、团长信息等。有两种实现路径：

### 3.1 路径 A：Canvas 绘制 + 临时文件（客户端实时生成）

```
用户点击"分享"
  → Canvas 绘制分享图（商品图 + 标题 + 价格 + 二维码 + 品牌水印）
  → wx.canvasToTempFilePath() 导出临时图片路径
  → 将临时路径设为 onShareTimeline 的 imageUrl
  → 调起朋友圈分享
```

**核心代码：**

```javascript
async function generateShareCard(goodsInfo) {
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: 750, height: 750 });
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 750, 750);

  // 商品图（需先下载到本地）
  const productImg = await loadImage(goodsInfo.imageUrl);
  ctx.drawImage(productImg, 40, 40, 670, 670);

  // 价格标签
  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(`¥${goodsInfo.price}`, 40, 720);

  // 导出临时文件
  return new Promise((resolve) => {
    wx.canvasToTempFilePath({
      canvas,
      success: (res) => resolve(res.tempFilePath),
    });
  });
}

// 在 onShareTimeline 中使用
async onShareTimeline() {
  const tempPath = await generateShareCard(this.data.goodsInfo);
  return {
    title: this.data.goodsInfo.title,
    query: `id=${this.data.goodsInfo.id}&from=timeline`,
    imageUrl: tempPath
  };
}
```

**适用场景：** 分享内容个性化程度高（如用户头像、昵称、实时价格），需要每次动态生成。

### 3.2 路径 B：服务端预渲染（快团团实际方案）

```
团长创建商品页
  → 服务端根据商品信息预生成分享图（Puppeteer / Sharp / Canvas 库）
  → 上传至 CDN，得到固定 URL
  → 页面 onShareTimeline 直接引用 CDN URL
  → 无需客户端实时绘制，分享时零延迟
```

**服务端实现示例（Node.js + Sharp）：**

```javascript
const sharp = require('sharp');

async function generateShareImage(goods) {
  const compositeImages = [];

  // 底图：白色背景
  const base = {
    create: { width: 800, height: 800, channels: 3, background: '#fff' }
  };

  // 商品图：从 CDN 下载后缩放
  const productBuf = await sharp(goods.imageUrl).resize(700, 500).toBuffer();
  compositeImages.push({ input: productBuf, top: 50, left: 50 });

  // 价格文字：SVG 转 PNG
  const priceSvg = `
    <svg width="300" height="60">
      <text x="0" y="45" font-size="48" font-weight="bold" fill="#ff4444">
        ¥${goods.price}
      </text>
    </svg>`;
  const priceBuf = await sharp(Buffer.from(priceSvg)).toBuffer();
  compositeImages.push({ input: priceBuf, top: 580, left: 50 });

  // 标题文字
  const titleSvg = `
    <svg width="700" height="80">
      <text x="0" y="40" font-size="28" fill="#333">${goods.title}</text>
    </svg>`;
  const titleBuf = await sharp(Buffer.from(titleSvg)).toBuffer();
  compositeImages.push({ input: titleBuf, top: 600, left: 50 });

  return sharp(base).composite(compositeImages).jpeg({ quality: 90 }).toBuffer();
}
```

**优势：**

- 分享时无需等待 Canvas 绘制，体验更流畅
- 图片质量可控，不受设备性能影响
- 可缓存复用，同一商品图只生成一次
- 朋友圈卡片图加载更快（CDN 加速）

**适用场景：** 内容相对固定（商品页、活动页），可提前生成。

### 3.3 两种方案对比

| 维度 | 客户端 Canvas | 服务端预渲染 |
|---|---|---|
| 延迟 | 有绘制耗时（100-500ms） | 零延迟（CDN 直出） |
| 图片质量 | 受设备影响 | 可控 |
| 个性化 | 高（可嵌入用户头像等） | 低（需提前生成） |
| 缓存 | 临时文件，每次重新生成 | CDN 永久缓存 |
| 复杂度 | 低（纯前端） | 中（需后端服务） |
| 适用场景 | 用户 UGC 内容分享 | 商品/活动等固定内容分享 |

---

## 4. 页面路径与参数传递

朋友圈分享的核心是 `query` 参数——用户点击朋友圈卡片后，微信会打开小程序并携带这些参数。

### 4.1 参数设计

```
query: 'id=xxx&from=timeline&share_uid=12345'
```

| 参数 | 用途 |
|---|---|
| `id` | 商品/团购 ID，用于加载商品详情 |
| `from` | 来源标记（`timeline` = 朋友圈，`chat` = 聊天），用于数据分析 |
| `share_uid` | 分享者（团长）ID，用于佣金结算和归属追踪 |

### 4.2 页面接收逻辑

```javascript
Page({
  onLoad(options) {
    const { id, from, share_uid } = options;

    // 来源统计
    if (from === 'timeline') {
      this.reportShareClick({ id, share_uid, channel: 'timeline' });
    }

    // 加载商品数据
    this.loadGoodsDetail(id);
  }
});
```

### 4.3 注意事项

- `onShareTimeline` 没有 `path` 参数，只能分享当前页面路径
- 参数通过 `query` 字符串传递，格式为 `key1=value1&key2=value2`
- 微信会对 `query` 做 URL 编码，特殊字符需注意
- 从朋友圈进入时，`App.onLaunch` 不触发，需在页面 `onLoad` 中处理

---

## 5. 单页模式（Single Page Mode）

用户从朋友圈点击小程序卡片后，微信会以**单页模式**打开页面。这是一种受限的运行环境。

### 5.1 单页模式的限制

| 限制 | 说明 |
|---|---|
| 无 `App.onLaunch` | 无法在启动时执行全局逻辑 |
| 无 TabBar | 底部导航栏不显示 |
| 页面栈深度为 1 | `wx.navigateTo` 最多跳转一层 |
| 部分 API 不可用 | `wx.login`、`wx.getUserInfo` 等需要完整模式 |
| 样式可能差异 | 安全区域、状态栏等需额外适配 |

### 5.2 检测单页模式

```javascript
Page({
  onLoad(options) {
    const isSinglePage = this.isSinglePageMode();

    if (isSinglePage) {
      // 单页模式：显示"进入小程序"引导按钮
      this.setData({ showEnterBtn: true });
    }
  },

  isSinglePageMode() {
    // 方法1：通过 scene 判断
    // 1154 = 朋友圈单页模式
    const { scene } = wx.getLaunchOptionsSync();
    return scene === 1154;

    // 方法2：通过页面栈深度判断
    // const pages = getCurrentPages();
    // return pages.length === 1 && !this.getTabBar();
  }
});
```

### 5.3 从单页模式进入完整小程序

```javascript
enterFullApp() {
  // 方式1：跳转到 TabBar 页面（会退出单页模式）
  wx.switchTab({ url: '/pages/index/index' });

  // 方式2：关闭所有页面打开指定页面
  wx.reLaunch({ url: '/pages/index/index?from=timeline' });
}
```

---

## 6. 完整链路时序图

```
团长                        服务端                       微信                        朋友圈用户
 │                           │                           │                           │
 │  1. 创建团购商品           │                           │                           │
 │ ────────────────────────> │                           │                           │
 │                           │  2. 生成分享图上传CDN       │                           │
 │                           │ ──────>                    │                           │
 │                           │ <────── CDN URL            │                           │
 │  3. 返回商品页+分享图URL   │                           │                           │
 │ <──────────────────────── │                           │                           │
 │                           │                           │                           │
 │  4. 点击"分享到朋友圈"     │                           │                           │
 │ ────────────────────────────────────────────────────> │                           │
 │                           │                           │                           │
 │  5. onShareTimeline()     │                           │                           │
 │  return {                 │                           │                           │
 │    title: '...',          │                           │                           │
 │    query: 'id=xxx&...',   │                           │                           │
 │    imageUrl: CDN_URL      │                           │                           │
 │  }                        │                           │                           │
 │                           │                           │                           │
 │  6. 用户添加配文并发表     │                           │                           │
 │ ────────────────────────────────────────────────────> │                           │
 │                           │                           │  7. 朋友圈展示卡片         │
 │                           │                           │ ────────────────────────> │
 │                           │                           │                           │
 │                           │                           │  8. 点击卡片               │
 │                           │                           │ <──────────────────────── │
 │                           │                           │                           │
 │                           │                           │  9. 单页模式打开小程序     │
 │                           │                           │     onLoad({id,from,...}) │
 │                           │                           │                           │
 │                           │  10. 请求商品详情           │                           │
 │                           │ <────────────────────────── │                           │
 │                           │ ────────────────────────> │                           │
 │                           │                           │  11. 渲染商品页            │
 │                           │                           │                           │
 │                           │                           │  12. 点击"进入小程序"     │
 │                           │                           │ ────────────────────────> │
 │                           │                           │  wx.reLaunch()            │
 │                           │                           │                           │
```

---

## 7. 对 Miao 小程序的可借鉴点

Miao 当前的分享实现（`ShareSheet.tsx` + `shareService.ts`）走的是 PWA Web Share API 路径，小程序环境下需要改为 `onShareAppMessage` + `onShareTimeline` 双通道。

### 7.1 Miao 分享场景映射

| Miao 场景 | 分享内容 | `onShareTimeline` 配置 |
|---|---|---|
| 猫咪日记 | 日记图片 + 文字内容 | `query: 'page=diary&id=xxx&from=timeline'` |
| 时光信件 | 信件内容 + 猫咪头像 | `query: 'page=letter&id=xxx&from=timeline'` |
| 猫咪档案 | 猫咪照片 + 品种信息 | `query: 'page=cat&id=xxx&from=timeline'` |
| 好友邀请 | 邀请码 + 猫咪卡片 | `query: 'page=invite&code=xxx&from=timeline'` |

### 7.2 分享卡片生成建议

Miao 的猫咪日记和猫咪档案适合采用**客户端 Canvas 实时生成**方案，因为：

- 每只猫的照片不同，无法预生成
- 分享图需要包含用户个性化内容（猫咪名、品种等）
- 分享频率低于电商场景，绘制延迟可接受

猫咪好友邀请适合采用**服务端预渲染**方案，因为：

- 邀请码固定，可提前生成
- 当前已有 `AddFriendQR` 组件生成邀请卡片，可复用逻辑

### 7.3 小程序适配要点

1. **双通道声明**：每个可分享页面需同时声明 `onShareAppMessage` 和 `onShareTimeline`
2. **单页模式适配**：检测 scene === 1154，显示"进入 Miao"引导按钮
3. **参数路由**：小程序无 React Router，需在 `onLoad` 中根据 `query.page` 参数分发到对应页面
4. **分享图尺寸**：朋友圈卡片为 1:1 正方形，聊天卡片为 5:4 横向，需分别准备
5. **来源追踪**：通过 `from` 参数区分 `timeline`（朋友圈）和 `chat`（聊天），用于数据分析

---

## 8. 补充 API：wx.showShareImageMenu

### 8.1 API 概述

`wx.showShareImageMenu`（基础库 2.14.3+）打开一个**系统级分享图片弹窗**，用户可以将图片发送给朋友、分享至朋友圈、收藏或下载。

```javascript
wx.showShareImageMenu({
  path: tempFilePath,        // 必须是本地路径或临时路径
  needShowEntrance: true,    // 图片是否带小程序入口（3.2.0+，默认 true）
  entrancePath: '/pages/diary?id=xxx',  // 小程序入口跳转路径（3.2.0+）
  success: (res) => {},
  fail: (err) => {},
});
```

### 8.2 与 onShareTimeline 的关键区别

| 维度 | `onShareTimeline` | `wx.showShareImageMenu` |
|---|---|---|
| **触发方式** | 用户点击右上角菜单 → 分享到朋友圈 | 代码主动调用，弹出系统分享面板 |
| **分享内容** | 小程序卡片（标题+图片+query） | **纯图片**（可带小程序入口标记） |
| **用户操作路径** | 右上角菜单 → 分享到朋友圈 → 发表 | 页面内按钮 → 弹出面板 → 选择发送/朋友圈/收藏/保存 |
| **朋友圈展示形态** | 小程序卡片样式，点击可跳转小程序 | 图片样式，带小程序入口小标识可点击跳转 |
| **可控性** | 被动声明式，用户需找入口 | **主动调用**，可在页面任意位置触发 |
| **配文** | 支持用户添加配文 | 不支持配文 |
| **二维码限制** | 无 | 分享至朋友圈的图片**不支持带二维码**（支持小程序码） |

**核心差异：** `onShareTimeline` 分享的是小程序卡片，`showShareImageMenu` 分享的是图片。两者是互补关系，不是替代关系。

### 8.3 needShowEntrance 的关键作用

基础库 3.2.0+ 新增了 `needShowEntrance` 和 `entrancePath` 参数：

```javascript
wx.showShareImageMenu({
  path: posterTempPath,
  needShowEntrance: true,                          // 图片带小程序入口
  entrancePath: '/pages/diary/index?id=123&from=shareimage',  // 点击入口跳转的页面
});
```

- 分享到朋友圈的图片**右下角会显示一个小程序入口标识**
- 朋友在朋友圈看到图片后，**点击入口标识可以直接跳转到小程序对应页面**
- 这比纯图片分享多了**回流入口**，对用户增长至关重要

### 8.4 实现示例

```javascript
// 小程序端分享海报到朋友圈
async function sharePosterToMoments(posterImageUrl, targetPage) {
  // 1. 网络图片需先下载为临时路径
  const downloadRes = await new Promise((resolve, reject) => {
    wx.downloadFile({
      url: posterImageUrl,
      success: resolve,
      fail: reject,
    });
  });

  // 2. 调起分享图片弹窗
  wx.showShareImageMenu({
    path: downloadRes.tempFilePath,
    needShowEntrance: true,
    entrancePath: targetPage,
    success: () => {
      console.log('分享弹窗打开成功');
    },
    fail: (err) => {
      console.error('分享失败', err);
      // 降级：引导用户长按保存
      wx.previewImage({
        urls: [downloadRes.tempFilePath],
      });
    },
  });
}
```

### 8.5 注意事项

1. **`path` 必须是本地路径或临时路径**，网络图片需先用 `wx.downloadFile` 下载
2. **朋友圈图片不支持带二维码**（但支持小程序码），如果海报上有微信二维码会被拒绝
3. **基础库 3.8.2+** 才支持通过此 API 分享到朋友圈，低版本只能发送给朋友/收藏/保存
4. **开发版（真机调试）可能报错** `showShareImageMenu:fail Cannot read property 'initScl' of undefined`，体验版和正式版正常
5. **`entrancePath` 默认为当前页面路径**，如果当前页面允许分享给朋友的话

### 8.6 对 Miao 的价值

Miao 当前 PWA 版的"朋友圈"分享（`ShareSheet.tsx`）采用妥协方案：

```
点击"朋友圈" → html2canvas 生成海报 → 展示预览 → 用户长按保存/下载 → 手动打开微信发朋友圈
```

在小程序环境下，`wx.showShareImageMenu` 可以直接做到：

```
点击"朋友圈" → Canvas 生成海报 → showShareImageMenu({ path }) → 系统弹窗 → 用户选择"分享到朋友圈" → 直接发表
```

**少了两步手动操作**（保存图片 → 打开微信选朋友圈），体验提升显著。

#### Miao 各场景适用对比

| Miao 场景 | `onShareTimeline` | `wx.showShareImageMenu` | 推荐 |
|---|---|---|---|
| 猫咪日记 | 分享卡片样式，信息量有限 | 分享海报图片，包含猫咪照片+文字+装饰元素 | **showShareImageMenu** |
| 时光信件 | 卡片样式无法承载信件内容 | 海报图片可完整展示信件+猫咪头像 | **showShareImageMenu** |
| 猫咪档案 | 卡片样式可展示基本信息 | 海报图片可展示猫咪照片+品种+性格等 | **showShareImageMenu** |
| 好友邀请 | 卡片样式简洁明了 | 邀请码海报+小程序入口标识 | **showShareImageMenu** |

**结论：** Miao 的日记/猫咪/信件分享场景，`showShareImageMenu` 比 `onShareTimeline` 更合适，因为海报包含丰富的视觉信息，纯卡片样式无法承载。`onShareTimeline` 仍可作为右上角菜单的补充入口保留。