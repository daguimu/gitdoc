# GitDoc

A personal document management system powered by GitHub.

GitDoc is a pure frontend tool — the server stores no user data whatsoever. All your documents remain in your own GitHub repositories, fully under your control. GitDoc simply provides a friendlier web editor interface, allowing you to create, edit, and manage files in your GitHub repos directly from the browser — no Git CLI or clunky GitHub web UI required.

You can use the hosted version at **[https://gitdoc.dagm.com](https://gitdoc.dagm.com)** as your GitHub document manager right away, no deployment needed. Or you can self-host it on your own server.

[中文文档](./README_zh.md)

## Features

- **GitHub as Storage** — Your documents are stored in GitHub repositories. No extra database needed.
- **Markdown & Rich Text Editor** — Powered by [Vditor](https://github.com/Vanessa219/vditor), supporting both Markdown source mode and WYSIWYG rich-text mode with a full formatting toolbar.
- **File Management** — Create, upload, and delete files and folders directly from the web UI.
- **File Preview** — Built-in preview for images, videos, audio files, and PDFs.
- **Version History** — View the commit history of any file, inspect diffs, and restore previous versions with one click.
- **Deleted File Recovery** — Browse and restore deleted files from the trash.
- **Repository Selector** — Browse all your GitHub repositories with search, filter (public/private), and favorites.
- **Real-time Sync** — Automatically detects external changes (e.g., edits from another tab or via GitHub web) and refreshes the UI.
- **Collapsible Sidebar** — Toggle the file tree panel to maximize editor space.
- **Internationalization** — Full Chinese and English UI support with one-click language switching.
- **Docker Deployment** — Single-container deployment with Docker Compose. Multi-stage build for minimal image size.
- **CI/CD Ready** — Includes a Jenkinsfile for automated deployment.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7 |
| UI Components | Ant Design 6 |
| Editor | Vditor 3 |
| GitHub API | Octokit.js |
| Routing | React Router 7 |
| Backend | FastAPI (Python 3.12) |
| Deployment | Docker, Docker Compose |
| CI/CD | Jenkins |

## Architecture

```
Browser
  │
  ├── React SPA (Ant Design + Vditor)
  │     ├── GitHub API (via Octokit.js) ──► GitHub REST API
  │     └── /api/* ──► FastAPI Backend
  │
  └── FastAPI Backend
        ├── GET  /api/auth/github/login     → OAuth authorization URL
        ├── POST /api/auth/github/callback  → Exchange code for token
        ├── GET  /health                    → Health check
        └── GET  /*                         → Serve SPA static files
```

The backend is intentionally minimal — it only handles GitHub OAuth (because `client_secret` must stay server-side) and serves the frontend static files. All document operations go directly from the browser to GitHub's API.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A [GitHub OAuth App](https://github.com/settings/developers)

## Quick Start

### 1. Create a GitHub OAuth App

Go to [GitHub Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/developers):

| Field | Value |
|-------|-------|
| Application name | GitDoc (or anything you like) |
| Homepage URL | `http://localhost:8080` |
| Authorization callback URL | `http://localhost:8080/callback` |

After creating, note down the **Client ID** and generate a **Client Secret**.

### 2. Configure Environment

```bash
cd deploy
cp .env.example .env
```

Edit `.env` with your OAuth credentials:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
OAUTH_STATE_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:8080
SERVER_PORT=8080
TZ=Asia/Shanghai
```

### 3. Build and Run

```bash
cd deploy
docker compose up --build -d
```

Visit `http://localhost:8080` and log in with your GitHub account.

## Development Setup

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your OAuth credentials

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at `http://localhost:5173` and proxies `/api/*` requests to `http://localhost:8000`.

## Deployment

### Docker Compose (Recommended)

```bash
cd deploy
cp .env.example .env
# Edit .env

docker compose up --build -d
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_CLIENT_ID` | Yes | — | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Yes | — | GitHub OAuth App Client Secret |
| `OAUTH_STATE_SECRET` | Recommended | `GITHUB_CLIENT_SECRET` | Secret used to sign OAuth state tokens |
| `FRONTEND_URL` | Yes | `http://localhost:8080` | Public URL (used for OAuth callback) |
| `SERVER_PORT` | No | `8080` | Host port mapping |
| `TZ` | No | `Asia/Shanghai` | Container timezone |
| `NODE_IMAGE` | No | `node:22-alpine` | Node.js Docker image |
| `PYTHON_IMAGE` | No | `python:3.12-slim` | Python Docker image |
| `NPM_REGISTRY` | No | `https://registry.npmjs.org` | npm registry URL |
| `PIP_INDEX_URL` | No | `https://pypi.org/simple` | PyPI index URL |

### Reverse Proxy (Nginx)

If deploying behind Nginx with HTTPS:

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

Update `FRONTEND_URL` in `.env` to `https://your-domain.com`.

### Jenkins CI/CD

A `Jenkinsfile` is included for automated deployment. It:

1. Checks out the code from Git
2. Packages and uploads to the deployment server via SSH
3. Runs `docker compose up --build -d` on the server
4. Performs a health check

See [`Jenkinsfile`](./Jenkinsfile) for details.

## Project Structure

```
gitdoc/
├── frontend/                  # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/             # Page components (Login, Home, Doc, Callback)
│   │   ├── components/        # UI components (Editor, FileTree, FileHistory, ...)
│   │   ├── services/          # API layer (auth, github)
│   │   ├── hooks/             # Custom hooks (useAuth)
│   │   ├── i18n/              # Internationalization (zh, en)
│   │   ├── App.tsx            # Router and app entry
│   │   └── config.ts          # API base URL config
│   ├── package.json
│   └── vite.config.ts
├── backend/                   # FastAPI backend
│   ├── main.py                # OAuth proxy + static file server
│   └── requirements.txt
├── deploy/                    # Deployment configs
│   ├── docker-compose.yml
│   └── .env.example
├── Dockerfile                 # Multi-stage Docker build
├── Jenkinsfile                # CI/CD pipeline
└── .gitignore
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](./LICENSE).
