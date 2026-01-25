# Fix: Network Error on Login

## The Problem

Your frontend is calling `/api/auth/login` which goes to a **Next.js API route** (server-side), not your Railway backend. The Next.js API route needs database access, but Netlify might not have `DATABASE_URL` configured.

## Solution: Point Frontend Directly to Railway

### Step 1: Set Environment Variable in Netlify

1. Go to **Netlify Dashboard** → Your site → **Site settings** → **Environment variables**
2. Add this variable:
   ```
   NEXT_PUBLIC_API_URL=https://kairux-production.up.railway.app/api
   ```
   **Replace with your actual Railway URL!**

3. **Redeploy** your Netlify site (or push a commit)

### Step 2: Verify Railway CORS

1. Go to **Railway Dashboard** → Your backend service → **Variables**
2. Make sure `FRONTEND_URL` includes your Netlify domain:
   ```
   FRONTEND_URL=https://kairux.netlify.app
   ```
   (Replace with your actual Netlify domain)

3. **Redeploy** Railway if you changed it

### Step 3: Test

1. Open your Netlify site
2. Try to login
3. Check browser DevTools → Network tab
4. You should see requests going to: `https://kairux-production.up.railway.app/api/auth/login`

## Alternative: Use Next.js API Routes (If you want)

If you prefer to use Next.js API routes (which proxy to Railway), you need to:

1. **Set DATABASE_URL in Netlify** (same as Railway's DATABASE_URL)
2. **Set NEXT_PUBLIC_API_URL** to Railway URL (so Next.js routes can call Railway if needed)

But the **recommended approach** is Solution 1: Point frontend directly to Railway.

## Why This Happens

- Without `NEXT_PUBLIC_API_URL`, the frontend uses `/api` (relative path)
- This calls Next.js API routes in `frontend/app/api/`
- These routes need database access (DATABASE_URL)
- If DATABASE_URL isn't set in Netlify, it fails

## Quick Check

**In Netlify Environment Variables, you should have:**
```
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
```

**In Railway Environment Variables, you should have:**
```
FRONTEND_URL=https://your-netlify-site.netlify.app
```

After setting these and redeploying, login should work!
