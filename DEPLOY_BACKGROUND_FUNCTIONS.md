# Deploy Background Functions (Free Plan - 15 Minute Timeout)

## 🎯 What This Fixes

**Problem:** Both transcript and image imports timing out at 26 seconds on Free plan

**Solution:** Background Functions with polling (15-minute timeout on all plans)

---

## ✅ What Was Implemented

### 1. Database Table for Job Tracking
**File:** `supabase/migrations/20251021000000_add_ai_processing_jobs.sql`
- Stores job status (processing/completed/failed)
- Tracks input and results
- Auto-cleans jobs older than 7 days

### 2. Background Functions
**Files:**
- `netlify/functions/diagram-to-journey-background.js` (Image imports)
- `netlify/functions/transcript-to-journey-background.js` (Transcript imports)

**Features:**
- Return immediately with job ID (202 Accepted)
- Process in background for up to 15 minutes
- Save results to database
- Handle errors gracefully

### 3. Frontend Polling System
**Files:**
- `src/lib/services/aiImageAnalysisService.ts` - New `analyzeJourneyImageWithBackground()` function
- `src/components/ImportJourneyImageModal.tsx` - Updated to show live progress

**Features:**
- Polls every 2 seconds for status
- Shows live progress: "Processing diagram... (15s)"
- Max wait time: 15 minutes
- Auto-retrieves results when complete

---

## 📋 Deployment Steps

### Step 1: Run Database Migration

**Via Supabase Dashboard:**
1. Go to **Supabase Dashboard** → Your Project → **SQL Editor**
2. Click **"New Query"**
3. Copy contents of `supabase/migrations/20251021000000_add_ai_processing_jobs.sql`
4. Click **Run**
5. Verify: Check **Database** → **Tables** → should see `ai_processing_jobs`

**OR via Supabase CLI:**
```bash
supabase migration up
```

### Step 2: Add Netlify Environment Variables

**Go to:** Netlify Dashboard → Your Site → Site settings → Environment variables

**Required variables:**
1. **`OPENAI_API_KEY`** - Your OpenAI API key (already set for transcript)
2. **`SUPABASE_URL`** - Your Supabase project URL
   - Example: `https://xxxxx.supabase.co`
   - Find it: Supabase Dashboard → Project Settings → API → URL
3. **`SUPABASE_SERVICE_KEY`** - Your Supabase service role key (⚠️ **NOT** the anon key)
   - Find it: Supabase Dashboard → Project Settings → API → service_role key (click "Reveal")
   - ⚠️ **Important:** Use `service_role` key, not `anon` key

**How to add:**
1. Click "Add a variable"
2. Key: `SUPABASE_URL`
3. Value: Your Supabase URL
4. Scope: All
5. Click "Create variable"
6. Repeat for `SUPABASE_SERVICE_KEY`

### Step 3: Deploy to Netlify

```bash
git add .
git commit -m "feat: implement background functions for AI imports (15-min timeout)"
git push origin main
```

**Wait for deploy:** 2-3 minutes

### Step 4: Verify Deployment

**Check Netlify Functions:**
1. Netlify Dashboard → Your Site → **Functions**
2. You should see:
   - `diagram-to-journey-background`
   - `transcript-to-journey-background`
3. Click each one to verify they deployed successfully

---

## 🧪 Testing

### Test Image Import:
1. Go to your production site
2. User Journey Creator → "Import from Image"
3. Paste/upload a diagram
4. Click "Import Journey"
5. **Expected behavior:**
   - Button shows: "Processing diagram... (5s)" → "(10s)" → etc.
   - Progress updates every 2 seconds
   - Completes successfully within 1-2 minutes
   - Modal closes and diagram appears

### Test Transcript Import:
Same process, but with "Import from Transcript"

---

## 📊 What Users Will See

### Before (Timeout):
```
[Analyzing...]
❌ Error: Server error: 504
```

### After (Background Functions):
```
[Processing diagram... (5s)]
[Processing diagram... (12s)]
[Processing diagram... (25s)]
[Processing diagram... (38s)]
✅ Successfully imported journey with 12 nodes!
```

---

## 🔍 Troubleshooting

### Issue: "Database not configured"
**Solution:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in Netlify

### Issue: "User not authenticated"
**Solution:**
- User must be logged in
- Check RLS policies on `ai_processing_jobs` table
- Verify policy: "Users can view their own AI processing jobs"

### Issue: Still timing out
**Possible causes:**
1. **Environment variables not applied:**
   - Go to Netlify → Deploys → Latest deploy
   - Check "Environment" section
   - Variables should be listed
   - If not, redeploy after adding them

2. **Background function not found:**
   - Check Netlify Functions list
   - Should show `-background` suffix
   - If missing, check file names end with `-background.js`

3. **Database migration not run:**
   - Check Supabase → Database → Tables
   - `ai_processing_jobs` table must exist
   - If missing, run migration again

### Issue: Job stuck in "processing"
**Solution:**
- Check Netlify Function logs
- Go to: Netlify → Functions → diagram-to-journey-background → Logs
- Look for errors from OpenAI API
- Common causes:
  - OpenAI API key invalid
  - OpenAI rate limits
  - Image too large/complex

---

## 💰 Cost Implications

**Netlify Background Functions:**
- ✅ **FREE on all plans** (including Free tier)
- ✅ Up to 15 minutes execution time
- ✅ Same limits as regular functions for invocations

**Supabase:**
- ✅ **FREE tier includes:**
  - 500MB database
  - Unlimited API requests
  - Row Level Security

**OpenAI API:**
- 💰 **Costs remain the same** (pay per token)
- Vision API: ~$0.01-0.05 per diagram
- Text API: ~$0.001-0.01 per transcript

---

## 📈 Performance Expectations

| Diagram Complexity | Expected Time | Max Time |
|--------------------|---------------|----------|
| Simple (5-10 nodes) | 15-30 seconds | 1 minute |
| Medium (10-25 nodes) | 30-60 seconds | 2 minutes |
| Complex (25-50 nodes) | 1-3 minutes | 5 minutes |
| Very Complex (50+ nodes) | 3-10 minutes | 15 minutes |

**Polling:**
- Checks every 2 seconds
- User sees: "Processing... (Xs)"
- No browser timeout issues

---

## 🔐 Security

**Service Role Key:**
- ⚠️ **Never expose in client code**
- ✅ **Only used in Netlify Functions** (server-side)
- ✅ **Netlify environment variables are encrypted**

**RLS Policies:**
- ✅ Users can only see their own jobs
- ✅ Jobs are cleaned up after 7 days
- ✅ No cross-user data leakage

---

## 🎉 Benefits

1. ✅ **15-minute timeout** (vs 26 seconds)
2. ✅ **Live progress updates** (no black box waiting)
3. ✅ **Works on Free plan** (no upgrade required)
4. ✅ **Handles complex diagrams** (50+ nodes)
5. ✅ **Better user experience** (know what's happening)
6. ✅ **Resilient to network issues** (polling continues if connection drops briefly)

---

## 🚀 Ready to Deploy?

```bash
# 1. Run database migration (see Step 1 above)

# 2. Add environment variables (see Step 2 above)

# 3. Deploy
git add .
git commit -m "feat: background functions for AI imports"
git push origin main

# 4. Test on production
# - Try importing a diagram
# - Should see live progress
# - Should complete successfully
```

---

## 📝 Files Changed

1. ✅ `supabase/migrations/20251021000000_add_ai_processing_jobs.sql` (NEW)
2. ✅ `netlify/functions/diagram-to-journey-background.js` (NEW)
3. ✅ `netlify/functions/transcript-to-journey-background.js` (NEW)
4. ✅ `src/lib/services/aiImageAnalysisService.ts` (UPDATED - added background function)
5. ✅ `src/components/ImportJourneyImageModal.tsx` (UPDATED - shows progress)
6. ✅ `netlify.toml` (UPDATED - simplified)
7. ✅ `src/lib/prompts/diagram-to-journey-prompt-optimized.ts` (EXISTING - already optimized)

---

## ❓ Questions?

**Does this work on Free plan?**
✅ Yes! Background Functions are free on all Netlify plans.

**Do I need to upgrade Supabase?**
❌ No! Free tier is sufficient.

**Will old imports still work?**
✅ Yes, but they'll still timeout at 26s. New background function is recommended.

**Can I test locally?**
⚠️ Background functions are Netlify-specific. Test on production or use Netlify Dev CLI.

---

## 🎯 Success Criteria

After deployment, you should be able to:
- ✅ Import diagrams that previously timed out
- ✅ See live progress updates ("Processing... 15s, 30s, 45s...")
- ✅ Complete imports in 1-5 minutes (depending on complexity)
- ✅ No more 504 timeout errors

If any of these fail, check the Troubleshooting section above.

