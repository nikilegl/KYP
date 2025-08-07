import React, { useState } from 'react'
import { Plus, X, Users, Trash2, Star } from 'lucide-react'
import { StakeholderAvatar } from '../common/StakeholderAvatar'
import { AddStakeholdersModal } from '../common/AddStakeholdersModal'
import { getStructureTagStyles } from '../../utils/structureTagStyles'
import type { Stakeholder, UserRole, LawFirm } from '../../lib/supabase'

interface NoteStakeholdersSectionProps {
  assignedStakeholders: Stakeholder[]
  noteStakeholderIds: string[]
  noteId: string
  allWorkspaceStakeholders: Stakeholder[]
  projectAssignedStakeholderIds: string[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  onSave: (stakeholderIds: string[]) => Promise<void>
  onAssignStakeholderToProject: (stakeholderId: string) => Promise<void>
  onRemoveStakeholderFromNoteAndConditionallyProject: (stakeholderId: string, noteId: string) => Promise<void>
  saving: boolean
}

export function NoteStakeholdersSection({
  assignedStakeholders,
  noteStakeholderIds,
  noteId,
  allWorkspaceStakeholders,
  projectAssignedStakeholderIds,
  userRoles,
  lawFirms,
  userPermissions,
  onSave,
  onAssignStakeholderToProject,
  onRemoveStakeholderFromNoteAndConditionallyProject,
  saving
}: NoteStakeholdersSectionProps) {
  const [showAddStakeholderModal, setShowAddStakeholderModal] = useState(false)

  const handleRemoveStakeholder = async (stakeholderId: string) => {
    try {
      await onRemoveStakeholderFromNoteAndConditionallyProject(stakeholderId, noteId)
    } catch (error) {
      console.error('Error removing stakeholder from note:', error)
    }
  }

  const handleSaveStakeholderSelection = async (stakeholderIds: string[]) => {
    try {
      // Save the updated stakeholder list to the note
      await onSave(stakeholderIds)
      
      // For each newly selected stakeholder, check if they need to be assigned to the project
      const newStakeholderIds = stakeholderIds.filter(id => !noteStakeholderIds.includes(id))
      for (const stakeholderId of newStakeholderIds) {
        if (!projectAssignedStakeholderIds.includes(stakeholderId)) {
          await onAssignStakeholderToProject(stakeholderId)
        }
      }
    } catch (error) {
      console.error('Error adding stakeholders to note:', error)
      throw error
    }
  }

  const getStakeholderDetails = (stakeholder: Stakeholder) => {
    const userRole = userRoles.find(role => role.id === stakeholder.user_role_id)
    const lawFirm = lawFirms.find(firm => firm.id === stakeholder.law_firm_id)
    
    return {
      userRole,
      lawFirm
    }
  }

  const noteStakeholders = assignedStakeholders.filter(s => noteStakeholderIds.includes(s.id))

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Tagged Stakeholders ({noteStakeholders.length})
        </h2>
        
        <button
          onClick={() => setShowAddStakeholderModal(true)}
          className="flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Stakeholders
        </button>
      </div>

      <div className="space-y-3">
        {noteStakeholders.length > 0 ? (
          noteStakeholders.map(stakeholder => {
            const { userRole, lawFirm } = getStakeholderDetails(stakeholder)
            
            return (
              <div
                key={stakeholder.id}
                className="relative bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center space-x-4">
                  {/* Role Icon - Left side */}
                  <StakeholderAvatar userRole={userRole} size="lg" className="flex-shrink-0" />

                  {/* Stakeholder Info - Center */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Name and Role on same line */}
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900">{stakeholder.name}</h4>
                      {userRole && (
                        <span 
                          className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{ 
                            backgroundColor: `${userRole.colour}20`,
                            color: userRole.colour 
                          }}
                        >
                          {userRole.name}
                        </span>
                      )}
                    </div>
                    
                    {/* Law Firm Name and Structure */}
                    {lawFirm && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <p className="text-sm text-gray-600">{lawFirm.name}</p>
                          {lawFirm.top_4 && (
                            <Star size={12} className="text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div>
                          <span 
                            className={getStructureTagStyles(lawFirm.structure).className}
                            style={getStructureTagStyles(lawFirm.structure).style}
                          >
                            {lawFirm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remove button - Right side */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveStakeholder(stakeholder.id)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Remove from note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-gray-500 italic text-center py-4">No stakeholders tagged</p>
        )}
      </div>

      <AddStakeholdersModal
        isOpen={showAddStakeholderModal}
        onClose={() => setShowAddStakeholderModal(false)}
        allWorkspaceStakeholders={allWorkspaceStakeholders}
        userRoles={userRoles}
        lawFirms={lawFirms}
        userPermissions={userPermissions}
        initialSelectedStakeholderIds={noteStakeholderIds}
        onSaveSelection={handleSaveStakeholderSelection}
        title="Add Stakeholders to Note"
        saving={saving}
      />
    </div>
  )
}