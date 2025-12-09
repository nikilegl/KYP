import React, { useEffect, useState } from 'react'
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'
import { LoadingState } from './components/DesignSystem/components/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()
  const params = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)

  // Check for Auth0 callback errors
  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    if (error) {
      setAuthError(errorDescription || 'Access denied')
      // Clear error params from URL
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('error')
      newParams.delete('error_description')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Show error message if Auth0 callback had an error
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 mb-4">{authError}</p>
            <p className="text-sm text-gray-500 mb-6">
              This application is restricted to @legl.com email addresses only.
            </p>
            <button
              onClick={() => {
                setAuthError(null)
                window.location.href = '/'
              }}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading KYP Platform..." />
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <Dashboard routeParams={params} pathname={location.pathname} />
}

export default App