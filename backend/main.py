import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
DIST_DIR = Path(__file__).parent / "dist"

app = FastAPI(title="GitDoc OAuth Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/auth/github/login")
def github_login():
    """返回 GitHub OAuth 授权 URL"""
    return {
        "url": (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={GITHUB_CLIENT_ID}"
            f"&scope=repo,user"
            f"&redirect_uri={FRONTEND_URL}/callback"
        )
    }


class CallbackRequest(BaseModel):
    code: str


@app.post("/api/auth/github/callback")
async def github_callback(body: CallbackRequest):
    """用 authorization code 换取 access_token"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": body.code,
            },
            headers={"Accept": "application/json"},
        )

    data = resp.json()
    if "access_token" not in data:
        raise HTTPException(status_code=400, detail=data.get("error_description", "OAuth failed"))

    return {"access_token": data["access_token"], "token_type": data["token_type"]}


# --- 托管前端静态文件 (生产模式) ---
if DIST_DIR.exists():
    # 静态资源 (JS/CSS/图片等)
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    # SPA fallback: 所有非 API 路由返回 index.html
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # 优先尝试返回静态文件
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # 否则返回 index.html (SPA 路由)
        return HTMLResponse((DIST_DIR / "index.html").read_text())
