#!/bin/bash

# Kairux - Main Startup Script
# Business in Flow - Modern AI-Powered Cloud ERP System
# Usage: ./start.sh [options]
# Options:
#   --install     Install dependencies first
#   --clean       Clean cache and logs before starting
#   --seed        Seed database with sample data
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
            echo "Kairux - Business in Flow"
            echo "Modern AI-Powered Cloud ERP System"
            echo ""
            echo "Usage: ./start.sh [options]"
            echo ""
            echo "Options:"
            echo "  --install     Install/update dependencies before starting"
            echo "  --clean       Clean cache and logs before starting"
            echo "  --seed        Seed database with comprehensive ERP data"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./start.sh                    # Normal startup"
            echo "  ./start.sh --install          # Install deps and start"
            echo "  ./start.sh --clean            # Clean cache and start"
            echo "  ./start.sh --install --clean  # Full clean install and start"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 Starting Kairux Application${NC}"
echo -e "${BLUE}   Business in Flow${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# Install dependencies if requested
if [ "$DO_INSTALL" = true ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 20+ first.${NC}"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo -e "${RED}❌ Node.js 20+ is required. Current version: $(node -v)${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

    # Install frontend dependencies
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend installation failed${NC}"
        exit 1
    fi
    cd ..
    echo -e "${GREEN}✅ Dependencies installed${NC}\n"
fi

# Clean cache if requested
if [ "$DO_CLEAN" = true ]; then
    echo -e "${YELLOW}🧹 Cleaning cache and logs...${NC}"

    # Clean Next.js cache
    [ -d "frontend/.next" ] && rm -rf frontend/.next && echo -e "${GREEN}✓ Removed frontend/.next${NC}"

    # Clean log files
    rm -f *.log frontend/*.log backend/*.log 2>/dev/null && echo -e "${GREEN}✓ Cleaned log files${NC}"

    # Clean temp files
    find . -name ".DS_Store" -delete 2>/dev/null
    find . -name "*.tmp" -delete 2>/dev/null

    echo -e "${GREEN}✅ Cleanup complete${NC}\n"
fi

# Function to kill process on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}⚠ Killing processes on port $port...${NC}"
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        # Double check
        local remaining=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$remaining" ]; then
            echo "$remaining" | xargs kill -9 2>/dev/null
            sleep 1
        fi
        echo -e "${GREEN}✓ Port $port cleared${NC}"
    else
        echo -e "${GREEN}✓ Port $port is already free${NC}"
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local port=$1
    local name=$2
    local log_file=$3
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}Waiting for $name to be ready...${NC}"
    while [ $attempt -lt $max_attempts ]; do
        if lsof -ti:$port > /dev/null 2>&1; then
            # Check if server is responding
            if curl -s http://localhost:$port/api/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ $name is ready on port $port${NC}"
                return 0
            fi
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo -e "${RED}✗ $name failed to start on port $port${NC}"
    if [ -f "$log_file" ]; then
        echo -e "${YELLOW}Last 30 lines of $log_file:${NC}"
        tail -30 "$log_file" | sed 's/^/  /'
    fi
    return 1
}

# Clear port first
echo -e "${YELLOW}📋 Step 1: Clearing port...${NC}"
kill_port 3000  # Frontend port
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}\n"

# Check if node_modules exist and install if needed
echo -e "${YELLOW}📋 Step 2: Checking dependencies...${NC}"

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠ Frontend node_modules not found. Installing dependencies...${NC}"
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Frontend dependency installation failed${NC}"
        exit 1
    fi
    cd ..
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies found${NC}"
fi

# Check for .env file (must be before database setup)
echo ""
echo -e "${YELLOW}📋 Step 3: Checking environment configuration...${NC}"
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${RED}✗ frontend/.env.local file not found!${NC}"
    echo -e "${YELLOW}Creating .env.local from env.example...${NC}"
    if [ -f "frontend/env.example" ]; then
        cp frontend/env.example frontend/.env.local
        echo -e "${YELLOW}⚠ Please edit frontend/.env.local and set your DATABASE_URL and other required variables${NC}"
        echo -e "${YELLOW}⚠ At minimum, you need:${NC}"
        echo -e "${YELLOW}   - DATABASE_URL${NC}"
        echo -e "${YELLOW}   - JWT_SECRET (at least 32 characters)${NC}"
        echo -e "${YELLOW}   - JWT_REFRESH_SECRET (at least 32 characters)${NC}"
        echo ""
        read -p "Press Enter to continue after setting up .env.local file, or Ctrl+C to exit..."
    else
        echo -e "${RED}✗ frontend/env.example not found either!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ frontend/.env.local file found${NC}"
    # Check for critical env vars
    if ! grep -q "DATABASE_URL=" frontend/.env.local || grep -q "DATABASE_URL=$" frontend/.env.local; then
        echo -e "${RED}✗ DATABASE_URL is not set in frontend/.env.local${NC}"
        echo -e "${YELLOW}Please set DATABASE_URL in frontend/.env.local before starting${NC}"
        exit 1
    fi
    if ! grep -q "JWT_SECRET=" frontend/.env.local || grep -q "JWT_SECRET=$" frontend/.env.local || grep -q "JWT_SECRET=your-" frontend/.env.local; then
        echo -e "${YELLOW}⚠ JWT_SECRET not set or using default value${NC}"
        echo -e "${YELLOW}Generating secure JWT secrets...${NC}"
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        # Update .env.local file
        if grep -q "^JWT_SECRET=" frontend/.env.local; then
            sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" frontend/.env.local
        else
            echo "JWT_SECRET=$JWT_SECRET" >> frontend/.env.local
        fi
        if grep -q "^JWT_REFRESH_SECRET=" frontend/.env.local; then
            sed -i.bak "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" frontend/.env.local
        else
            echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> frontend/.env.local
        fi
        rm -f frontend/.env.local.bak
        echo -e "${GREEN}✓ JWT secrets generated${NC}"
    fi
fi

# Load DATABASE_URL for database operations
if [ -z "$DATABASE_URL" ] && [ -f "frontend/.env.local" ]; then
    export DATABASE_URL=$(grep "^DATABASE_URL=" frontend/.env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

# Also try loading from root .env if still not set
if [ -z "$DATABASE_URL" ] && [ -f ".env" ]; then
    export DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

# Setup database (migrations and Prisma client)
echo ""
echo -e "${YELLOW}📋 Step 4: Setting up database...${NC}"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL not found. Please set it in frontend/.env.local or .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL is set (${DATABASE_URL:0:30}...)${NC}"

# Try running migrations directly; if Prisma CLI insists on datasource.url in config, fall back to db push
echo -e "${YELLOW}Attempting to run migrations (prisma migrate deploy)...${NC}"
MIGRATE_OUTPUT=$(npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1)
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ Database migrations applied via prisma migrate deploy${NC}"
else
    # Prisma 7 doesn't support migrations with external URL in the same way
    # Fall back to db push which uses --url parameter
    echo -e "${YELLOW}⚠ prisma migrate deploy failed; falling back to prisma db push to sync schema${NC}"
    npx prisma db push --schema=prisma/schema.prisma --url="$DATABASE_URL" --accept-data-loss 2>&1 | sed -n '1,200p'
    DB_PUSH_EXIT=$?
    if [ $DB_PUSH_EXIT -ne 0 ]; then
        echo -e "${RED}✗ 'prisma db push' failed; cannot continue with database setup${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ prisma db push succeeded (schema synced). Continuing...${NC}"
    fi
fi

# Generate Prisma client
if [ ! -d "frontend/generated/prisma" ] || [ ! -d "frontend/node_modules/.prisma/client" ]; then
    echo -e "${YELLOW}⚠ Prisma client not generated. Generating...${NC}"
    npx prisma generate --schema=prisma/schema.prisma 2>&1 | grep -v "Loaded Prisma" | grep -v "Prisma schema loaded" | grep -v "^$" | tail -5
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        echo -e "${RED}✗ Prisma client generation failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${GREEN}✓ Prisma client found${NC}"
fi


# Setup admin user
echo ""
echo -e "${YELLOW}📋 Step 5: Setting up admin user...${NC}"

cd backend

# Create admin user
echo -e "${BLUE}Creating admin user (if not exists)...${NC}"
CREATE_ADMIN_OUTPUT=$(npm run create-admin 2>&1)
if echo "$CREATE_ADMIN_OUTPUT" | grep -q "created successfully\|upsert"; then
    echo -e "${GREEN}✓ Admin user created/verified${NC}"
else
    # Show the output for debugging
    echo "$CREATE_ADMIN_OUTPUT" | grep -E "(✅|Admin user|created successfully|Login Credentials|Error)" | head -5
    echo -e "${YELLOW}⚠ Admin user creation completed${NC}"
fi

cd ..

# Seed database if requested
if [ "$DO_SEED" = true ]; then
    echo ""
    echo -e "${YELLOW}🌱 Seeding database with comprehensive ERP data...${NC}"
    cd backend
    if [ -f "prisma/seed-comprehensive-erp.ts" ]; then
        npx ts-node prisma/seed-comprehensive-erp.ts
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Database seeded successfully${NC}"
        else
            echo -e "${YELLOW}⚠ Database seeding completed with warnings${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Seed file not found, skipping...${NC}"
    fi
    cd ..
fi

# Ask if user wants dummy data (only on first run and if not seeding)
if [ "$DO_SEED" = false ] && [ ! -f ".dummy-data-created" ]; then
    echo ""
    read -p "$(echo -e ${YELLOW}Do you want to create dummy products for testing? [y/N]: ${NC})" -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Creating dummy products...${NC}"
        cd backend
        npm run create-dummy-data 2>&1 | grep -E "(✅|Creating|created|Summary)" | head -10
        cd ..
        touch .dummy-data-created
        echo -e "${GREEN}✓ Dummy data created${NC}"
    else
        echo -e "${BLUE}ℹ Skipping dummy data creation${NC}"
    fi
else
    if [ "$DO_SEED" = false ]; then
        echo -e "${BLUE}ℹ Dummy data already created (reset with: rm .dummy-data-created)${NC}"
    fi
fi

# Clean up old log files
rm -f frontend.log

# Start frontend (which now includes API routes)
echo ""
echo -e "${YELLOW}📋 Step 6: Starting Next.js application...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Give it a moment to start
sleep 2

# Wait for frontend to be ready
if wait_for_server 3000 "Application" "frontend.log"; then
    echo ""
else
    echo -e "${RED}Application failed to start. Check frontend.log for details.${NC}"
    kill $FRONTEND_PID 2>/dev/null
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping server...${NC}"
    kill $FRONTEND_PID 2>/dev/null
    sleep 1
    kill_port 3000
    echo -e "${GREEN}✓ Server stopped${NC}"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM EXIT

# Success message
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}   🎉 Application is running!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 Access your application:${NC}"
echo -e "   Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "   Health Check: ${GREEN}http://localhost:3000/api/health${NC}"
echo ""
echo -e "${BLUE}🔑 Admin Login Credentials:${NC}"
echo -e "   Email: ${YELLOW}admin@gmail.com${NC}"
echo -e "   Password: ${YELLOW}Admin123!!${NC}"
echo -e "   Role: ${GREEN}ADMIN${NC} (Full system access)"
echo ""
echo -e "${BLUE}👥 User Roles:${NC}"
echo -e "   • ${GREEN}ADMIN${NC} - Full administrative access to all modules"
echo -e "   • ${GREEN}USER${NC} - Standard user access (create via /register)"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "   See ${GREEN}README.md${NC} for complete setup and usage guide"
echo ""
echo -e "${BLUE}📊 Monitor Application:${NC}"
echo -e "   View logs: ${YELLOW}tail -f frontend.log${NC}"
echo -e "   Stop server: ${YELLOW}Ctrl+C${NC}"
echo ""
echo -e "${BLUE}ℹ️  Architecture:${NC}"
echo -e "   • Next.js 16 with App Router"
echo -e "   • API routes integrated in frontend (no separate backend server)"
echo -e "   • PostgreSQL database with Prisma ORM"
echo ""
echo -e "${BLUE}🎯 Getting Started:${NC}"
echo -e "   1. Login as admin using credentials above"
echo -e "   2. Navigate to ${GREEN}/erp${NC} to access the dashboard"
echo -e "   3. Explore modules: Accounting, CRM, Inventory, Payroll, etc."
echo ""
echo -e "${BLUE}🛠️  Utility Commands:${NC}"
echo -e "   Restart: ${YELLOW}./start.sh${NC}"
echo -e "   Install deps: ${YELLOW}./start.sh --install${NC}"
echo -e "   Clean cache: ${YELLOW}./start.sh --clean${NC}"
echo -e "   Seed database: ${YELLOW}./start.sh --seed${NC}"
echo -e "   Clean project: ${YELLOW}./scripts/cleanup.sh${NC}"
echo -e "   Backup database: ${YELLOW}./scripts/backup-database.sh${NC}"
echo ""

# Wait for process (this keeps the script running)
wait $FRONTEND_PID 2>/dev/null
