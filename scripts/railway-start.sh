#!/usr/bin/env bash
set -euo pipefail

# Railway start entrypoint. Web service runs the Next.js server; api service
# runs the compiled backend.

case "${RAILWAY_SERVICE_NAME:-}" in
  morlo-web|makeyourmusic-web)
    cd frontend
    exec npm start -- -p "${PORT:-3000}"
    ;;
  *)
    cd backend
    exec npm start
    ;;
esac
