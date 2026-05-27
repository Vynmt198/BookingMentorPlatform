#!/usr/bin/env bash
set -euo pipefail
PY="python3"
command -v "$PY" >/dev/null 2>&1 || PY="python"
exec "$PY" -m uvicorn main:app --host 0.0.0.0 --port "${PORT:?PORT is not set}"
