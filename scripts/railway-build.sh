#!/usr/bin/env bash
set -euo pipefail

# Railway build entrypoint. Dispatched by railway.json on every deploy.
# Branches on $RAILWAY_SERVICE_NAME so the same repo can run distinct
# build commands for the web and api services.

case "${RAILWAY_SERVICE_NAME:-}" in
  morlo-web|makeyourmusic-web)
    npm ci --prefix shared
    npm ci --prefix frontend
    npx prisma generate --schema=./prisma/schema.prisma
    npm run build --prefix frontend
    ;;
  *)
    cd backend
    npm ci
    npx prisma generate --schema=../prisma/schema.prisma
    npm run build
    ;;
esac
