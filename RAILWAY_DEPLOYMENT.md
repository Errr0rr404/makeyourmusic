# Railway Deployment Guide for Kairux

This guide will walk you through deploying Kairux backend to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub repository with your code
- PostgreSQL database (Railway provides this)

## Step-by-Step Deployment

### 1. Create a New Project on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will auto-detect it's a Node.js project

### 2. Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create a PostgreSQL instance
4. **Important**: Copy the `DATABASE_URL` from the database service variables (you'll need it in step 4)

### 3. Configure Build Settings

Railway should auto-detect, but verify these settings:

**Build Command:**
```bash
cd backend && npm install && npm run build
```

**Start Command:**
```bash
cd backend && npm run start
```

**Root Directory:** (leave empty or set to project root)

### 4. Set Environment Variables

Go to your service → **Variables** tab and add these **REQUIRED** variables:

#### Database
```
DATABASE_URL=<from PostgreSQL service - Railway auto-provides this>
```

#### JWT Secrets (Generate secure ones!)
```bash
# Generate these locally with:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```
JWT_SECRET=<your-32-char-secret-here>
JWT_REFRESH_SECRET=<your-32-char-secret-here>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### Server Configuration
```
NODE_ENV=production
PORT=3001
```

#### Frontend URL (Update with your frontend URL)
```
FRONTEND_URL=https://your-frontend-domain.vercel.app
# Or if using Railway for frontend too:
# FRONTEND_URL=https://your-frontend-service.up.railway.app
```

#### Optional but Recommended
```
# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 5. Link Database to Backend Service

1. In your backend service settings
2. Go to **"Variables"** tab
3. Railway should auto-inject `DATABASE_URL` from the PostgreSQL service
4. If not, manually add it from the database service's connection string

### 6. Run Database Migrations

After first deployment, you need to run migrations:

**Option A: Using Railway CLI**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run --service backend "cd backend && npx prisma migrate deploy --schema=prisma/schema.prisma"
```

**Option B: Using Railway Dashboard**
1. Go to your backend service
2. Click **"Deployments"** → **"View Logs"**
3. Open a shell/terminal in Railway
4. Run:
```bash
cd backend
npx prisma migrate deploy --schema=prisma/schema.prisma
```

**Option C: Add to Build Script (Recommended)**
Update `backend/package.json` to include migrations in postinstall:
```json
"postinstall": "prisma generate --schema=../prisma/schema.prisma && prisma migrate deploy --schema=../prisma/schema.prisma"
```

### 7. Seed Database (Optional)

After migrations, seed the database:
```bash
railway run --service backend "cd backend && npm run prisma:seed"
```

Or create admin user:
```bash
railway run --service backend "cd backend && npm run create-admin"
```

### 8. Verify Deployment

1. Check deployment logs in Railway dashboard
2. Visit your service URL: `https://your-service.up.railway.app`
3. Test health endpoint: `https://your-service.up.railway.app/api/health`
4. Should return: `{"status":"ok","timestamp":"..."}`

### 9. Set Up Custom Domain (Optional)

1. Go to service settings
2. Click **"Settings"** → **"Networking"**
3. Add custom domain
4. Update `FRONTEND_URL` and `BACKEND_URL` environment variables

## Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-provided by Railway |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `abc123...` |
| `JWT_REFRESH_SECRET` | Refresh token secret (32+ chars) | `xyz789...` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3001` (Railway auto-sets this) |
| `FRONTEND_URL` | Frontend application URL | `https://your-app.vercel.app` |

### Optional Variables
| Variable | Description |
|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `ENCRYPTION_KEY` | 32-byte hex key for data encryption |

## Troubleshooting

### Build Fails
- Check Node.js version (should be 20+)
- Verify `package.json` scripts are correct
- Check build logs for specific errors

### Database Connection Fails
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure SSL mode is correct (Railway uses SSL by default)

### Migrations Fail
- Run migrations manually via Railway CLI
- Check Prisma schema is correct
- Verify database has proper permissions

### Service Won't Start
- Check `PORT` environment variable (Railway sets this automatically)
- Verify `NODE_ENV=production`
- Check application logs in Railway dashboard

### CORS Errors
- Update `FRONTEND_URL` with correct frontend domain
- Ensure frontend is configured to use backend URL
- Check CORS settings in `backend/src/server.ts`

## Quick Commands

```bash
# View logs
railway logs

# Run command in service
railway run "cd backend && npm run create-admin"

# Open shell
railway shell

# View variables
railway variables
```

## Next Steps

1. **Deploy Frontend**: Deploy frontend to Vercel/Netlify and update `FRONTEND_URL`
2. **Set Up Monitoring**: Configure Railway monitoring and alerts
3. **Backup Database**: Set up automated backups for PostgreSQL
4. **SSL/HTTPS**: Railway provides HTTPS automatically
5. **Scaling**: Configure auto-scaling if needed

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: Check GitHub issues

---

**Note**: Railway automatically handles:
- HTTPS/SSL certificates
- Port assignment (use `process.env.PORT`)
- Health checks
- Auto-deployments from Git
