import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DashboardLayout } from './Dashboard/DashboardLayout'
import { WorkspaceDataFetcher } from './Dashboard/WorkspaceDataFetcher'

interface DashboardProps {
  routeParams: Record<string, string | undefined>
  pathname: string
}

export function Dashboard({ routeParams, pathname }: DashboardProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [currentDashboardView, setCurrentDashboardView] = useState('projects')

  const handleSignOut = async () => {
    await signOut()
  }

  const handleTopLevelNavigation = (viewId: string) => {
    switch (viewId) {
      case 'projects':
        navigate('/')
        break
      case 'workspace-dashboard':
        navigate('/workspace-dashboard')
        break
      case 'law-firms':
        navigate('/law-firms')
        break
      case 'themes':
        navigate('/themes')
        break
      case 'stakeholders':
        navigate('/stakeholders')
        break
      case 'settings':
        navigate('/settings')
        break
      default:
        navigate('/')
        break
    }
  }

  return (
    <DashboardLayout
      currentView={currentDashboardView}
      onViewChange={handleTopLevelNavigation}
      user={user}
      onSignOut={handleSignOut}
    >
      <WorkspaceDataFetcher
        routeParams={routeParams}
        pathname={pathname}
        onViewChange={setCurrentDashboardView}
        onSignOut={handleSignOut}
      />
    </DashboardLayout>
  )
}