// Auth0 configuration
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || '',
  },
  // Use Google as the connection
  connection: 'google-oauth2',
}

export const isAuth0Configured = !!(
  auth0Config.domain && 
  auth0Config.clientId &&
  auth0Config.domain !== '' &&
  auth0Config.clientId !== ''
)

