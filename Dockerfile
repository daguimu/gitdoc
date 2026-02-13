# 所有用于 FROM 的 ARG 必须在第一个 FROM 之前声明
ARG NODE_IMAGE=node:22-alpine
ARG PYTHON_IMAGE=python:3.12-slim

# ============================================
# Stage 1: 构建前端
# ============================================
FROM ${NODE_IMAGE} AS frontend-builder

WORKDIR /build

# npm 镜像加速
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY}

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: 最终镜像
# ============================================
FROM ${PYTHON_IMAGE}

LABEL maintainer="gitdoc"
LABEL description="GitDoc - GitHub-based personal document system"

WORKDIR /app

# pip 镜像加速
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# 安装 Python 依赖
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -i ${PIP_INDEX_URL} -r requirements.txt

# 复制后端代码
COPY backend/main.py ./

# 复制前端构建产物到后端 dist 目录
COPY --from=frontend-builder /build/dist ./dist

# 非 root 用户运行
RUN useradd -r -u 1000 -m gitdoc
USER gitdoc

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
