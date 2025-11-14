# Environment Variables Guide

## For Local Development (.env file)

Create a `.env` file in your project root:

```env
# Supabase (for client-side)
VITE_SUPABASE_URL=https://lkunizszvxeudaauceif.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# Auth0 (for client-side)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id

# DO NOT add SUPABASE_SERVICE_ROLE_KEY here!
# It's server-side only and should never be in client code
```

**Important:**
- ✅ Use `VITE_` prefix for variables exposed to browser
- ✅ Format: `KEY=value` (no spaces around `=`)
- ❌ Never commit `.env` to git (should be in `.gitignore`)
- ❌ Never add `SUPABASE_SERVICE_ROLE_KEY` to `.env`

## For Edge Functions (Supabase Dashboard)

Edge functions run on Supabase servers and don't use `.env` files.

### They Should Auto-Set:
- `SUPABASE_URL` (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically available)

### If Missing, Set Manually:

1. Go to **Supabase Dashboard** → **Edge Functions** → `add-auth0-user`
2. Click **Settings** or **Details**
3. Find **Environment Variables** or **Secrets** section
4. Add:
   - **Key**: `SUPABASE_URL`
   - **Value**: `https://lkunizszvxeudaauceif.supabase.co`
   
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: (Get from Settings → API → service_role key)

**Important:**
- ❌ No `VITE_` prefix (these are server-side)
- ❌ Don't use `.env` file format (set in Dashboard UI)
- ✅ Set as separate key-value pairs in Dashboard

## How to Verify Edge Function Has Variables

After deploying the updated function with logging:

1. Log in with Google
2. Check **Edge Functions** → `add-auth0-user` → **Logs**
3. Look for: `🔵 Environment check: { hasUrl: true, hasServiceKey: true, ... }`

If `hasServiceKey: false`, set it manually in Dashboard.



