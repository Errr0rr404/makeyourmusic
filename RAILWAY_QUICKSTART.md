# 🚂 Railway Quick Start Guide

## TL;DR - Get Running in 5 Minutes

### 1. Deploy to Railway
1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway will auto-detect and start building

### 2. Add PostgreSQL Database
1. In your project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway creates the database and auto-injects `DATABASE_URL`

### 3. Set Required Environment Variables
Go to your service → **Variables** tab and add:

```bash
# Generate JWT secrets locally first:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Required Variables:**
```
JWT_SECRET=<paste-generated-secret>
JWT_REFRESH_SECRET=<paste-generated-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.com
```

**Note:** `DATABASE_URL` and `PORT` are auto-set by Railway - don't add them manually!

### 4. Run Database Migrations
After first deployment, open Railway CLI or use the dashboard shell:

```bash
# Install Railway CLI (one time)
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run migrations
railway run "cd backend && npx prisma migrate deploy --schema=../prisma/schema.prisma"
```

### 5. Seed Database (Optional)
```bash
railway run "cd backend && npm run prisma:seed"
```

### 6. Create Admin User
```bash
railway run "cd backend && npm run create-admin"
```

### 7. Test It!
Visit: `https://your-service.up.railway.app/api/health`

Should return: `{"status":"ok","timestamp":"..."}`

---

## Common Issues

**Build fails?**
- Check logs in Railway dashboard
- Verify Node.js version (needs 20+)

**Database connection error?**
- `DATABASE_URL` is auto-injected - don't set it manually
- Check PostgreSQL service is running

**Service won't start?**
- Railway sets `PORT` automatically - your code already uses `process.env.PORT` ✅
- Check logs for specific errors

**CORS errors?**
- Update `FRONTEND_URL` with your actual frontend domain

---

## Full Guide
See `RAILWAY_DEPLOYMENT.md` for detailed instructions.
