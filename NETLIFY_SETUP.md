# Netlify Setup Guide for Kairux Frontend

This guide will help you configure your Netlify deployment to connect to your Railway backend.

## Prerequisites

- Netlify account (sign up at https://netlify.com)
- Railway backend deployed and running
- Your Railway backend URL (e.g., `https://kairux-production.up.railway.app`)

## Step-by-Step Setup

### 1. Deploy to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to your GitHub repository
4. Netlify will auto-detect Next.js settings

### 2. Configure Build Settings

**Base directory:** `frontend`

**Build command:**
```bash
npm install && npm run build
```

**Publish directory:** `frontend/.next`

### 3. Set Environment Variables

Go to **Site settings** → **Environment variables** and add:

#### Required Variables

```
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
NEXT_PUBLIC_SOCKET_URL=https://your-railway-backend.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-railway-backend.up.railway.app
```

**Replace `your-railway-backend.up.railway.app` with your actual Railway URL!**

#### Database (if using server-side features)
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=verify-full
```

#### Optional Variables
```
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Cloudinary (if using image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OpenAI (if using AI features)
OPENAI_API_KEY=sk-...

# Site URL (for SEO)
NEXT_PUBLIC_SITE_URL=https://your-netlify-site.netlify.app
```

### 4. Update Railway CORS Settings

Make sure your Railway backend allows requests from your Netlify domain:

1. Go to Railway dashboard → Your backend service → Variables
2. Set `FRONTEND_URL` to include your Netlify domain:
   ```
   FRONTEND_URL=https://your-netlify-site.netlify.app,https://your-custom-domain.com
   ```

### 5. Deploy

1. Click **"Deploy site"** or push to your connected branch
2. Netlify will build and deploy your frontend
3. Once deployed, test the connection to your Railway backend

## Testing the Connection

After deployment, test these endpoints:

1. **Health Check:**
   ```
   https://your-netlify-site.netlify.app/api/health
   ```
   Should proxy to: `https://your-railway-backend.up.railway.app/api/health`

2. **Login:**
   - Try logging in through the frontend
   - Check browser console for any CORS errors
   - Verify API calls are going to Railway backend

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Check `FRONTEND_URL` in Railway includes your Netlify domain
2. Ensure Railway backend is running
3. Check browser console for specific error messages

### API Calls Failing

1. Verify `NEXT_PUBLIC_API_URL` is set correctly in Netlify
2. Check Railway backend logs for errors
3. Test Railway backend directly: `https://your-railway-backend.up.railway.app/api/health`

### Socket.io Connection Issues

1. Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly
2. Check Railway backend supports WebSocket connections
3. Ensure Socket.io is properly configured on Railway

### Build Failures

1. Check Netlify build logs
2. Verify all environment variables are set
3. Ensure `DATABASE_URL` is set if using server-side features

## Custom Domain Setup

1. In Netlify: **Domain settings** → **Add custom domain**
2. Update `NEXT_PUBLIC_SITE_URL` to your custom domain
3. Update Railway `FRONTEND_URL` to include your custom domain
4. Redeploy both services

## Environment-Specific Configuration

### Production
- Use production Railway URL
- Use production Stripe keys
- Set `NODE_ENV=production`

### Preview/Staging
- Use staging Railway URL (if you have one)
- Use test Stripe keys
- Set `NODE_ENV=production` (still use production mode for Next.js)

## Quick Reference

**Railway Backend URL Format:**
```
https://your-service-name.up.railway.app
```

**Netlify Site URL Format:**
```
https://your-site-name.netlify.app
```

**API Endpoint:**
```
https://your-railway-backend.up.railway.app/api
```

---

**Note:** After setting environment variables, you need to trigger a new deployment for changes to take effect.
