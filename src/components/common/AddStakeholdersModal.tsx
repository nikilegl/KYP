import React, { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { StakeholderSelectionTable } from './StakeholderSelectionTable'
import type { Stakeholder, UserRole, LawFirm } from '../../lib/supabase'

interface AddStakeholdersModalProps {
  isOpen: boolean
  onClose: () => void
  allWorkspaceStakeholders: Stakeholder[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  initialSelectedStakeholderIds: string[]
  onSaveSelection: (stakeholderIds: string[]) => Promise<void>
  title?: string
  saving?: boolean
}

export function AddStakeholdersModal({
  isOpen,
  onClose,
  allWorkspaceStakeholders,
  userRoles,
  lawFirms,
  userPermissions,
  initialSelectedStakeholderIds,
  onSaveSelection,
  title = "Add Stakeholders to Note",
  saving = false
}: AddStakeholdersModalProps) {
  const [tempSelectedStakeholderIds, setTempSelectedStakeholderIds] = useState<string[]>([])

  // Reset temp selection when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 AddStakeholdersModal: Modal opened with allWorkspaceStakeholders:', allWorkspaceStakeholders)
      console.log('🔍 AddStakeholdersModal: Number of workspace stakeholders:', allWorkspaceStakeholders?.length || 0)
      console.log('🔍 AddStakeholdersModal: userRoles:', userRoles)
      console.log('🔍 AddStakeholdersModal: lawFirms:', lawFirms)
      console.log('🔍 AddStakeholdersModal: userPermissions:', userPermissions)
      setTempSelectedStakeholderIds([])
    }
  }, [isOpen])

  const handleToggleModalSelection = (stakeholderId: string) => {
    setTempSelectedStakeholderIds(prev =>
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    )
  }

  const handleSaveSelection = async () => {
    try {
      // Combine current stakeholders with newly selected ones
      const combinedStakeholderIds = [...new Set([...initialSelectedStakeholderIds, ...tempSelectedStakeholderIds])]
      await onSaveSelection(combinedStakeholderIds)
      onClose()
    } catch (error) {
      console.error('Error saving stakeholder selection:', error)
    }
  }

  const handleClose = () => {
    setTempSelectedStakeholderIds([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={handleClose}
              disabled={saving}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          {tempSelectedStakeholderIds.length > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {tempSelectedStakeholderIds.length} stakeholder{tempSelectedStakeholderIds.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <StakeholderSelectionTable
            stakeholders={allWorkspaceStakeholders}
            userRoles={userRoles}
            lawFirms={lawFirms}
            userPermissions={userPermissions}
            selectedStakeholderIds={tempSelectedStakeholderIds}
            onStakeholderToggle={handleToggleModalSelection}
          />
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          {tempSelectedStakeholderIds.length > 0 && (
            <button
             type="button"
              onClick={handleSaveSelection}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding...' : `Add to Note (${tempSelectedStakeholderIds.length})`}
            </button>
          )}
          <button
           type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}