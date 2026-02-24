# ARGs used in FROM must be declared before the first FROM
ARG NODE_IMAGE=node:22-alpine
ARG PYTHON_IMAGE=python:3.12-slim

# ============================================
# Stage 1: Build frontend
# ============================================
FROM ${NODE_IMAGE} AS frontend-builder

WORKDIR /build

ARG NPM_REGISTRY=https://registry.npmjs.org
RUN npm config set registry ${NPM_REGISTRY}

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Final image
# ============================================
FROM ${PYTHON_IMAGE}

LABEL maintainer="gitdoc"
LABEL description="GitDoc - GitHub-based personal document system"

WORKDIR /app

ARG PIP_INDEX_URL=https://pypi.org/simple

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -i ${PIP_INDEX_URL} -r requirements.txt

COPY backend/main.py ./

# Copy frontend build output
COPY --from=frontend-builder /build/dist ./dist

# Run as non-root user
RUN useradd -r -u 1000 -m gitdoc
USER gitdoc

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
