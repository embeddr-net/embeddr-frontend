#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pnpm --dir "${ROOT_DIR}/embeddr-react-ui" run build
VITE_BACKEND_URL="http://localhost:8003/api/v2" pnpm dev
