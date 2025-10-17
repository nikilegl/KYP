import React from 'react'
import { UserJourneysManager } from './UserJourneysManager'
import type { Stakeholder, UserRole, LawFirm, UserPermission } from '../lib/supabase'

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
    <UserJourneysManager projectId={projectId} />
  )
}