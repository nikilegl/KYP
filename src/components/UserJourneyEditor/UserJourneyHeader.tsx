import React from 'react'
import { ArrowLeft, Edit } from 'lucide-react'
import { StakeholderTag } from '../common/StakeholderTag'
import { CopyLinkButton } from '../common/CopyLinkButton'
import type { UserJourney, Stakeholder, UserRole } from '../../lib/supabase'

interface UserJourneyHeaderProps {
  journey: UserJourney
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  onBack: () => void
  onEdit: () => void
}

export function UserJourneyHeader({ 
  journey, 
  assignedStakeholders, 
  userRoles, 
  onBack, 
  onEdit 
}: UserJourneyHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 -mx-6 -mt-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft size={20} />
            Back to Journeys
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{journey.name}</h2>
          
          {/* Assigned Stakeholders */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Assigned Stakeholders:</span>
            <div className="flex flex-wrap gap-1">
              {assignedStakeholders.map((stakeholder) => {
                const userRole = userRoles.find(role => role.id === stakeholder.user_role_id)
                return (
                  <StakeholderTag
                    key={stakeholder.id}
                    stakeholder={stakeholder}
                    userRole={userRole}
                    size="sm"
                  />
                )
              })}
              {assignedStakeholders.length === 0 && (
                <span className="text-xs text-gray-500">No stakeholders assigned</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <Edit size={14} />
            Edit
          </button>
          <CopyLinkButton entityType="user-journey" shortId={journey.short_id} />
        </div>
      </div>
    </div>
  )
}