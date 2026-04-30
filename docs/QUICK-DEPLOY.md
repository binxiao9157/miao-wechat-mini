# 微信小程序快速部署指南

> 基于 PWA 已部署完成的前提下，快速接入微信小程序
>
> 部署域名: `www.mmdd10.tech`
>
> 最后更新: 2026-04-29

---

## 一、前置条件（必须已完成）

| 项目 | 状态 | 说明 |
|------|------|------|
| PWA 部署 | ✅ 已完成 | `https://www.mmdd10.tech` 可正常访问 |
| 域名备案 | ✅ 已完成 | ICP 备案通过 |
| SSL 证书 | ✅ 已完成 | HTTPS 正常工作 |
| 服务器 | ✅ 已运行 | Node.js + Nginx 正常运行 |

---

## 二、微信小程序必须项

### 2.1 微信 AppID 是什么？

**AppID** 是微信小程序的唯一标识，相当于小程序的"身份证号"。

**获取方式**：
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 注册小程序账号（选择"小程序"类型）
3. 在 **开发 → 开发管理 → 开发设置** 中查看 AppID(小程序ID)

**你的小程序配置**：
```
AppID: wx2e8c9453aab1b7ef
AppSecret: ad357cfa185299c0a8930c5b8827a4f9
```

**用途**：
- 小程序项目配置（`project.config.json`）
- 微信登录接口调用
- 服务端接口调用凭证

### 2.2 必须配置清单

| 配置项 | 位置 | 说明 |
|--------|------|------|
| **AppID** | 小程序项目 | 项目唯一标识 |
| **AppSecret** | 微信公众平台 → 开发设置 | 服务端调用微信接口的密钥 |
| **服务器域名** | 微信公众平台 → 服务器域名 | 配置 `https://www.mmdd10.tech` |
| **业务域名** | 微信公众平台 → 业务域名 | 如使用 WebView 需配置 |
| **request 合法域名** | 同上 | 小程序请求后端 API 的域名白名单 |

---

## 三、部署操作步骤

### 步骤 1：微信小程序后台配置

#### 1.1 配置服务器域名

登录 [微信公众平台](https://mp.weixin.qq.com/) → 开发 → 开发管理 → 开发设置 → 服务器域名

| 配置项 | 填写内容 |
|--------|----------|
| request 合法域名 | `https://www.mmdd10.tech` |
| socket 合法域名 | `wss://www.mmdd10.tech` |
| uploadFile 合法域名 | `https://www.mmdd10.tech` |
| downloadFile 合法域名 | `https://www.mmdd10.tech` |

> ⚠️ **注意**：域名不需要加端口号，也不需要加路径

#### 1.2 获取 AppSecret

在 **开发设置** 页面：
1. 找到 **AppSecret(小程序密钥)**
2. 点击"生成"或"重置"
3. **立即保存**，该密钥只显示一次

```
AppID: wx2e8c9453aab1b7ef
AppSecret: ad357cfa185299c0a8930c5b8827a4f9
```

#### 1.3 配置业务域名（可选）

如需使用 `<web-view>` 组件加载网页：
1. 在 **业务域名** 中添加 `https://www.mmdd10.tech`
2. 下载校验文件
3. 将校验文件上传到服务器 `dist/` 目录
4. 确保可通过 `https://www.mmdd10.tech/xxx.txt` 访问

---

### 步骤 2：服务端配置（已完成）

服务端代码已添加客户端识别中间件和微信登录接口，只需配置环境变量：

#### 2.1 添加微信小程序环境变量

```bash
sudo su - miao
cat >> /home/miao/app/.env << 'EOF'

# 微信小程序配置
WECHAT_APPID=wx2e8c9453aab1b7ef
WECHAT_APPSECRET=ad357cfa185299c0a8930c5b8827a4f9
EOF

# 重启服务
pm2 restart miao
```

#### 2.2 验证服务端配置

```bash
# 检查服务状态
pm2 status

# 查看日志确认配置加载
pm2 logs miao --lines 20
```

---

### 步骤 3：小程序项目配置

#### 3.1 配置 AppID

在小程序项目根目录的 `project.config.json` 中：

```json
{
  "description": "Miao 小程序",
  "packOptions": {
    "ignore": []
  },
  "setting": {
    "urlCheck": true
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0",
  "appid": "wx2e8c9453aab1b7ef",
  "projectname": "miao-mini",
  "condition": {}
}
```

#### 3.2 配置请求基地址

创建 `config.js` 或 `config.ts`：

```javascript
// config.js
const config = {
  // 开发环境
  development: {
    baseURL: 'http://localhost:3000',
  },
  // 生产环境
  production: {
    baseURL: 'https://www.mmdd10.tech',
  }
};

// 根据当前环境导出配置
const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
```

#### 3.3 封装请求方法（带客户端标识）

```javascript
// utils/request.js
const config = require('../config.js');

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.baseURL + options.url,
      method: options.method || 'GET',
       options.data,
      header: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'wechat-miniprogram',
        'X-App-Version': '1.0.0',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: reject
    });
  });
}

module.exports = { request };
```

---

### 步骤 4：实现微信登录（小程序端）

服务端已提供 `/api/auth/wechat-login` 接口，小程序端调用即可：

#### 4.1 小程序端调用登录

```javascript
// pages/login/login.js
Page({
   {
    userInfo: null
  },

  // 微信登录
  wxLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送 code 到服务端
          this.doLogin(res.code);
        }
      }
    });
  },

  // 调用服务端登录接口
  async doLogin(code) {
    try {
      const result = await request({
        url: '/api/auth/wechat-login',
        method: 'POST',
         { code }
      });

      // 保存登录态
      wx.setStorageSync('openid', result.openid);
      wx.setStorageSync('session_key', result.session_key);
      wx.setStorageSync('userInfo', {
        username: result.username,
        nickname: result.nickname,
        avatar: result.avatar
      });

      wx.showToast({ title: '登录成功' });
    } catch (error) {
      wx.showToast({ title: '登录失败', icon: 'none' });
      console.error('Login error:', error);
    }
  }
});
```

---

### 步骤 5：验证测试

#### 5.1 开发者工具测试

1. 打开微信开发者工具
2. 导入小程序项目
3. 在 **详情** → **本地设置** 中：
   - ✅ 勾选「不校验合法域名」进行本地开发测试
   - ❌ 取消勾选测试生产环境

#### 5.2 真机调试

1. 点击开发者工具右上角「真机调试」
2. 扫描二维码在手机上预览
3. 打开调试面板查看网络请求
4. 确认请求头包含 `X-Client-Type: wechat-miniprogram`

#### 5.3 检查清单

- [ ] 小程序后台已配置服务器域名
- [ ] 服务端已添加客户端识别中间件
- [ ] 小程序项目已配置正确 AppID
- [ ] 请求基地址指向 `https://www.mmdd10.tech`
- [ ] 登录接口可正常获取 openid
- [ ] API 调用返回正常数据

---

## 四、常见问题

### Q: 提示 "request 域名不合法"

**原因**：域名未在小程序后台配置，或配置未生效

**解决**：
1. 确认已在微信公众平台配置 `https://www.mmdd10.tech`
2. 等待 5-10 分钟（配置有缓存）
3. 在开发者工具中清除缓存重新编译

### Q: 微信登录返回 `code` 无效

**原因**：AppID 或 AppSecret 配置错误

**解决**：
1. 确认 `.env` 中的 `WECHAT_APPID` 和 `WECHAT_APPSECRET` 正确
2. 确认小程序项目的 AppID 与后台一致
3. 重启 Node.js 服务

### Q: 服务端识别客户端为 `pwa` 而非小程序

**原因**：请求头未正确传递

**解决**：
1. 确认小程序请求时添加了 `X-Client-Type: wechat-miniprogram` 头
2. 在服务端日志中打印 `req.headers` 检查
3. 确认 Nginx 没有过滤自定义请求头

### Q: 真机调试正常，体验版报错

**原因**：体验版需要开启「开发调试」模式

**解决**：
1. 打开小程序体验版
2. 点击右上角「···」→「开发调试」→「打开调试」
3. 重新进入小程序

---

## 五、关键配置汇总

### 5.1 小程序后台配置

| 配置项 | 值 |
|--------|-----|
| AppID | `wx1234567890abcdef` |
| AppSecret | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| request 合法域名 | `https://www.mmdd10.tech` |
| socket 合法域名 | `wss://www.mmdd10.tech` |
| uploadFile 合法域名 | `https://www.mmdd10.tech` |
| downloadFile 合法域名 | `https://www.mmdd10.tech` |

### 5.2 服务端环境变量

```bash
# .env
NODE_ENV=production
PORT=3000

# 阿里灵积 API
DASHSCOPE_API_KEY=xxx
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# 微信小程序
WECHAT_APPID=wx2e8c9453aab1b7ef
WECHAT_APPSECRET=ad357cfa185299c0a8930c5b8827a4f9
```

### 5.3 小程序项目配置

```javascript
// config.js
module.exports = {
  baseURL: 'https://www.mmdd10.tech',
  clientType: 'wechat-miniprogram'
};
```

---

## 六、相关链接

- [微信公众平台](https://mp.weixin.qq.com/)
- [小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信登录接口文档](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html)
