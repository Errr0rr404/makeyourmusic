#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  MakeYourMusic — Starting Development Servers${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Generate Prisma client if needed
if [ ! -d "$DIR/frontend/generated/prisma" ] || [ ! -d "$DIR/backend/node_modules/.prisma/client" ]; then
  echo -e "${YELLOW}Generating Prisma client...${NC}"
  cd "$DIR" && npx prisma generate --schema=prisma/schema.prisma
fi

# Install dependencies if node_modules missing
if [ ! -d "$DIR/backend/node_modules" ]; then
  echo -e "${YELLOW}Installing backend dependencies...${NC}"
  cd "$DIR/backend" && npm install
fi

if [ ! -d "$DIR/frontend/node_modules" ]; then
  echo -e "${YELLOW}Installing frontend dependencies...${NC}"
  cd "$DIR/frontend" && npm install
fi

if [ ! -d "$DIR/shared/node_modules" ]; then
  echo -e "${YELLOW}Installing shared package dependencies...${NC}"
  cd "$DIR/shared" && npm install
fi

# Check for --mobile flag
INCLUDE_MOBILE=false
for arg in "$@"; do
  if [ "$arg" = "--mobile" ] || [ "$arg" = "-m" ]; then
    INCLUDE_MOBILE=true
  fi
done

echo ""
echo -e "${GREEN}Backend  →  http://localhost:3001${NC}"
echo -e "${GREEN}Frontend →  http://localhost:3000${NC}"

if [ "$INCLUDE_MOBILE" = true ]; then
  if [ ! -d "$DIR/mobile/node_modules" ]; then
    echo -e "${YELLOW}Installing mobile dependencies...${NC}"
    cd "$DIR/mobile" && npm install
  fi
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
