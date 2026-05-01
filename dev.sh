#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  MakeYourMusic — Starting Development Servers${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Generate Prisma client if needed.
# Use a subshell so we don't bleed cwd across the rest of the script.
if [ ! -d "$DIR/frontend/generated/prisma" ] || [ ! -d "$DIR/backend/node_modules/.prisma/client" ]; then
  echo -e "${YELLOW}Generating Prisma client...${NC}"
  ( cd "$DIR" && npx prisma generate --schema=prisma/schema.prisma )
fi

# Install dependencies if node_modules missing — run each in its own subshell.
install_if_missing() {
  local name="$1"
  local dir="$2"
  if [ ! -d "$dir/node_modules" ]; then
    echo -e "${YELLOW}Installing $name dependencies...${NC}"
    ( cd "$dir" && npm install )
  fi
}
install_if_missing "backend"  "$DIR/backend"
install_if_missing "frontend" "$DIR/frontend"
install_if_missing "shared"   "$DIR/shared"

# Parse CLI flags. Reject typos so `--mobil` doesn't silently start without
# the mobile dev server.
INCLUDE_MOBILE=false
for arg in "$@"; do
  case "$arg" in
    --mobile|-m) INCLUDE_MOBILE=true ;;
    --help|-h)
      echo "Usage: ./dev.sh [--mobile|-m]"
      exit 0
      ;;
    *)
      echo -e "${YELLOW}Unknown flag: $arg${NC}"
      echo "Usage: ./dev.sh [--mobile|-m]"
      exit 1
      ;;
  esac
done

echo ""
echo -e "${GREEN}Backend  →  http://localhost:3001${NC}"
echo -e "${GREEN}Frontend →  http://localhost:3000${NC}"

if [ "$INCLUDE_MOBILE" = true ]; then
  install_if_missing "mobile" "$DIR/mobile"
  echo -e "${GREEN}Mobile   →  Expo DevTools (press i for iOS, a for Android)${NC}"
  echo ""

  cd "$DIR"
  npx concurrently \
    --names "BE,FE,MOBILE" \
    --prefix-colors "magenta,cyan,green" \
    --kill-others \
    "cd backend && npm run dev" \
    "cd frontend && npm run dev" \
    "cd mobile && npx expo start"
else
  echo ""
  echo -e "${YELLOW}Tip: Run with --mobile to also start the Expo dev server${NC}"
  echo ""

  cd "$DIR"
  npx concurrently \
    --names "BE,FE" \
    --prefix-colors "magenta,cyan" \
    --kill-others \
    "cd backend && npm run dev" \
    "cd frontend && npm run dev"
fi
