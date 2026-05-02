#!/usr/bin/env bash
set -euo pipefail

# Railway pre-deploy entrypoint. Web service has nothing to do; api service
# runs `prisma db push --accept-data-loss`. The flag is required because the
# schema adds several @unique constraints on existing columns (Stripe transfer
# IDs, ISRC/UPC, provider job IDs, magic-link tokens). Prisma classifies any
# new unique constraint as "potential data loss"; in our case the underlying
# values are already unique by source-of-truth, so the push is safe. If a
# real duplicate ever exists, Postgres will reject the constraint at apply
# time and the deploy will fail loudly — at which point the right fix is a
# targeted cleanup migration, not removing this flag.

case "${RAILWAY_SERVICE_NAME:-}" in
  morlo-web|makeyourmusic-web)
    echo "Skipping database sync for web service"
    ;;
  *)
    cd backend
    npx prisma db push --schema=../prisma/schema.prisma --skip-generate --accept-data-loss
    ;;
esac
