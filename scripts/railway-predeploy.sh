#!/usr/bin/env bash
set -euo pipefail

# Railway pre-deploy entrypoint. Web service has nothing to do; api service
# runs prisma db push (no --accept-data-loss — destructive changes need an
# explicit migration).

case "${RAILWAY_SERVICE_NAME:-}" in
  morlo-web|makeyourmusic-web)
    echo "Skipping database sync for web service"
    ;;
  *)
    cd backend
    npx prisma db push --schema=../prisma/schema.prisma --skip-generate
    ;;
esac
