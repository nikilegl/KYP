import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isInvite, setIsInvite] = useState(false)
  const { updateUserPassword } = useAuth()
  const navigate = useNavigate()

  // Check if we have a valid session/token from the URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')
    
    if (!accessToken || (type !== 'recovery' && type !== 'signup')) {
      if (type === 'signup') {
        setError('Invalid or expired invitation link. Please contact your workspace administrator for a new invitation.')
      } else {
        setError('Invalid or expired password reset link. Please request a new one.')
      }
    } else if (type === 'signup') {
      setIsInvite(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await updateUserPassword(newPassword)
      
      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/')
        }, 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Password update error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/')
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Updated!</h1>
            <p className="text-gray-600 mb-6">
              {isInvite 
                ? 'Welcome to KYP! Your account has been created successfully. You will be redirected to the login page shortly.'
                : 'Your password has been successfully updated. You will be redirected to the login page shortly.'
              }
            </p>
            
            <button
              onClick={handleBackToLogin}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-all"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">KYP</span>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isInvite ? 'Welcome to KYP!' : 'Reset Your Password'}
            </h1>
            <p className="text-gray-600">
              {isInvite 
                ? 'Create your password to complete your account setup'
                : 'Enter your new password below'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isInvite ? 'Create Password' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder={isInvite ? 'Create a secure password' : 'Enter your new password'}
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isInvite ? 'Create Account' : 'Update Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mx-auto"
              disabled={loading}
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}