#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Frontend: lint ==="
(cd "$ROOT_DIR/frontend" && npm run lint)

echo "=== Frontend: test ==="
(cd "$ROOT_DIR/frontend" && npm run test -- --watch=false)

echo "=== Backend: test ==="
(cd "$ROOT_DIR/backend" && ./gradlew test)

echo "All checks passed."
