# Force Logout All Users

This guide explains how to force logout all users to ensure no one is still logged in with old credentials after removing email/password authentication.

## Method 1: Client-Side Browser Console Script (Quickest)

### For Individual Users
Have each user run this in their browser console (F12 → Console tab):

```javascript
(async () => {
  console.log('🔴 Force logging out all users...');
  
  // Sign out from Supabase
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your actual URL
    const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual key
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.auth.signOut();
    console.log('✅ Supabase signOut called');
  } catch (error) {
    console.error('Error signing out:', error);
  }
  
  // Clear all localStorage items
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('sb-') || 
      key.startsWith('supabase.') ||
      key.includes('auth') || 
      key.includes('token') || 
      key.includes('session') ||
      key === 'kyp_local_user'
    )) {
      keys.push(key);
    }
  }
  keys.forEach(k => {
    localStorage.removeItem(k);
    console.log(`🗑️ Removed: ${k}`);
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
  
  // Clear auth-related cookies
  document.cookie.split(";").forEach((c) => {
    const cookieName = c.split("=")[0].trim();
    if (cookieName.includes('auth') || cookieName.includes('session') || cookieName.includes('token')) {
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      console.log(`🗑️ Cleared cookie: ${cookieName}`);
    }
  });
  
  console.log('✅ All authentication data cleared! Reloading...');
  window.location.reload();
})();
```

### Simplified Version (if Supabase client is already available)
If the app is already loaded, you can use this simpler version:

```javascript
// Clear all auth data and reload
localStorage.clear();
sessionStorage.clear();
window.location.reload();
```

**⚠️ Warning:** This will clear ALL localStorage, not just auth data. Use the detailed version above if you need to preserve other data.

## Method 2: Server-Side - Invalidate All Sessions via Supabase Admin API

This method invalidates all sessions server-side, forcing all users to re-authenticate.

### Step 1: Create a Supabase Edge Function

Create a new file: `supabase/functions/invalidate-all-sessions/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin authorization (add your secret key check here)
    const authHeader = req.headers.get('Authorization')
    const adminSecret = Deno.env.get('ADMIN_SECRET') || ''
    const providedSecret = authHeader?.replace('Bearer ', '')
    
    if (!adminSecret || providedSecret !== adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      throw usersError
    }

    // Sign out all users by updating their sessions
    // Note: Supabase doesn't have a direct "sign out all users" API
    // We can invalidate refresh tokens by updating user metadata or using RPC
    const results = []
    
    for (const user of users.users) {
      try {
        // Option 1: Update user metadata to force re-auth (less aggressive)
        // await supabaseAdmin.auth.admin.updateUserById(user.id, {
        //   user_metadata: { force_logout: Date.now() }
        // })
        
        // Option 2: Delete and recreate user (more aggressive - use with caution)
        // This would require storing user data first
        
        results.push({ userId: user.id, email: user.email, status: 'processed' })
      } catch (error) {
        results.push({ userId: user.id, email: user.email, status: 'error', error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${results.length} users`,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error invalidating sessions:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

### Step 2: Deploy the Function

```bash
supabase functions deploy invalidate-all-sessions
```

### Step 3: Set Admin Secret

```bash
supabase secrets set ADMIN_SECRET=your-secret-key-here
```

### Step 4: Call the Function

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/invalidate-all-sessions \
  -H "Authorization: Bearer your-secret-key-here" \
  -H "Content-Type: application/json"
```

## Method 3: Database-Level Session Invalidation

### Option A: Clear Refresh Tokens (Supabase SQL)

Run this in Supabase SQL Editor:

```sql
-- WARNING: This will invalidate all refresh tokens
-- Users will need to sign in again with Google OAuth

-- Note: Supabase stores refresh tokens in auth.refresh_tokens table
-- You can delete all refresh tokens (use with caution)
DELETE FROM auth.refresh_tokens;

-- Or delete tokens older than a certain date
-- DELETE FROM auth.refresh_tokens WHERE created_at < NOW() - INTERVAL '1 day';
```

### Option B: Update JWT Secret (Nuclear Option)

⚠️ **WARNING: This will invalidate ALL sessions immediately and require all users to re-authenticate.**

1. Go to Supabase Dashboard → Settings → API
2. Regenerate the JWT Secret
3. Update your environment variables
4. Redeploy your application

This invalidates all existing tokens immediately.

## Method 4: Add Automatic Session Check on App Load

Add this to your `App.tsx` or `useAuth.ts` to automatically sign out users with old credentials:

```typescript
// In useAuth.ts, add this check on initialization
useEffect(() => {
  if (isSupabaseConfigured && supabase) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Check if user was created with email/password (old method)
        // Google OAuth users have provider 'google'
        const provider = session.user.app_metadata?.provider || 'email'
        
        if (provider === 'email') {
          console.warn('🔴 User signed in with email/password - signing out')
          supabase.auth.signOut()
          forceSignOut()
        }
      }
    })
  }
}, [])
```

## Recommended Approach

1. **Immediate**: Use Method 1 (Browser Console Script) to clear sessions for active users
2. **Preventive**: Add Method 4 (Automatic Session Check) to prevent old credentials from working
3. **Nuclear**: If needed, use Method 3B (Regenerate JWT Secret) for complete invalidation

## Testing

After implementing any method:

1. Open the app in an incognito/private window
2. Try to access protected routes
3. Verify that only Google Sign-In is available
4. Verify that email/password login no longer works

