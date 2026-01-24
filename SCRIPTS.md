# Shell Scripts Guide

This project includes several utility scripts to help you manage the application.

## Main Scripts

### `./start.sh` - Main Application Startup Script
**Primary way to run the application**

```bash
# Normal startup
./start.sh

# Install dependencies and start
./start.sh --install

# Clean cache and start  
./start.sh --clean

# Seed database with comprehensive ERP data
./start.sh --seed

# Combine options
./start.sh --install --clean --seed
```

**What it does:**
- Clears ports and processes
- Checks Node.js version
- Verifies/installs dependencies
- Checks environment configuration
- Sets up database (migrations + Prisma client)
- Creates admin user
- Optionally seeds data
- Starts Next.js application
- Displays access information

### `./install-deps.sh` - Dependency Installation
**Install or update project dependencies**

```bash
./install-deps.sh
```

**What it does:**
- Checks Node.js version (requires 20+)
- Installs frontend dependencies
- Provides next steps

**Note:** You can also use `./start.sh --install` instead.

## Utility Scripts

### `./scripts/cleanup.sh` - Project Cleanup
**Remove temporary files and caches**

```bash
./scripts/cleanup.sh
```

**What it removes:**
- Compiled TypeScript files (`backend/dist`)
- Compiled script files (`.js`, `.d.ts`, `.js.map`)
- Log files (keeps directories)
- Next.js cache (`.next`)
- TypeScript build info
- Temporary files (`.DS_Store`, `*.tmp`, `*.backup`)
- Old database backups (moves to `backups/` directory)

**Safe to run anytime** - preserves source code and essential files.

### `./scripts/backup-database.sh` - Database Backup
**Create timestamped PostgreSQL database backups**

```bash
./scripts/backup-database.sh
```

**What it does:**
- Loads DATABASE_URL from environment
- Creates `backups/` directory if needed
- Creates timestamped SQL backup file
- Example: `backups/backup_neondb_20260124_143022.sql`

**Requirements:**
- PostgreSQL client tools (`pg_dump`)
- DATABASE_URL environment variable set

### `./backend/seed-erp-comprehensive.sh` - Comprehensive ERP Data Seeder
**Populate database with realistic ERP test data**

```bash
cd backend
./seed-erp-comprehensive.sh
```

**What it seeds:**
- 3 Office Locations
- 3 Suppliers/Vendors
- 45+ Chart of Accounts
- 5 CRM Leads
- 5 Sales Opportunities  
- 3 Marketing Campaigns
- 5 Projects with 15+ Tasks
- 3 Purchase Orders
- 3 Invoices
- 4 Journal Entries
- 3 Workflows

**Interactive:** Asks for confirmation before seeding.

## Quick Reference

| Task | Command |
|------|---------|
| Start application | `./start.sh` |
| First time setup | `./start.sh --install` |
| Fresh start (clean cache) | `./start.sh --clean` |
| Start with sample data | `./start.sh --seed` |
| Install dependencies | `./install-deps.sh` or `./start.sh --install` |
| Clean project | `./scripts/cleanup.sh` |
| Backup database | `./scripts/backup-database.sh` |
| Seed comprehensive data | `cd backend && ./seed-erp-comprehensive.sh` |

## Removed Scripts

The following redundant scripts were consolidated into `start.sh`:

- ~~`restart-frontend.sh`~~ - Use `./start.sh` instead
- ~~`generate-prisma.sh`~~ - Automatically handled in `start.sh`
- ~~`scripts/setup-complete.sh`~~ - Replaced by `start.sh`
- ~~`backend/setup-env.sh`~~ - Use env.example files instead

## Environment Setup

Before running `start.sh`:

1. **Create environment file:**
   ```bash
   cp frontend/env.example frontend/.env.local
   ```

2. **Set required variables in `frontend/.env.local`:**
   ```bash
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   ```

3. **Generate secure JWT secrets:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Troubleshooting

### Port already in use
`start.sh` automatically clears port 3000. If issues persist:
```bash
lsof -ti:3000 | xargs kill -9
```

### Prisma client issues
```bash
./start.sh --clean
rm -rf frontend/node_modules/.prisma
npm run dev  # Or ./start.sh
```

### Fresh install
```bash
rm -rf frontend/node_modules
./start.sh --install --clean
```

## Architecture Note

This is a **monorepo** structure with:
- **Frontend:** Next.js 14 with App Router (includes API routes)
- **Backend:** Only used for scripts (migrations, seeds, admin creation)
- **Database:** PostgreSQL with Prisma ORM

The application runs entirely from the frontend on port 3000, with API routes integrated.
