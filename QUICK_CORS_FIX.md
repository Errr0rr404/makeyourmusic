# Quick Fix: Network Error After OPTIONS Success

## The Problem

OPTIONS (preflight) returns 200 ✅, but POST requests never reach the server ❌

This means the browser is blocking the POST request after preflight succeeds.

## Most Likely Cause: Origin Mismatch

The origin in your POST request doesn't match what's in `FRONTEND_URL` in Railway.

## Quick Fix

### 1. Check Your Exact Netlify Domain

Go to your Netlify site and check the **exact URL**:
- Is it `https://kairux.netlify.app`?
- Or `https://www.kairux.netlify.app`?
- Or a custom domain?

### 2. Set FRONTEND_URL in Railway

Go to **Railway** → Your backend → **Variables**

Set `FRONTEND_URL` to your **exact** Netlify domain:

```
FRONTEND_URL=https://kairux.netlify.app
```

**Important:**
- ✅ Use `https://` (not `http://`)
- ✅ No trailing slash
- ✅ Exact match (including `www.` if you use it)
- ✅ If you have multiple domains, separate with commas:
  ```
  FRONTEND_URL=https://kairux.netlify.app,https://www.kairux.netlify.app
  ```

### 3. Redeploy Railway

After changing `FRONTEND_URL`, **redeploy Railway** (or push a commit)

### 4. Check Railway Logs

After redeploy, check Railway logs for:
```
CORS configuration { allowedOrigins: ['https://kairux.netlify.app'] }
```

And when you try to login, you should see:
```
Incoming request { method: 'POST', url: '/api/auth/login', origin: 'https://kairux.netlify.app' }
```

If you see `CORS blocked origin`, the origin doesn't match!

## Test It

1. Set `FRONTEND_URL` in Railway to your exact Netlify domain
2. Redeploy Railway
3. Try logging in
4. Check Railway logs - you should now see POST requests!

## Still Not Working?

Check browser console for the exact error:
1. Open DevTools (F12)
2. Go to Console tab
3. Try to login
4. Look for CORS error message
5. It will show the exact origin being blocked

Then make sure that exact origin is in `FRONTEND_URL` in Railway!
