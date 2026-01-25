# Quick Fix: Network Error on Login

## Most Likely Issue: CORS Configuration

### Step 1: Check Railway Environment Variables

1. Go to **Railway Dashboard** → Your backend service → **Variables**
2. Verify `FRONTEND_URL` is set to your Netlify domain:
   ```
   FRONTEND_URL=https://your-netlify-site.netlify.app
   ```
   **Important:** 
   - Use `https://` (not `http://`)
   - No trailing slash
   - Exact domain match (including `www.` if you use it)

3. If you have multiple domains:
   ```
   FRONTEND_URL=https://your-netlify-site.netlify.app,https://your-custom-domain.com
   ```

### Step 2: Check Netlify Environment Variables

1. Go to **Netlify Dashboard** → Your site → **Site settings** → **Environment variables**
2. Verify `NEXT_PUBLIC_API_URL` is set correctly:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
   ```
   **Important:**
   - Must include `/api` at the end
   - Use your actual Railway URL (check Railway dashboard for the exact URL)

### Step 3: Redeploy Both Services

**After changing environment variables:**
1. **Railway:** Go to Deployments → Trigger new deployment (or push a commit)
2. **Netlify:** Go to Deploys → Trigger deploy (or push a commit)

### Step 4: Test the Backend Directly

Open your browser and visit:
```
https://your-railway-backend.up.railway.app/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

If this fails, the backend isn't accessible - check Railway logs.

### Step 5: Check Browser Console

1. Open your Netlify site
2. Open Browser DevTools (F12)
3. Go to **Console** tab
4. Try to login
5. Look for CORS errors like:
   - `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
   - `Failed to fetch`
   - `Network Error`

### Step 6: Check Network Tab

1. In Browser DevTools, go to **Network** tab
2. Try to login
3. Find the failed request (usually `/api/auth/login`)
4. Click on it and check:
   - **Request URL:** Should be your Railway URL
   - **Status:** What error code?
   - **Response Headers:** Look for `Access-Control-Allow-Origin`

## Common Issues

### Issue 1: CORS Error
**Error:** `Access to fetch... blocked by CORS policy`

**Fix:** 
- Set `FRONTEND_URL` in Railway to your exact Netlify domain
- Redeploy Railway

### Issue 2: 404 Not Found
**Error:** `404` status code

**Fix:**
- Check `NEXT_PUBLIC_API_URL` in Netlify includes `/api`
- Verify Railway URL is correct

### Issue 3: Network Error (No Response)
**Error:** `Failed to fetch` or `Network Error`

**Possible causes:**
- Railway backend not running (check Railway status)
- Wrong API URL in Netlify
- Firewall/network blocking

**Fix:**
- Check Railway service is running
- Test Railway URL directly in browser
- Verify `NEXT_PUBLIC_API_URL` is correct

## Quick Test Commands

```bash
# Test Railway backend health
curl https://your-railway-backend.up.railway.app/api/health

# Test login endpoint (should return 400, not CORS error)
curl -X POST https://your-railway-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-netlify-site.netlify.app" \
  -d '{"email":"test","password":"test"}'
```

If the second command returns a CORS error, `FRONTEND_URL` is not set correctly in Railway.

## Still Not Working?

1. **Check Railway logs** - Look for CORS warnings or errors
2. **Check exact URLs** - Copy-paste from Railway/Netlify dashboards
3. **Verify both services redeployed** after variable changes
4. **Test backend directly** - If backend works but frontend doesn't, it's CORS

---

**Remember:** Environment variable changes require redeployment to take effect!
