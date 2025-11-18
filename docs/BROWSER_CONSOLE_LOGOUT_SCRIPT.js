/**
 * Browser Console Script - Force Logout All Users
 * 
 * Copy and paste this entire script into your browser console (F12 → Console tab)
 * This will clear all authentication sessions and reload the page
 */

(async () => {
  console.log('🔴 Force logging out all users...');
  
  try {
    // Step 1: Sign out from Supabase if client is available
    // Try to access the Supabase client from the window object or import it
    let supabase = null;
    
    // Check if Supabase is available globally
    if (window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
    } else {
      // Try to get it from localStorage keys (we'll sign out via API if needed)
      const supabaseKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          supabaseKeys.push(key);
          // Extract project ref from key format: sb-<project-ref>-auth-token
          const match = key.match(/sb-([^-]+)-/);
          if (match && !supabase) {
            const projectRef = match[1];
            // Try to create client (you'll need to provide your keys)
            console.log('Found Supabase project ref:', projectRef);
          }
        }
      }
    }
    
    // Step 2: Clear all localStorage items related to authentication
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('sb-') ||           // Supabase keys
        key.startsWith('supabase.') ||      // Supabase keys
        key.includes('auth') ||             // Any auth-related keys
        key.includes('token') ||            // Any token keys
        key.includes('session') ||          // Any session keys
        key === 'kyp_local_user' ||        // Local user key
        key === 'kyp_local_users'          // Local users key
      )) {
        keysToRemove.push(key);
      }
    }
    
    console.log(`Found ${keysToRemove.length} authentication-related keys to remove`);
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    });
    
    // Step 3: Clear all sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Step 4: Clear auth-related cookies
    document.cookie.split(";").forEach((c) => {
      const cookieName = c.split("=")[0].trim();
      if (cookieName && (
        cookieName.includes('auth') || 
        cookieName.includes('session') || 
        cookieName.includes('token') ||
        cookieName.includes('supabase')
      )) {
        // Clear cookie for current path and root path
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname};`;
        console.log(`🗑️ Cleared cookie: ${cookieName}`);
      }
    });
    
    console.log('✅ All authentication data cleared!');
    console.log('🔄 Reloading page in 2 seconds...');
    
    // Wait 2 seconds then reload
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
    console.log('Attempting to reload anyway...');
    window.location.reload();
  }
})();

