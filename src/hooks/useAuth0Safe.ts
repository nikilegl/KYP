import { useAuth0 } from '@auth0/auth0-react'
import { isAuth0Configured } from '../lib/auth0'

/**
 * Safely use Auth0 hook - returns null if Auth0 is not configured
 * Auth0Provider is always in the tree (with placeholder values when not configured),
 * so we can safely call useAuth0() unconditionally
 */
export function useAuth0Safe() {
  // Always call the hook unconditionally (React requirement)
  // Auth0Provider is always in the tree (see main.tsx)
  const auth0 = useAuth0()
  
  // Only return auth0 if configured, otherwise return null
  // This allows the hook to be called but we ignore the result when not configured
  return isAuth0Configured ? auth0 : null
}

