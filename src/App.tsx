import React from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()
  const params = useParams()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading KYP Platform...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <Dashboard routeParams={params} pathname={location.pathname} />
}

export default App