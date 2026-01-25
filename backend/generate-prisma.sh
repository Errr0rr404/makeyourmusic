#!/bin/bash
set -e

echo "🔍 Looking for Prisma schema..."

# Try different possible schema locations
SCHEMA_PATHS=(
  "../prisma/schema.prisma"
  "../../prisma/schema.prisma"
  "prisma/schema.prisma"
)

SCHEMA_FOUND=""

for SCHEMA_PATH in "${SCHEMA_PATHS[@]}"; do
  if [ -f "$SCHEMA_PATH" ]; then
    SCHEMA_FOUND="$SCHEMA_PATH"
    echo "✓ Found Prisma schema at: $SCHEMA_PATH"
    break
  fi
done

if [ -z "$SCHEMA_FOUND" ]; then
  echo "❌ Prisma schema not found in any expected location"
  echo "Tried:"
  for SCHEMA_PATH in "${SCHEMA_PATHS[@]}"; do
    echo "  - $SCHEMA_PATH"
  done
  exit 1
fi

echo "🔧 Generating Prisma client from: $SCHEMA_FOUND"
npx prisma generate --schema="$SCHEMA_FOUND"

echo "✅ Prisma client generated successfully"
