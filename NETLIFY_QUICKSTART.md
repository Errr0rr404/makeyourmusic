# 🚀 Netlify Quick Start

## TL;DR - Get Running in 3 Minutes

### 1. Deploy to Netlify
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repository
4. Netlify will auto-detect Next.js

### 2. Configure Build Settings

**Base directory:** `frontend`

**Build command:**
```bash
npm install && npm run build
```

**Publish directory:** `frontend/.next`

### 3. Set Environment Variables

Go to **Site settings** → **Environment variables** and add:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
```

**Replace with your actual Railway URL!**

### 4. Update Railway CORS

In Railway dashboard → Your backend → Variables:

```
FRONTEND_URL=https://your-netlify-site.netlify.app
```

### 5. Deploy!

Click **"Deploy site"** and you're done! 🎉

---

## Full Guide

See `NETLIFY_SETUP.md` for detailed instructions.
