import base64
import hashlib
import hmac
import os
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
OAUTH_STATE_SECRET = os.getenv("OAUTH_STATE_SECRET") or GITHUB_CLIENT_SECRET
STATE_TTL_SECONDS = int(os.getenv("OAUTH_STATE_TTL", "600"))
DIST_DIR = Path(__file__).parent / "dist"
DIST_ROOT = DIST_DIR.resolve()
INDEX_FILE = DIST_DIR / "index.html"

app = FastAPI(title="GitDoc OAuth Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_oauth_config():
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured")
    if not OAUTH_STATE_SECRET:
        raise HTTPException(status_code=500, detail="OAuth state secret is not configured")


def _state_signature(payload: str) -> str:
    return hmac.new(
        OAUTH_STATE_SECRET.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _encode_state(raw: str) -> str:
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8").rstrip("=")


def _decode_state(encoded: str) -> str:
    padding = "=" * (-len(encoded) % 4)
    return base64.urlsafe_b64decode((encoded + padding).encode("utf-8")).decode("utf-8")


def _build_oauth_state() -> str:
    payload = f"{int(time.time())}:{secrets.token_urlsafe(24)}"
    signature = _state_signature(payload)
    return _encode_state(f"{payload}:{signature}")


def _is_valid_oauth_state(state: str) -> bool:
    try:
        raw = _decode_state(state)
        ts_raw, nonce, signature = raw.split(":", 2)
        ts = int(ts_raw)
    except (TypeError, ValueError):
        return False

    if not nonce:
        return False

    if abs(int(time.time()) - ts) > STATE_TTL_SECONDS:
        return False

    payload = f"{ts}:{nonce}"
    expected = _state_signature(payload)
    return hmac.compare_digest(signature, expected)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/auth/github/login")
def github_login():
    _require_oauth_config()
    state = _build_oauth_state()
    query = urlencode(
        {
            "client_id": GITHUB_CLIENT_ID,
            "scope": "repo,user",
            "redirect_uri": f"{FRONTEND_URL}/callback",
            "state": state,
        }
    )
    return {
        "url": f"https://github.com/login/oauth/authorize?{query}",
        "state": state,
    }


class CallbackRequest(BaseModel):
    code: str
    state: str


@app.post("/api/auth/github/callback")
async def github_callback(body: CallbackRequest):
    _require_oauth_config()
    if not _is_valid_oauth_state(body.state):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": body.code,
            },
            headers={"Accept": "application/json"},
        )

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="GitHub token exchange failed")

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
    async def serve_spa(full_path: str):
        if full_path == "health" or full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        # 优先尝试返回静态文件
        if full_path:
            file_path = (DIST_DIR / full_path).resolve()
            try:
                file_path.relative_to(DIST_ROOT)
            except ValueError:
                raise HTTPException(status_code=404, detail="Not found")

            if file_path.is_file():
                return FileResponse(file_path)

        # 否则返回 index.html (SPA 路由)
        if not INDEX_FILE.exists():
            raise HTTPException(status_code=500, detail="Frontend index not found")
        return FileResponse(INDEX_FILE)
