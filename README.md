# 多平台媒体发布工具

一个跨平台（Windows、macOS）的桌面应用，用于向多个媒体平台（小红书、抖音、B站、微博、快手、头条等）批量发布内容。

## 功能特性

- 🚀 **多平台发布** - 支持抖音、B站、小红书、微博、快手、今日头条等主流平台
- 🔐 **安全加密** - 使用系统级加密（Windows DPAPI / macOS Keychain）存储账户信息
- 📁 **拖拽上传** - 支持拖拽视频、图片、文章文件，自动识别类型
- 🎯 **智能推荐** - 根据媒体类型显示可发布的平台
- 💎 **付费系统** - 支持支付宝/微信支付，一次付费永久使用
- 📊 **发布历史** - 记录所有发布记录

## 技术栈

- **框架**: Electron + React + TypeScript
- **UI库**: Ant Design
- **本地存储**: electron-store
- **加密**: crypto (Node.js 内置 + Electron safeStorage)
- **构建**: Vite + electron-builder
- **路由**: react-router-dom

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 启动渲染进程开发服务器
npm run dev:renderer

# 编译主进程
npm run dev:main

# 同时启动（需要 concurrently）
npm run dev
```

### 构建

```bash
npm run build
```

### 打包

```bash
# 打包当前平台
npm run dist

# 打包 Windows
npm run dist:win

# 打包 macOS
npm run dist:mac
```

## 项目结构

```
media-publisher/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts            # 主进程入口
│   │   ├── storage/            # 账户加密存储
│   │   ├── license/            # 许可证管理
│   │   ├── features/           # 功能权限控制
│   │   └── publisher/          # 发布器实现
│   ├── preload/                 # 预加载脚本
│   └── renderer/               # React 前端
│       ├── pages/              # 页面组件
│       ├── components/         # 公共组件
│       ├── hooks/              # React Hooks
│       ├── styles/             # 样式文件
│       └── types/              # 类型定义
├── public/                      # 静态资源
└── assets/                      # 应用图标
```

## 配置说明

复制 `.env.example` 为 `.env` 并配置：

```
LICENSE_SERVER=https://your-domain.com/api
NODE_ENV=development
```

## 平台支持

| 平台 | 类型 | 登录方式 | 状态 |
|------|------|----------|------|
| 抖音 | 视频 | 二维码 | 开发中 |
| B站 | 视频 | 账号密码 | 开发中 |
| 快手 | 视频 | 二维码 | 开发中 |
| 西瓜视频 | 视频 | 账号密码 | 开发中 |
| 今日头条 | 文章 | 账号密码 | 开发中 |
| 知乎 | 文章 | 账号密码 | 开发中 |
| 简书 | 文章 | 账号密码 | 开发中 |
| 小红书 | 图文视频 | 二维码 | 开发中 |
| 微博 | 图文视频 | 账号密码 | 开发中 |

> **注意**: 大部分平台没有公开 API，需要使用 Puppeteer 模拟浏览器登录，具体实现需要后续持续维护。

## 开发指南

### 添加新平台

1. 在 `src/renderer/types/index.ts` 的 `PLATFORM_CONFIG` 中添加平台配置
2. 在 `src/main/publisher/` 中创建新的发布器类（继承 `BasePublisher`）
3. 在 `src/main/publisher/MediaPublisher.ts` 中注册新发布器

### 实现发布功能

各平台发布器目前只有框架，实际发布逻辑需要使用 Puppeteer：

```bash
npm install puppeteer
```

然后在各平台发布器中实现具体的爬虫逻辑。

## 安全说明

- 账户密码使用 Electron safeStorage API（Windows DPAPI / macOS Keychain）加密存储
- 降级方案使用 AES-256-CBC 加密，密钥基于机器特征生成
- 许可证使用 HMAC-SHA256 签名防止篡改
- 账户信息不会上传到任何服务器

## 付费功能

免费版限制：
- 每次最多发布到 1 个平台
- 每天最多发布 3 次
- 视频文件最大 100MB

付费版（¥99 永久）：
- 同时发布到多个平台（无限制）
- 每天无限次发布
- 支持大文件（无大小限制）

## TODO

- [ ] 各平台具体发布逻辑实现（使用 Puppeteer）
- [ ] 二维码登录具体实现
- [ ] 发布历史数据库存储（SQLite）
- [ ] 支付回调签名验证
- [ ] 日志系统
- [ ] 更新机制

## 测试建议

- [ ] 账户加密存储和解密
- [ ] 导出/导入账户备份
- [ ] 许可证激活流程
- [ ] 拖拽上传文件
- [ ] 平台选择和发布
- [ ] 付费流程（模拟）
- [ ] 免费版功能限制

## 许可证

MIT