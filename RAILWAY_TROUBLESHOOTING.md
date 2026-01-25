# Railway Troubleshooting Guide

## Network Error on Frontend Login

### Issue
Frontend shows "network error" when trying to login, but Railway shows server is running.

### Common Causes & Solutions

#### 1. CORS Configuration ❌

**Problem:** Railway backend doesn't allow your Netlify domain.

**Solution:**
1. Go to Railway → Your backend service → Variables
2. Set `FRONTEND_URL` to your Netlify domain:
   ```
   FRONTEND_URL=https://your-netlify-site.netlify.app
   ```
3. If you have multiple domains (custom domain + Netlify):
   ```
   FRONTEND_URL=https://your-netlify-site.netlify.app,https://your-custom-domain.com
   ```
4. **Important:** No trailing slashes!
5. Redeploy Railway service after changing variables

#### 2. Wrong API URL in Netlify ❌

**Problem:** Frontend is calling wrong backend URL.

**Solution:**
1. Go to Netlify → Site settings → Environment variables
2. Verify `NEXT_PUBLIC_API_URL` is set correctly:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app/api
   ```
3. **Important:** Must include `/api` at the end!
4. Redeploy Netlify after changing variables

#### 3. Backend Not Responding ❌

**Problem:** Railway backend might not be accessible.

**Test:**
```bash
curl https://your-railway-backend.up.railway.app/api/health
```

Should return: `{"status":"ok","timestamp":"..."}`

If it fails:
- Check Railway service is running
- Check Railway logs for errors
- Verify PORT is set correctly (Railway auto-sets this)

#### 4. Database Connection Issues ❌

**Problem:** Backend can't connect to database.

**Check Railway logs for:**
- `DATABASE_URL` errors
- Connection timeout errors
- Prisma client errors

**Solution:**
- Verify `DATABASE_URL` is set in Railway
- Check PostgreSQL service is running
- Test database connection

#### 5. Missing Environment Variables ❌

**Problem:** Required variables not set in Railway.

**Required in Railway:**
```
DATABASE_URL=<auto-set by Railway PostgreSQL>
JWT_SECRET=<your-secret>
JWT_REFRESH_SECRET=<your-secret>
NODE_ENV=production
FRONTEND_URL=https://your-netlify-site.netlify.app
PORT=<auto-set by Railway>
```

### Debugging Steps

#### Step 1: Check Railway Logs
1. Go to Railway → Your backend service
2. Click **"View Logs"**
3. Look for:
   - CORS errors
   - Request logs
   - Error messages

#### Step 2: Test Backend Directly
```bash
# Test health endpoint
curl https://your-railway-backend.up.railway.app/api/health

# Test login endpoint (should return 400 for missing credentials, not CORS error)
curl -X POST https://your-railway-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

#### Step 3: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try to login
4. Look for:
   - Failed requests (red)
   - CORS errors in console
   - Request URL (should be Railway URL)

#### Step 4: Check CORS Headers
In browser Network tab, check the failed request:
- Look for `Access-Control-Allow-Origin` header
- Should match your Netlify domain
- If missing or wrong, CORS is misconfigured

### Quick Fix Checklist

- [ ] `FRONTEND_URL` set in Railway with your Netlify domain
- [ ] `NEXT_PUBLIC_API_URL` set in Netlify with Railway URL + `/api`
- [ ] No trailing slashes in URLs
- [ ] Railway service is running (check status)
- [ ] Database is connected (check Railway logs)
- [ ] Both services redeployed after variable changes

### Common Error Messages

**"Network Error" or "Failed to fetch"**
→ Usually CORS issue or wrong API URL

**"CORS policy: No 'Access-Control-Allow-Origin' header"**
→ `FRONTEND_URL` not set correctly in Railway

**"404 Not Found"**
→ Wrong API URL in Netlify (missing `/api` or wrong domain)

**"500 Internal Server Error"**
→ Backend error - check Railway logs

**"401 Unauthorized"**
→ Login credentials wrong (this is expected if testing with wrong credentials)

### Still Not Working?

1. **Check Railway logs** for specific errors
2. **Test backend directly** with curl/Postman
3. **Verify environment variables** are set correctly
4. **Check browser console** for specific error messages
5. **Ensure both services are redeployed** after variable changes

---

**Pro Tip:** Add logging to see what's happening:
- Railway logs show all requests
- Browser Network tab shows request/response details
- Check both to find the issue!
