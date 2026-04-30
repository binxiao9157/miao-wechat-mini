# 微信小程序服务器部署指南

> 本文档基于腾讯云轻量服务器环境，适用于微信小程序与 PWA 共用域名部署
>
> 部署域名: `www.mmdd10.tech` / `mmdd10.tech`
>
> 最后更新: 2026-04-29

---

## 目录

1. [部署架构说明](#一部署架构说明)
2. [部署前准备](#二部署前准备)
3. [服务器选购与初始化](#三服务器选购与初始化)
4. [域名与备案](#四域名与备案)
5. [环境搭建](#五环境搭建)
6. [代码部署](#六代码部署)
7. [SSL证书配置](#七ssl证书配置)
8. [Nginx反向代理](#八nginx反向代理)
9. [客户端识别配置](#九客户端识别配置)
10. [微信小程序后台配置](#十微信小程序后台配置)
11. [安全组配置](#十一安全组配置)
12. [验证与测试](#十二验证与测试)
13. [后续更新](#十三后续更新)
14. [常见问题](#十四常见问题)

---

## 一、部署架构说明

### 1.1 共用域名部署架构

本方案采用 **PWA 与微信小程序共用域名** 的部署方式：

```
                    用户请求
                       │
                       ▼
               ┌─────────────────┐
               │   www.mmdd10.tech │
               │   (HTTPS:443)    │
               └────────┬────────┘
                        │
               ┌────────▼────────┐
               │     Nginx       │
               │  (反向代理)      │
               └────────┬────────┘
                        │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │  PWA    │   │ 小程序   │   │  API   │
    │ 前端页面 │   │  API   │   │ 服务   │
    └─────────┘   └─────────┘   └────┬────┘
                                     │
                              ┌──────▼──────┐
                              │  Node.js    │
                              │  (Port 3000)│
                              └─────────────┘
```

### 1.2 客户端识别方式

| 识别方式 | 适用场景 | 实现难度 |
|----------|----------|----------|
| User-Agent | 简单区分 | 低 |
| 自定义请求头 | 精确识别 | 低 |
| Referer | 辅助识别 | 低 |

服务端通过识别客户端类型，可针对不同客户端返回差异化内容（如登录方式、支付接口等）。

---

## 二、部署前准备

### 2.1 微信小程序部署要求

微信小程序对服务器有以下硬性要求：

| 要求项 | 说明 |
|--------|------|
| **HTTPS** | 必须使用 HTTPS 协议，不支持 HTTP |
| **域名** | 必须使用已备案的域名 |
| **TLS版本** | 支持 TLS 1.2 及以上版本 |
| **证书** | 需要有效的 SSL 证书 |

### 2.2 准备清单

- [ ] 腾讯云账号
- [ ] 已注册域名（本文档使用 `mmdd10.tech`）
- [ ] 域名已完成 ICP 备案
- [ ] 微信小程序 AppID
- [ ] 服务器 IP: `124.221.2.31`

---

## 三、服务器选购与初始化

### 3.1 服务器选购

| 项目 | 配置 |
|------|----------|
| 产品 | 腾讯云轻量应用服务器 |
| 规格 | 2 核 2G（起步），推荐 2 核 4G |
| 系统 | Ubuntu 22.04 LTS |
| 地域 | 北京 |
| 带宽 | 5Mbps |
| 磁盘 | 40G SSD 系统盘 |
| IP | 124.221.2.31 |

> **注意**：国内服务器必须完成 ICP 备案才能使用 80/443 端口

### 3.2 系统初始化

SSH 登录服务器后执行：

```bash
# 1. 系统更新
sudo apt update && sudo apt upgrade -y

# 2. 安装基础工具
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# 3. 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. 验证版本
node -v   # 应输出 v20.x
npm -v    # 应输出 10.x+

# 5. 安装 PM2 进程管理器
sudo npm install -g pm2

# 6. 安装 PM2 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 7. 创建应用用户
sudo useradd -m -s /bin/bash miao
sudo mkdir -p /home/miao/app /home/miao/app/logs
sudo chown -R miao:miao /home/miao
```

---

## 四、域名与备案

### 4.1 DNS 解析配置

在腾讯云 DNSPod 添加 A 记录：

| 主机记录 | 记录类型 | 记录值 | TTL |
|----------|----------|--------|-----|
| `www` | A | `124.221.2.31` | 600 |
| `@` | A | `124.221.2.31` | 600 |

验证 DNS 生效：

```bash
# 安装 dig 工具
sudo apt install -y dnsutils

# 验证解析
dig +short www.mmdd10.tech
dig +short mmdd10.tech
```

### 4.2 ICP 备案

- **大陆服务器**：域名必须完成 ICP 备案，否则 80/443 端口会被拦截
- **香港/海外服务器**：无需备案，但到国内 API 延迟会增加

---

## 五、环境搭建

### 5.1 配置 SSH 密钥

```bash
# 切换到应用用户
sudo su - miao

# 生成 SSH 密钥
ssh-keygen -t ed25519 -C "miao-server"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

将公钥添加到 GitHub → **Settings** → **SSH and GPG keys** → **New SSH key**

验证连接：

```bash
ssh -T git@github.com
```

### 5.2 克隆代码

```bash
cd ~/app

# 克隆代码（使用 SSH 方式）
git clone git@github.com:binxiao9157/Miao.git .

# 安装依赖
npm install

# 安装 Tailwind CSS 原生绑定
npm install @tailwindcss/oxide-linux-x64-gnu
```

### 5.3 配置环境变量

```bash
cat > /home/miao/app/.env << 'EOF'
NODE_ENV=production
PORT=3000

# 阿里百练 / 灵积 DashScope API 配置
DASHSCOPE_API_KEY=<your_dashscope_api_key>
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/api/v1
DASHSCOPE_IMAGE_MODEL=qwen-image-2.0
DASHSCOPE_VIDEO_MODEL=wan2.2-i2v-flash

# AliCloud AccessKey（如需 OSS 等服务）
ALICLOUD_AK_ID=<your_alicloud_ak_id>
ALICLOUD_AK_SECRET=<your_alicloud_ak_secret>
EOF

# 限制文件权限
chmod 600 /home/miao/app/.env
```

> **安全提示**：
> - 服务端变量不要加 `VITE_` 前缀，防止泄露到前端
> - 密钥从 [阿里云灵积控制台](https://dashscope.console.aliyun.com/) 获取

### 5.4 构建前端

```bash
cd /home/miao/app
npm run build

# 确认构建产物
ls -la dist/
```

---

## 六、代码部署

### 6.1 创建 PM2 配置

```bash
cat > /home/miao/app/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'miao',
    script: 'server.ts',
    interpreter: './node_modules/.bin/tsx',
    cwd: '/home/miao/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/miao/app/logs/error.log',
    out_file: '/home/miao/app/logs/output.log',
    merge_logs: true,
    max_restarts: 10,
    restart_delay: 3000,
  }]
};
EOF
```

### 6.2 启动服务

```bash
# 确保使用 miao 用户
sudo su - miao
cd ~/app

# 启动服务
pm2 start ecosystem.config.cjs
pm2 status

# 验证服务
pm2 logs miao
curl http://127.0.0.1:3000/api/health
```

### 6.3 设置开机自启

```bash
# 生成 startup 脚本
sudo -u miao bash -c 'cd /home/miao/app && pm2 startup systemd -u miao --hp /home/miao'

# 按提示执行输出的 sudo 命令
sudo -u miao bash -c 'pm2 save'
```

---

## 七、SSL证书配置

### 7.1 申请 Let's Encrypt 证书

```bash
# 申请证书（同时包含 www 和裸域名）
sudo certbot --nginx -d www.mmdd10.tech -d mmdd10.tech
```

按提示操作：
1. 输入邮箱地址（用于证书到期提醒）
2. 输入 `A` 同意服务条款
3. 输入 `N` 不订阅邮件推广

### 7.2 验证证书

```bash
# 查看证书文件
sudo ls -la /etc/letsencrypt/live/www.mmdd10.tech/

# 查看证书信息
sudo openssl x509 -in /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem -noout -subject -dates
```

### 7.3 配置自动续签

```bash
# 确认自动续签已启用
sudo systemctl status certbot.timer

# 测试续签流程
sudo certbot renew --dry-run
```

---

## 八、Nginx反向代理

### 8.1 完整 HTTPS 配置

```bash
sudo tee /etc/nginx/sites-available/miao > /dev/null << 'NGINX'
# HTTP -> HTTPS 重定向
server {
    listen 80;
    server_name www.mmdd10.tech mmdd10.tech;
    return 301 https://www.mmdd10.tech$request_uri;
}

# 裸域名 HTTPS -> www 重定向
server {
    listen 443 ssl http2;
    server_name mmdd10.tech;
    ssl_certificate /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.mmdd10.tech/privkey.pem;
    return 301 https://www.mmdd10.tech$request_uri;
}

# 主站配置
server {
    listen 443 ssl http2;
    server_name www.mmdd10.tech;

    # SSL 配置
    ssl_certificate /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.mmdd10.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头（微信小程序要求）
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # 请求体大小限制
    client_max_body_size 60m;

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 120s;
        proxy_buffering off;
    }

    # Service Worker
    location = /service-worker.js {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 静态资源
    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 默认路由
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;
}
NGINX
```

### 8.2 启用配置

```bash
# 移除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 启用站点
sudo ln -sf /etc/nginx/sites-available/miao /etc/nginx/sites-enabled/miao

# 测试并重载
sudo nginx -t && sudo systemctl reload nginx
```

### 8.3 验证 HTTPS

```bash
# 测试 HTTPS
curl -I https://www.mmdd10.tech

# 测试 HTTP 跳转
curl -I http://www.mmdd10.tech
```

---

## 九、客户端识别配置

PWA 和微信小程序共用域名时，服务端需要识别客户端类型以提供差异化服务。

### 9.1 识别方式对比

| 方式 | 原理 | 可靠性 | 适用场景 |
|------|------|--------|----------|
| User-Agent | 分析请求头中的 UA 字符串 | 高 | 简单区分 |
| 自定义请求头 | 客户端主动添加标识 | 最高 | 精确识别 |
| Referer | 检查请求来源 | 中 | 辅助识别 |

### 9.2 User-Agent 识别

**微信小程序 UA 特征**：
```
Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)
AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15A148
MicroMessenger/8.0.38(0x18002628) NetType/WIFI Language/zh_CN miniProgram
```

**服务端识别代码**（server.ts）：

```typescript
// middleware/client-identify.ts
export function identifyClient(req, res, next) {
  const ua = req.headers['user-agent'] || '';
  const referer = req.headers.referer || '';

  // 识别逻辑
  if (ua.includes('MicroMessenger') && ua.includes('miniprogram')) {
    req.clientType = 'wechat-miniprogram';
  } else if (referer.includes('servicewechat.com')) {
    req.clientType = 'wechat-miniprogram';
  } else {
    req.clientType = 'pwa';
  }

  next();
}
```

### 9.3 自定义请求头识别（推荐）

**小程序端**（wx.request）：
```javascript
wx.request({
  url: 'https://www.mmdd10.tech/api/generate',
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'wechat-miniprogram',
    'X-App-Version': '1.0.0'
  },
   { /* ... */ },
  success: (res) => { /* ... */ }
});
```

**PWA 端**（fetch）：
```javascript
fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'pwa',
    'X-App-Version': '1.0.0'
  },
  body: JSON.stringify({ /* ... */ })
});
```

**服务端统一处理**：
```typescript
// 应用中间件
app.use('/api', identifyClient);

// API 路由中使用
app.post('/api/generate', (req, res) => {
  const clientType = req.headers['x-client-type'] || req.clientType;

  if (clientType === 'wechat-miniprogram') {
    // 小程序特定处理
    handleWechatRequest(req, res);
  } else {
    // PWA 处理
    handlePwaRequest(req, res);
  }
});
```

### 9.4 需要区分处理的场景

| 功能 | PWA | 微信小程序 | 处理方式 |
|------|-----|-----------|----------|
| **登录鉴权** | 账号密码 / 短信 | wx.login 获取 code | 根据 clientType 分流 |
| **支付** | 支付宝/其他 | 微信支付 | 调用不同支付接口 |
| **图片上传** | `<input type="file">` | `wx.chooseImage` | 前端差异化，后端统一接收 |
| **文件下载** | 直接下载 | `wx.downloadFile` | 后端统一提供 URL |
| **分享** | Web Share API | `wx.showShareMenu` | 前端差异化处理 |
| **本地存储** | localStorage | `wx.getStorageSync` | 前端差异化处理 |
| **获取用户信息** | 表单填写 | `wx.getUserProfile` | 根据 clientType 分流 |

### 9.5 完整识别中间件示例

```typescript
// utils/client-detector.ts
export type ClientType = 'wechat-miniprogram' | 'pwa' | 'unknown';

export function detectClient(req): ClientType {
  const ua = req.headers['user-agent'] || '';
  const customHeader = req.headers['x-client-type'];
  const referer = req.headers.referer || '';

  // 优先级：自定义头 > User-Agent > Referer
  if (customHeader === 'wechat-miniprogram') {
    return 'wechat-miniprogram';
  }

  if (ua.includes('MicroMessenger') && ua.includes('miniprogram')) {
    return 'wechat-miniprogram';
  }

  if (referer.includes('servicewechat.com')) {
    return 'wechat-miniprogram';
  }

  if (ua.includes('Mozilla') && !ua.includes('MicroMessenger')) {
    return 'pwa';
  }

  return 'unknown';
}

// middleware/client-middleware.ts
export function clientMiddleware(req, res, next) {
  req.clientType = detectClient(req);
  req.isWechat = req.clientType === 'wechat-miniprogram';
  req.isPwa = req.clientType === 'pwa';

  // 日志记录（调试用）
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Client: ${req.clientType}`);

  next();
}
```

---

## 十、微信小程序后台配置

### 10.1 配置服务器域名

登录 [微信公众平台](https://mp.weixin.qq.com/) → 开发 → 开发管理 → 开发设置 → 服务器域名

| 配置项 | 填写内容 |
|--------|----------|
| request 合法域名 | `https://www.mmdd10.tech` |
| socket 合法域名 | `wss://www.mmdd10.tech` |
| uploadFile 合法域名 | `https://www.mmdd10.tech` |
| downloadFile 合法域名 | `https://www.mmdd10.tech` |

### 10.2 配置业务域名（WebView 组件）

如需使用 WebView 组件，需在 **业务域名** 中添加：

```
https://www.mmdd10.tech
```

### 10.3 下载校验文件

1. 在微信小程序后台下载校验文件（如 `xxx.txt`）
2. 将文件放置到服务器 `dist/` 目录下
3. 确保可通过 `https://www.mmdd10.tech/xxx.txt` 访问

---

## 十一、安全组配置

在腾讯云控制台 → 轻量服务器 → 防火墙，添加规则：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 你的IP | SSH 管理 |
| TCP | 80 | 0.0.0.0/0 | HTTP（重定向用） |
| TCP | 443 | 0.0.0.0/0 | HTTPS |

> **注意**：不要开放 3000 端口，Node.js 只监听 127.0.0.1

---

## 十二、验证与测试

### 12.1 服务端验证

| 检查项 | 命令 |
|--------|------|
| Node 运行状态 | `pm2 status` |
| 健康检查 | `curl http://127.0.0.1:3000/api/health` |
| Nginx 状态 | `sudo systemctl status nginx` |
| HTTPS 访问 | `curl -I https://www.mmdd10.tech` |

### 12.2 PWA 验证

1. 浏览器访问 `https://www.mmdd10.tech`
2. 确认地址栏显示安全锁图标
3. 确认 PWA 可正常安装
4. 测试图片/视频生成功能

### 12.3 微信小程序验证

1. 打开微信开发者工具
2. 在 **详情** → **本地设置** 中取消勾选「不校验合法域名」
3. 进行真机调试
4. 打开调试面板查看网络请求是否正常
5. 确认请求头中包含 `X-Client-Type: wechat-miniprogram`

### 12.4 检查清单

- [ ] HTTPS 可正常访问
- [ ] 域名已完成备案
- [ ] 小程序后台已配置服务器域名
- [ ] 业务域名已配置（如使用 WebView）
- [ ] 校验文件已上传
- [ ] PWA 可正常安装和使用
- [ ] 小程序 API 调用正常
- [ ] 客户端识别正确
- [ ] 真机测试通过

---

## 十三、后续更新

### 13.1 手动更新

```bash
sudo su - miao
cd ~/app

git pull origin main
npm install
npm run build
pm2 restart miao

# 查看日志
pm2 logs miao --lines 20
```

### 13.2 一键部署脚本

```bash
cat > /home/miao/app/deploy.sh << 'SCRIPT'
#!/bin/bash
set -e
cd /home/miao/app

PREV_COMMIT=$(git rev-parse HEAD)

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing dependencies..."
npm install

echo "==> Building frontend..."
if ! npm run build; then
    echo "!!! Build failed, rolling back..."
    git checkout "$PREV_COMMIT"
    npm install && npm run build && pm2 restart miao
    exit 1
fi

echo "==> Restarting server..."
pm2 restart miao

echo "==> Deploy success!"
pm2 status
SCRIPT

chmod +x /home/miao/app/deploy.sh
```

使用方式：

```bash
sudo su - miao
cd ~/app
./deploy.sh
```

---

## 十四、常见问题

### Q: 小程序提示 "request 域名不合法"

A:
1. 确认 `https://www.mmdd10.tech` 已在小程序后台的服务器域名中配置
2. 确认域名使用 HTTPS 协议
3. 确认域名已完成 ICP 备案
4. 等待 5-10 分钟后重试（配置有缓存）

### Q: 如何验证客户端识别是否正确？

A:
1. 在服务端添加日志输出 `req.clientType`
2. 小程序端在开发者工具 Network 面板查看请求头
3. 检查日志中是否正确识别为 `wechat-miniprogram`

### Q: PWA 和小程序需要不同的登录方式如何处理？

A:
```typescript
app.post('/api/login', (req, res) => {
  if (req.clientType === 'wechat-miniprogram') {
    // 小程序登录：使用 wx.login 获取的 code
    const { code } = req.body;
    // 调用微信接口换取 openid
  } else {
    // PWA 登录：使用账号密码
    const { username, password } = req.body;
  }
});
```

### Q: HTTPS 证书错误

A:
1. 确认证书未过期：`sudo openssl x509 -in /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem -noout -dates`
2. 确认证书链完整
3. 确认服务器时间正确：`date`

### Q: 真机调试正常，体验版/正式版报错

A:
1. 检查体验版/正式版是否开启了「开发调试」
2. 确认服务器域名配置已提交并审核通过
3. 检查业务域名配置（如使用 WebView）

### Q: 访问显示 502 Bad Gateway

A: Node.js 未启动或崩溃。检查 `pm2 status` 和 `pm2 logs miao`。

### Q: API 调用报 "DASHSCOPE_API_KEY 环境变量未设置"

A: 确认 `.env` 文件路径正确且 PM2 已重启：`pm2 restart miao`。

### Q: 视频生成超时

A: Nginx 默认 60s 超时。已在配置中设置 `proxy_read_timeout 180s`，若仍不够可调大。

---

## 附录

### A. 相关链接

- [微信公众平台](https://mp.weixin.qq.com/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [阿里云灵积控制台](https://dashscope.console.aliyun.com/)
- [Let's Encrypt](https://letsencrypt.org/)

### B. 关键文件路径

| 文件 | 路径 |
|------|------|
| 应用目录 | `/home/miao/app` |
| 环境变量 | `/home/miao/app/.env` |
| PM2 配置 | `/home/miao/app/ecosystem.config.cjs` |
| 日志目录 | `/home/miao/app/logs` |
| Nginx 配置 | `/etc/nginx/sites-available/miao` |
| SSL 证书 | `/etc/letsencrypt/live/www.mmdd10.tech/` |

### C. 部署架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户访问                              │
│              PWA 浏览器  │  微信小程序                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
               ┌───────────────────────┐
               │   www.mmdd10.tech     │
               │    (HTTPS/443)        │
               └───────────┬───────────┘
                           │
               ┌───────────▼───────────┐
               │        Nginx          │
               │    (反向代理/负载均衡)  │
               └───────────┬───────────┘
                           │
               ┌───────────▼───────────┐
               │      Node.js          │
               │    (127.0.0.1:3000)   │
               │                       │
               │  ┌─────────────────┐  │
               │  │  客户端识别中间件  │  │
               │  │  - User-Agent    │  │
               │  │  - X-Client-Type │  │
               │  └─────────────────┘  │
               │                       │
               │  ┌─────────────────┐  │
               │  │   API 路由分发   │  │
               │  │  - PWA 接口      │  │
               │  │  - 小程序接口    │  │
               │  └─────────────────┘  │
               │                       │
               │  ┌─────────────────┐  │
               │  │   核心业务逻辑   │  │
               │  │  - 图片生成      │  │
               │  │  - 视频生成      │  │
               │  └─────────────────┘  │
               └───────────────────────┘
                           │
                           ▼
               ┌───────────────────────┐
               │    阿里云灵积 API      │
               │   (DashScope)         │
               └───────────────────────┘
```
