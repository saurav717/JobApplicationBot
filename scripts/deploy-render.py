#!/usr/bin/env python3
"""
Render deployment script for ApplyBot.

Usage:
    python3 scripts/deploy-render.py

Requirements: Python 3.8+ (no extra packages needed — uses urllib only)
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

# ── Configuration ─────────────────────────────────────────────────────────────

# ── Load .env file if present (looks in applybot-backend/.env) ────────────────
def _load_dotenv():
    here = os.path.dirname(os.path.abspath(__file__))
    for candidate in [
        os.path.join(here, "..", "applybot-backend", ".env"),
        os.path.join(here, "..", ".env"),
    ]:
        path = os.path.normpath(candidate)
        if os.path.isfile(path):
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        os.environ.setdefault(k.strip(), v.strip())
            break

_load_dotenv()


def _require(key):
    v = os.environ.get(key, "")
    if not v:
        print(f"\nERROR: environment variable {key!r} is not set.")
        print("Set it or add it to applybot-backend/.env and re-run.")
        sys.exit(1)
    return v


RENDER_API_KEY = _require("RENDER_API_KEY")
GITHUB_REPO    = os.environ.get("GITHUB_REPO",   "saurav717/JobApplicationBot")
GITHUB_BRANCH  = os.environ.get("GITHUB_BRANCH", "main")

# Secrets to inject into the backend service (sync: false in render.yaml)
SECRETS = {
    "GROQ_API_KEY":        _require("GROQ_API_KEY"),
    "QDRANT_URL":          _require("QDRANT_URL"),
    "QDRANT_API_KEY":      _require("QDRANT_API_KEY"),
    "HUGGINGFACE_API_KEY": _require("HUGGINGFACE_API_KEY"),
}

BASE = "https://api.render.com/v1"
HEADERS = {
    "Authorization": f"Bearer {RENDER_API_KEY}",
    "Content-Type":  "application/json",
    "Accept":        "application/json",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _req(method, path, body=None):
    url  = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req  = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        raise RuntimeError(f"HTTP {e.code} on {method} {url}: {detail}")


def get(path):      return _req("GET",    path)
def post(path, b):  return _req("POST",   path, b)
def patch(path, b): return _req("PATCH",  path, b)


def find_owner():
    owners = get("/owners?limit=20")
    # owners is a list of {"owner": {...}}
    for o in owners:
        owner = o.get("owner", o)
        if owner.get("type") == "user":
            return owner["id"]
    return owners[0].get("owner", owners[0])["id"]


def find_service(name):
    svcs = get(f"/services?limit=50")
    for s in svcs:
        svc = s.get("service", s)
        if svc.get("name") == name:
            return svc
    return None


def set_env_vars(service_id, kvs):
    body = [{"key": k, "value": v} for k, v in kvs.items()]
    _req("PUT", f"/services/{service_id}/env-vars", body)

# ── Step 1: create backend web service ───────────────────────────────────────

def create_backend(owner_id):
    print("Creating backend service applybot-api …")
    svc = find_service("applybot-api")
    if svc:
        print(f"  ✓ Already exists: {svc['id']}")
        return svc

    body = {
        "type": "web_service",
        "name": "applybot-api",
        "ownerId": owner_id,
        "repo": f"https://github.com/{GITHUB_REPO}",
        "branch": GITHUB_BRANCH,
        "rootDir": "applybot-backend",
        "serviceDetails": {
            "env": "python",
            "buildCommand": "pip install -r requirements.txt && playwright install chromium --with-deps",
            "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
            "plan": "free",
            "region": "oregon",
            "healthCheckPath": "/health",
        },
        "envVars": [{"key": k, "value": v} for k, v in SECRETS.items()],
    }
    result = post("/services", body)
    svc = result.get("service", result)
    print(f"  ✓ Created: {svc['id']}")
    return svc


# ── Step 2: wait until backend is live ───────────────────────────────────────

def wait_for_live(service_id, label="service", timeout=600):
    print(f"  Waiting for {label} to deploy (up to {timeout//60} min) …", end="", flush=True)
    deadline = time.time() + timeout
    while time.time() < deadline:
        svc = get(f"/services/{service_id}")
        svc = svc.get("service", svc)
        status = svc.get("serviceDetails", {}).get("deployStatus") or svc.get("suspended", "")
        state  = svc.get("serviceDetails", {}).get("numInstances")
        url    = svc.get("serviceDetails", {}).get("url", "")
        if url and "onrender.com" in url:
            # fetch deploys list to check if the latest is live
            deploys = get(f"/services/{service_id}/deploys?limit=1")
            if deploys:
                d = deploys[0].get("deploy", deploys[0])
                if d.get("status") in ("live", "update_in_progress"):
                    print(" done!")
                    return svc
                if d.get("status") == "build_failed":
                    print(" BUILD FAILED!")
                    raise RuntimeError(f"Deployment of {label} failed. Check Render dashboard.")
        print(".", end="", flush=True)
        time.sleep(15)
    raise RuntimeError(f"Timed out waiting for {label} to go live.")


# ── Step 3: create frontend static site ──────────────────────────────────────

def create_frontend(owner_id, backend_url):
    print("Creating frontend service applybot-frontend …")
    svc = find_service("applybot-frontend")
    if svc:
        print(f"  ✓ Already exists: {svc['id']}")
        return svc

    # backend_url is like "https://applybot-api.onrender.com"
    body = {
        "type": "static_site",
        "name": "applybot-frontend",
        "ownerId": owner_id,
        "repo": f"https://github.com/{GITHUB_REPO}",
        "branch": GITHUB_BRANCH,
        "serviceDetails": {
            "buildCommand": "npm install && npm run build",
            "publishPath": "dist",
        },
        "envVars": [
            {"key": "VITE_API_URL",  "value": backend_url},
            {"key": "VITE_BASE_URL", "value": "/"},
        ],
        "routes": [
            {"type": "rewrite", "source": "/*", "destination": "/index.html"}
        ],
    }
    result = post("/services", body)
    svc = result.get("service", result)
    print(f"  ✓ Created: {svc['id']}")
    return svc


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=== ApplyBot → Render deployment ===\n")

    # Resolve owner
    owner_id = find_owner()
    print(f"Owner ID: {owner_id}\n")

    # Backend
    backend_svc  = create_backend(owner_id)
    backend_id   = backend_svc["id"]

    # Wait for it to have a URL (may not be fully live yet but URL is assigned)
    print("  Polling for backend URL …", end="", flush=True)
    backend_url = ""
    for _ in range(40):                          # up to ~10 min
        svc = get(f"/services/{backend_id}")
        svc = svc.get("service", svc)
        url = svc.get("serviceDetails", {}).get("url", "")
        if url:
            backend_url = url if url.startswith("http") else f"https://{url}"
            print(f" {backend_url}")
            break
        print(".", end="", flush=True)
        time.sleep(15)

    if not backend_url:
        backend_url = f"https://applybot-api.onrender.com"
        print(f"\n  (URL not yet assigned, using default: {backend_url})")

    # Frontend
    frontend_svc = create_frontend(owner_id, backend_url)
    frontend_id  = frontend_svc["id"]

    # Summary
    print("\n=== Done ===")
    print(f"Backend:  {backend_url}")
    frontend_url = frontend_svc.get("serviceDetails", {}).get("url", "")
    if frontend_url:
        frontend_url = frontend_url if frontend_url.startswith("http") else f"https://{frontend_url}"
    else:
        frontend_url = "https://applybot-frontend.onrender.com"
    print(f"Frontend: {frontend_url}")
    print()
    print("Both services are building on Render. Check progress at:")
    print("  https://dashboard.render.com")
    print()
    print("First deploy takes ~5 minutes. The frontend needs the backend")
    print("to be live before jobs will load.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        sys.exit(1)
