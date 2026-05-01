#!/usr/bin/env bash
set -euo pipefail

# MakeYourMusic — Main Startup Script
# AI-Generated Music Platform
# Usage: ./start.sh [options]
# Options:
#   --install     Install dependencies first
#   --clean       Clean cache and logs before starting
#   --seed        Seed database with demo data
#   --help        Show this help message

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
DO_INSTALL=false
DO_CLEAN=false
DO_SEED=false

for arg in "$@"; do
    case $arg in
        --install)
            DO_INSTALL=true
            ;;
        --clean)
            DO_CLEAN=true
            ;;
        --seed)
            DO_SEED=true
            ;;
        --help|-h)
            echo "MakeYourMusic — AI-Generated Music Platform"
            echo ""
            echo "Usage: ./start.sh [options]"
            echo ""
            echo "Options:"
            echo "  --install     Install/update dependencies before starting"
            echo "  --clean       Clean cache and logs before starting"
            echo "  --seed        Seed database with demo data (genres, agents, tracks)"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                    # Normal startup"
            echo "  ./start.sh --install          # Install deps and start"
            echo "  ./start.sh --clean            # Clean cache and start"
            echo "  ./start.sh --install --seed   # Full setup with demo data"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   🎵 Starting MakeYourMusic${NC}"
echo -e "${BLUE}   AI-Generated Music Platform${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# Install dependencies if requested
if [ "$DO_INSTALL" = true ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"

    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 22+ first.${NC}"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 22 ]; then
        echo -e "${RED}❌ Node.js 22+ is required. Current version: $(node -v)${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

    npm install
    cd backend && npm install && cd ..
    cd frontend && npm install && cd ..

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Dependency installation failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dependencies installed${NC}\n"
fi

# Clean cache if requested
if [ "$DO_CLEAN" = true ]; then
    echo -e "${YELLOW}🧹 Cleaning cache and logs...${NC}"
    [ -d "frontend/.next" ] && rm -rf frontend/.next && echo -e "${GREEN}✓ Removed frontend/.next${NC}"
    [ -d "backend/dist" ] && rm -rf backend/dist && echo -e "${GREEN}✓ Removed backend/dist${NC}"
    rm -f *.log frontend/*.log backend/*.log 2>/dev/null && echo -e "${GREEN}✓ Cleaned log files${NC}"
    find . -name ".DS_Store" -delete 2>/dev/null
    echo -e "${GREEN}✅ Cleanup complete${NC}\n"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}\n"

# Check dependencies
echo -e "${YELLOW}📋 Step 1: Checking dependencies...${NC}"
for dir in backend frontend; do
    if [ ! -d "$dir/node_modules" ]; then
        echo -e "${YELLOW}⚠ $dir node_modules not found. Installing...${NC}"
        cd "$dir" && npm install && cd ..
    else
        echo -e "${GREEN}✓ $dir dependencies found${NC}"
    fi
done

# Check environment
echo ""
echo -e "${YELLOW}📋 Step 2: Checking environment...${NC}"
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}✗ backend/.env not found! See README.md for required variables.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ backend/.env found${NC}"

# Load DATABASE_URL.
# Strip ONLY a single pair of leading/trailing quotes from the value (a password
# containing single-quotes/double-quotes used to be mangled by `tr -d "'"`).
extract_env_value() {
    local file="$1"
    local key="$2"
    local line
    line=$(grep -E "^${key}=" "$file" | head -n 1)
    [ -z "$line" ] && return 1
    local value="${line#${key}=}"
    if [[ "$value" =~ ^\".*\"$ ]] || [[ "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
    fi
    printf '%s' "$value"
}

if [ -z "${DATABASE_URL:-}" ] && [ -f "backend/.env" ]; then
    export DATABASE_URL=$(extract_env_value "backend/.env" "DATABASE_URL")
fi
if [ -z "${DATABASE_URL:-}" ] && [ -f ".env" ]; then
    export DATABASE_URL=$(extract_env_value ".env" "DATABASE_URL")
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}✗ DATABASE_URL not found in backend/.env${NC}"
    exit 1
fi
echo -e "${GREEN}✓ DATABASE_URL is set${NC}"

# Setup database
echo ""
echo -e "${YELLOW}📋 Step 3: Setting up database...${NC}"

# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma 2>&1 | tail -3
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
# Temporarily disable -e so we can branch on exit code without aborting.
set +e
MIGRATE_OUTPUT=$(npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1)
MIGRATE_EXIT=$?
set -e

if [ $MIGRATE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations applied${NC}"
else
    echo -e "${YELLOW}⚠ prisma migrate deploy failed; falling back to db push...${NC}"
    # Run db push WITHOUT a pipeline so $? captures prisma's exit code, not
    # tail's. The previous version pipelined to `tail -5`, which always
    # exits 0 — making a failed schema sync silently report success.
    set +e
    PUSH_OUTPUT=$(npx prisma db push --schema=prisma/schema.prisma 2>&1)
    PUSH_EXIT=$?
    set -e
    echo "$PUSH_OUTPUT" | tail -5
    if [ $PUSH_EXIT -ne 0 ]; then
        echo -e "${RED}✗ Database setup failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Schema synced via db push${NC}"
fi

# Seed database if requested
if [ "$DO_SEED" = true ]; then
    echo ""
    echo -e "${YELLOW}🌱 Seeding database with demo data...${NC}"
    cd backend && npm run seed && cd ..
    echo -e "${GREEN}✓ Database seeded${NC}"
fi

# Start dev servers
echo ""
echo -e "${YELLOW}📋 Step 4: Starting development servers...${NC}"
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   🎵 MakeYourMusic is starting!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 Access:${NC}"
echo -e "   Backend:  ${GREEN}http://localhost:3001${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "   Health:   ${GREEN}http://localhost:3001/api/health${NC}"
echo ""
echo -e "${BLUE}🔑 Demo Login:${NC}"
echo -e "   Email:    ${YELLOW}demo@gmail.com${NC}"
echo -e "   Password: ${YELLOW}Demo123${NC}"
echo ""
echo -e "${BLUE}📊 Tools:${NC}"
echo -e "   Prisma Studio: ${YELLOW}npm run prisma:studio${NC}"
echo -e "   Mobile dev:    ${YELLOW}npm run dev:mobile${NC}"
echo -e "   Stop server:   ${YELLOW}Ctrl+C${NC}"
echo ""

npm run dev
