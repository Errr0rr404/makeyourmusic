#!/bin/bash

# Project Cleanup Utility
# Removes temporary files, logs, and compiled output
# Safe to run anytime - preserves source code and essential files

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Project Cleanup Utility${NC}"
echo -e "${BLUE}========================${NC}\n"

# Track what we're cleaning
CLEANED_ITEMS=0

# 1. Clean compiled TypeScript files
if [ -d "backend/dist" ]; then
    echo -e "${YELLOW}📦 Removing compiled TypeScript files...${NC}"
    rm -rf backend/dist
    ((CLEANED_ITEMS++))
    echo -e "${GREEN}✅ Removed backend/dist/${NC}"
fi

# 2. Clean compiled script files
if ls backend/scripts/*.js 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}📦 Removing compiled script files...${NC}"
    rm -f backend/scripts/*.js backend/scripts/*.d.ts backend/scripts/*.js.map 2>/dev/null
    ((CLEANED_ITEMS++))
    echo -e "${GREEN}✅ Removed compiled scripts${NC}"
fi

# 3. Clean log files (but keep directories)
if ls backend/logs/*.log 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}📄 Cleaning log files...${NC}"
    rm -f backend/logs/*.log 2>/dev/null
    touch backend/logs/.gitkeep
    ((CLEANED_ITEMS++))
    echo -e "${GREEN}✅ Cleaned backend logs${NC}"
fi

# 4. Clean Next.js cache
if [ -d "frontend/.next" ]; then
    echo -e "${YELLOW}🗂️  Removing Next.js cache...${NC}"
    rm -rf frontend/.next
    ((CLEANED_ITEMS++))
    echo -e "${GREEN}✅ Removed frontend/.next${NC}"
fi

# 5. Clean TypeScript build info
if ls frontend/*.tsbuildinfo 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}🗂️  Removing TypeScript build info...${NC}"
    rm -f frontend/*.tsbuildinfo
    ((CLEANED_ITEMS++))
    echo -e "${GREEN}✅ Removed tsbuildinfo files${NC}"
fi

# 6. Clean temporary files
TEMP_FILES=(
    ".DS_Store"
    "*.log"
    "*.tmp"
    "*.backup"
    "frontend.log"
    "backend.log"
)

for pattern in "${TEMP_FILES[@]}"; do
    if ls $pattern 2>/dev/null | grep -q .; then
        echo -e "${YELLOW}🗑️  Removing temporary files: $pattern${NC}"
        rm -f $pattern
        ((CLEANED_ITEMS++))
    fi
done

# 7. Clean old database backups from root (keep in backups/ directory)
if ls backup_*.sql* 2>/dev/null | grep -q .; then
    echo -e "${YELLOW}💾 Moving database backups to backups/ directory...${NC}"
    mkdir -p backups
    mv backup_*.sql* backups/ 2>/dev/null || true
    ((CLEANED_ITEMS++))
    echo -e "${GREEN}✅ Moved backups to backups/ directory${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================${NC}"
if [ $CLEANED_ITEMS -eq 0 ]; then
    echo -e "${GREEN}✨ Project is already clean!${NC}"
else
    echo -e "${GREEN}✅ Cleaned $CLEANED_ITEMS item(s)${NC}"
fi
echo -e "${BLUE}========================${NC}"
echo ""

# Optional: Show disk space saved
echo -e "${BLUE}💡 Tip: Run 'npm run build' to rebuild if needed${NC}"
echo ""

exit 0
