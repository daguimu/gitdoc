# GitDoc

一个以 GitHub 为存储后端的个人文档管理系统。

GitDoc 是一个纯前端工具 —— 服务端不存储任何用户数据，你的所有文档始终保存在你自己的 GitHub 仓库中，完全由你掌控。GitDoc 只是提供了一个更友好的 Web 编辑器界面，让你可以在浏览器中直接创建、编辑和管理 GitHub 仓库中的文件，无需使用 Git 命令行或 GitHub 网页端的繁琐操作。

你可以直接使用在线站点 **[https://gitdoc.dagm.com](https://gitdoc.dagm.com)** 作为你的 GitHub 文档管理工具，无需自行部署；也可以自行部署到你自己的服务器上。

[English](./README.md)

## 功能特性

- **GitHub 作为存储** — 文档存储在你的 GitHub 仓库中，无需额外数据库。
- **Markdown & 富文本编辑器** — 基于 [Vditor](https://github.com/Vanessa219/vditor)，支持 Markdown 源码模式和所见即所得富文本模式，提供完整的格式化工具栏。
- **文件管理** — 在 Web 界面中直接新建、上传和删除文件和文件夹。
- **文件预览** — 内置图片、视频、音频、PDF 文件预览。
- **版本历史** — 查看任意文件的提交历史、查看差异对比、一键恢复到历史版本。
- **已删除文件恢复** — 浏览并恢复已删除的文件。
- **仓库选择器** — 浏览所有 GitHub 仓库，支持搜索、过滤（公开/私有）、收藏。
- **实时同步** — 自动检测外部变更（如在其他标签页或 GitHub 网页端的修改），并刷新界面。
- **可折叠侧边栏** — 收起文件树面板，最大化编辑器空间。
- **国际化** — 完整支持中文和英文界面，一键切换语言。
- **Docker 部署** — 使用 Docker Compose 单容器部署，多阶段构建确保镜像体积最小。
- **CI/CD 支持** — 内置 Jenkinsfile，支持自动化部署。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、TypeScript、Vite 7 |
| UI 组件库 | Ant Design 6 |
| 编辑器 | Vditor 3 |
| GitHub API | Octokit.js |
| 路由 | React Router 7 |
| 后端 | FastAPI (Python 3.12) |
| 部署 | Docker、Docker Compose |
| CI/CD | Jenkins |

## 架构

```
浏览器
  │
  ├── React SPA (Ant Design + Vditor)
  │     ├── GitHub API (Octokit.js) ──► GitHub REST API
  │     └── /api/* ──► FastAPI 后端
  │
  └── FastAPI 后端
        ├── GET  /api/auth/github/login     → 返回 OAuth 授权 URL
        ├── POST /api/auth/github/callback  → 用授权码换取 Token
        ├── GET  /health                    → 健康检查
        └── GET  /*                         → 提供前端静态文件
```

后端设计非常轻量 —— 仅处理 GitHub OAuth 认证（因为 `client_secret` 必须保留在服务端）和前端静态文件服务。所有文档操作都由浏览器直接调用 GitHub API 完成。

## 前置要求

- [Docker](https://docs.docker.com/get-docker/) 和 Docker Compose
- 一个 [GitHub OAuth App](https://github.com/settings/developers)

## 快速开始

### 1. 创建 GitHub OAuth App

前往 [GitHub Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/developers)：

| 字段 | 值 |
|------|---|
| Application name | GitDoc（或任意名称） |
| Homepage URL | `http://localhost:8080` |
| Authorization callback URL | `http://localhost:8080/callback` |

创建后记录 **Client ID**，并点击生成 **Client Secret**。

### 2. 配置环境变量

```bash
cd deploy
cp .env.example .env
```

编辑 `.env`，填入 OAuth 凭据：

```env
GITHUB_CLIENT_ID=你的_client_id
GITHUB_CLIENT_SECRET=你的_client_secret
OAUTH_STATE_SECRET=替换为一个足够随机的长字符串
FRONTEND_URL=http://localhost:8080
SERVER_PORT=8080
TZ=Asia/Shanghai
```

### 3. 构建并启动

```bash
cd deploy
docker compose up --build -d
```

访问 `http://localhost:8080`，使用 GitHub 账号登录即可。

## 本地开发

### 后端

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入 OAuth 凭据

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器运行在 `http://localhost:5173`，`/api/*` 请求会自动代理到 `http://localhost:8000`。

## 部署

### Docker Compose（推荐）

```bash
cd deploy
cp .env.example .env
# 编辑 .env

docker compose up --build -d
```

### 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `GITHUB_CLIENT_ID` | 是 | — | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | 是 | — | GitHub OAuth App Client Secret |
| `OAUTH_STATE_SECRET` | 建议 | `GITHUB_CLIENT_SECRET` | 用于签名 OAuth state 的服务端密钥 |
| `FRONTEND_URL` | 是 | `http://localhost:8080` | 公开访问地址（用于 OAuth 回调） |
| `SERVER_PORT` | 否 | `8080` | 宿主机端口映射 |
| `TZ` | 否 | `Asia/Shanghai` | 容器时区 |
| `NODE_IMAGE` | 否 | `node:22-alpine` | Node.js Docker 镜像 |
| `PYTHON_IMAGE` | 否 | `python:3.12-slim` | Python Docker 镜像 |
| `NPM_REGISTRY` | 否 | `https://registry.npmjs.org` | npm 镜像源 |
| `PIP_INDEX_URL` | 否 | `https://pypi.org/simple` | PyPI 镜像源 |

> **国内用户提示**：`.env.example` 中已预配置了国内镜像加速源（npmmirror、清华 PyPI、docker.1ms.run），可直接使用。

### 反向代理（Nginx）

如果使用 Nginx + HTTPS 部署：

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.crt;
    ssl_certificate_key /path/to/cert.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

同时将 `.env` 中的 `FRONTEND_URL` 更新为 `https://your-domain.com`。

### Jenkins CI/CD

项目包含 `Jenkinsfile` 用于自动化部署，流程如下：

1. 从 Git 拉取代码
2. 打包并通过 SSH 上传到部署服务器
3. 在服务器上执行 `docker compose up --build -d`
4. 执行健康检查

详见 [`Jenkinsfile`](./Jenkinsfile)。

## 项目结构

```
gitdoc/
├── frontend/                  # React + TypeScript 前端
│   ├── src/
│   │   ├── pages/             # 页面组件（Login、Home、Doc、Callback）
│   │   ├── components/        # UI 组件（Editor、FileTree、FileHistory 等）
│   │   ├── services/          # API 服务层（auth、github）
│   │   ├── hooks/             # 自定义 Hooks（useAuth）
│   │   ├── i18n/              # 国际化（中文、英文）
│   │   ├── App.tsx            # 路由和应用入口
│   │   └── config.ts          # API 地址配置
│   ├── package.json
│   └── vite.config.ts
├── backend/                   # FastAPI 后端
│   ├── main.py                # OAuth 代理 + 静态文件服务
│   └── requirements.txt
├── deploy/                    # 部署配置
│   ├── docker-compose.yml
│   └── .env.example
├── Dockerfile                 # 多阶段 Docker 构建
├── Jenkinsfile                # CI/CD 流水线
└── .gitignore
```

## 参与贡献

欢迎贡献代码！请随时提交 Issue 或 Pull Request。

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m 'Add amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 发起 Pull Request

## 许可证

本项目基于 [MIT 许可证](./LICENSE) 开源。
