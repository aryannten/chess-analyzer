# Cache-Busting Verification Guide

## Purpose
This guide helps you verify that the cache-busting fix for the ChessEngineWorker.js file is working correctly.

## The Problem
When running `npm start`, browsers and development servers may cache the ChessEngineWorker.js file, causing:
- "🔄 Loading engine..." message to display indefinitely
- Old worker versions to be loaded instead of the latest code
- Engine initialization failures

## The Solution
We've implemented multiple cache-busting strategies:
1. HTTP cache-control meta tags in `public/index.html`
2. Session-based cache-busting using sessionStorage
3. Multiple URL parameters (timestamp, session ID, build ID, random string)
4. Styled console messages for easy verification

## How to Verify the Fix

### 1. Clear Your Browser Cache
Before testing, clear your browser cache:
- **Chrome/Edge**: Ctrl+Shift+Delete → Select "Cached images and files" → Clear
- **Firefox**: Ctrl+Shift+Delete → Select "Cache" → Clear Now
- **Safari**: Cmd+Option+E → Confirm

### 2. Start the Development Server
```bash
npm start
```

### 3. Open Browser DevTools Console
- Press F12 or Right-click → Inspect → Console tab

### 4. Look for Worker Version Messages
You should see these styled console messages:
```
 ChessEngineWorker v2.3-cache-fix loaded at [timestamp]
 Worker features: instant initialization + smart move generation + cache-fix
 If you see this message, the worker loaded successfully!
```

The version should be **2.3-cache-fix** (not 2.2-dev-aware or older)

### 5. Verify Engine Status
The UI should show:
- "Engine ready" in a green box (not "🔄 Loading engine...")
- This should appear within 1-2 seconds of the page loading

### 6. Check Worker URL (Optional)
In the Console, look for:
```
Creating engine worker...
Environment: development
Development mode: Enhanced cache-busting applied with session ID
Successfully created worker from public path with cache-busting: /ChessEngineWorker.js?v=[timestamp]_[random]&build=[buildId]&nocache=true&dev=true&session=[sessionId]&ts=[performanceTimestamp]
```

The URL should have multiple cache-busting parameters.

### 7. Test Cache Behavior
1. Refresh the page (F5 or Ctrl+R)
2. Check console - you should see the worker loaded with same session ID but different timestamps
3. Hard refresh (Ctrl+Shift+R or Ctrl+F5)
4. Session ID should change, ensuring a completely fresh load

## What to Do If It's Still Not Working

### Scenario 1: Shows Old Version (2.2-dev-aware)
**Cause**: Browser has aggressively cached the worker file
**Solution**: 
1. Do a hard refresh (Ctrl+Shift+R)
2. Clear browser cache completely
3. Close and reopen the browser
4. Try in private/incognito mode

### Scenario 2: "Loading engine..." Never Resolves
**Cause**: Worker initialization is failing
**Solution**:
1. Check browser console for errors
2. Verify the worker file exists at `/public/ChessEngineWorker.js`
3. Check if there are any network errors in Network tab (F12 → Network)
4. Try production build: `npm run build && npx serve -s build`

### Scenario 3: No Console Messages at All
**Cause**: Worker not being created
**Solution**:
1. Check browser console for JavaScript errors
2. Verify your browser supports Web Workers
3. Check if any browser extensions are blocking workers

## Additional Debugging Tips

### Enable Verbose Logging
The current implementation already has verbose logging. Check console for:
- "Creating engine worker..."
- "Engine ready message received!"
- "Worker version: [version]"

### Disable Cache in DevTools
For development, you can disable cache:
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache" checkbox
4. Keep DevTools open while testing

### Use the Cache-Clearing Batch File (Windows)
```bash
./start-dev-fresh.bat
```
This script clears webpack cache before starting the server.

## Success Criteria
✅ Worker version shows "2.3-cache-fix"
✅ "Engine ready" appears within 1-2 seconds
✅ Console shows styled worker loading messages
✅ Worker URL has session ID and multiple cache-busting parameters
✅ Fresh worker loads on every hard refresh
✅ Same session ID persists across normal refreshes within same browser session

## Technical Details

### Session ID Behavior
- Session ID is stored in sessionStorage
- Persists across page refreshes in the same tab
- Cleared when tab is closed or browser restarted
- Ensures consistent URL within a session while forcing fresh load on new sessions

### Cache-Control Headers
The following meta tags prevent caching:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

### URL Parameters
Each parameter serves a purpose:
- `v=[timestamp]_[random]` - Primary cache buster, changes every time
- `build=[buildId]` - Build identifier
- `nocache=true` - Explicit no-cache flag
- `dev=true` - Development mode indicator
- `session=[sessionId]` - Session-specific identifier
- `ts=[performanceTimestamp]` - High-resolution timestamp

## Contact
If you continue to experience issues after following this guide, please:
1. Take screenshots of browser console
2. Note your browser version
3. Document steps to reproduce
4. Report the issue on GitHub
