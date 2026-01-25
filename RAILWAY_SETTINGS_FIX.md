# Railway Settings Fix

## Current Issues ❌

1. **Root Directory**: Set to `/backend` - This is WRONG!
2. **Build Command**: Doesn't match our build script

## Required Changes ✅

### 1. Root Directory
**Change from:** `/backend`  
**Change to:** (empty/blank - project root)

**Why:** The Prisma schema is in `/prisma/schema.prisma` at the project root, not in the backend folder. Railway needs to see the entire project structure.

### 2. Build Command
**Change from:** `cd backend && npm run build`  
**Change to:** `npm install && chmod +x build-railway.sh && ./build-railway.sh`

**OR** remove the custom build command entirely and let `railway.json` handle it automatically.

### 3. Start Command (Keep as is)
**Current:** `cd backend && npm run start`  
**Keep this** - it's correct!

### 4. Watch Paths (Optional)
**Current:** `/backend/`  
**You can keep this** or add:
- `/backend/src/**`
- `/prisma/**`

## Step-by-Step Fix

1. Go to your Railway service settings
2. Scroll to **"Root Directory"** section
3. **Clear/Delete** the `/backend` value (leave it empty)
4. Scroll to **"Build"** section
5. Under **"Custom Build Command"**, either:
   - **Option A (Recommended):** Delete/clear the custom build command to let `railway.json` auto-detect
   - **Option B:** Set it to: `npm install && chmod +x build-railway.sh && ./build-railway.sh`
6. Click **"Update"** or **"Save"**
7. Railway will automatically trigger a new deployment

## Why This Works

- **Root Directory = Empty**: Railway sees the full project (root, backend, frontend, prisma folders)
- **Build Script**: Our `build-railway.sh` script:
  1. Installs root dependencies (includes Prisma CLI)
  2. Installs backend dependencies (triggers Prisma client generation)
  3. Builds the backend TypeScript code
- **Prisma Schema**: Can now be found at `prisma/schema.prisma` from project root

## After Making Changes

Railway will automatically:
1. Detect the changes
2. Trigger a new build
3. Use the correct paths
4. Successfully generate Prisma client
5. Build and deploy your backend

---

**Note:** If you prefer to keep Root Directory as `/backend`, you would need to:
- Copy `prisma/` folder into `backend/`
- Update all Prisma schema paths
- This is NOT recommended - use project root instead!
