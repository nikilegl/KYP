import React from 'react'
import { UserJourneysSection } from './UserJourneysSection'
import type { Stakeholder, UserRole, LawFirm } from '../lib/supabase'

interface UserFlowsSectionProps {
  projectId: string
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  userPermissions: UserPermission[]
  lawFirms: LawFirm[]
}

export function UserFlowsSection({ 
  projectId, 
  assignedStakeholders, 
  userRoles, 
  userPermissions,
  lawFirms 
}: UserFlowsSectionProps) {
  return (
    <UserJourneysSection
      projectId={projectId}
      assignedStakeholders={assignedStakeholders}
      userRoles={userRoles}
      userPermissions={userPermissions}
      lawFirms={lawFirms}
    />
  )
}