#!/bin/bash
set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔍 Looking for Prisma schema..."
echo "Current directory: $(pwd)"

# Try different possible schema locations
SCHEMA_PATHS=(
  "../prisma/schema.prisma"
  "../../prisma/schema.prisma"
  "prisma/schema.prisma"
)

SCHEMA_FOUND=""

for SCHEMA_PATH in "${SCHEMA_PATHS[@]}"; do
  FULL_PATH="$(realpath "$SCHEMA_PATH" 2>/dev/null || echo "$SCHEMA_PATH")"
  if [ -f "$SCHEMA_PATH" ]; then
    SCHEMA_FOUND="$SCHEMA_PATH"
    echo "✓ Found Prisma schema at: $SCHEMA_PATH"
    break
  fi
done

if [ -z "$SCHEMA_FOUND" ]; then
  echo "❌ Prisma schema not found in any expected location"
  echo "Current directory: $(pwd)"
  echo "Tried:"
  for SCHEMA_PATH in "${SCHEMA_PATHS[@]}"; do
    echo "  - $SCHEMA_PATH ($(ls -la "$SCHEMA_PATH" 2>&1 || echo 'not found'))"
  done
  echo "Directory contents:"
  ls -la ../
  exit 1
fi

echo "🔧 Generating Prisma client from: $SCHEMA_FOUND"
npx prisma generate --schema="$SCHEMA_FOUND"

echo "✅ Prisma client generated successfully"
