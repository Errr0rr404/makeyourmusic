# Debug CORS Network Error

## Current Issue

- ✅ OPTIONS requests return 200 (CORS preflight works)
- ❌ POST requests don't appear in logs (browser blocking them)
- ❌ Frontend shows "Network Error"

## What This Means

The browser is blocking the POST request **after** the OPTIONS preflight succeeds. This usually means:

1. **CORS headers mismatch** - OPTIONS says one thing, POST response has different headers
2. **Origin not matching** - The origin in POST doesn't match what was allowed in OPTIONS
3. **CSP blocking** - Content Security Policy is blocking the request

## Debugging Steps

### Step 1: Check Railway Logs

Look for these log messages:
- `CORS configuration` - Shows allowed origins
- `CORS origin check` - Shows what origin is being checked
- `CORS blocked origin` - Shows if an origin was blocked
- `Incoming request` - Shows all requests (including origin header)

### Step 2: Check Browser Console

1. Open DevTools → Console
2. Look for CORS errors like:
   - `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
   - `No 'Access-Control-Allow-Origin' header is present`

### Step 3: Check Network Tab

1. Open DevTools → Network
2. Find the failed POST request to `/api/auth/login`
3. Click on it and check:
   - **Request Headers** → Look for `Origin` header
   - **Response Headers** → Look for `Access-Control-Allow-Origin`
   - **Status** → What status code?

### Step 4: Verify Environment Variables

**In Railway:**
```
FRONTEND_URL=https://kairux.netlify.app
```
(No trailing slash, exact domain match)

**In Netlify:**
```
NEXT_PUBLIC_API_URL=https://kairux-production.up.railway.app/api
```
(Must include `/api` at the end)

## Common Issues

### Issue 1: Origin Mismatch

**Symptom:** OPTIONS works, POST fails

**Check:**
- Railway logs show `CORS blocked origin` warning
- Browser console shows CORS error with specific origin

**Fix:**
- Make sure `FRONTEND_URL` in Railway **exactly matches** your Netlify domain
- Check for `www.` vs non-`www.` mismatch
- Check for `http://` vs `https://` mismatch

### Issue 2: CSP Blocking

**Symptom:** Request never reaches server

**Fix:**
- Already fixed in code - CSP now allows Railway domains
- Redeploy Railway after the fix

### Issue 3: Missing CORS Headers on POST Response

**Symptom:** OPTIONS has headers, POST response doesn't

**Fix:**
- CORS middleware should handle this automatically
- Check if error handler is removing CORS headers

## Quick Test

Test the backend directly with curl:

```bash
curl -X POST https://kairux-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://kairux.netlify.app" \
  -d '{"email":"admin@company.com","password":"Admin123!!"}'
```

If this works, the issue is browser-side CORS.
If this fails, the issue is server-side.

## What I Fixed

1. ✅ Added CSP allowlist for Railway domains
2. ✅ Added better CORS logging (shows origin in request logs)
3. ✅ Added `exposedHeaders` to CORS config
4. ✅ Added `optionsSuccessStatus: 200` for legacy browser compatibility

## Next Steps

1. **Commit and push** the fixes
2. **Redeploy Railway**
3. **Check Railway logs** for:
   - `CORS configuration` message (shows allowed origins)
   - `Incoming request` messages (shows origin header)
   - Any `CORS blocked origin` warnings
4. **Check browser console** for specific error messages

The enhanced logging will help identify exactly what's blocking the request.
