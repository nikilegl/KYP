import React, { useEffect } from 'react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { RichTextDescription } from './DesignSystem/components/RichTextDescription'
import { Plus } from 'lucide-react'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import type { Project, LawFirm } from '../lib/supabase'

interface EditJourneyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  journeyName: string
  journeyDescription: string
  journeyStatus: 'personal' | 'shared'
  selectedProjectId: string
  selectedLawFirmIds: string[]
  lawFirmSearchQuery: string
  projects: Project[]
  lawFirms: LawFirm[]
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onStatusChange: (status: 'personal' | 'shared') => void
  onProjectChange: (projectId: string) => void
  onLawFirmSearchChange: (query: string) => void
  onLawFirmToggle: (firmId: string, checked: boolean) => void
  onAddLawFirmClick: () => void
  saveDisabled?: boolean
  isCreating?: boolean // If true, shows "Create User Journey" title and "Create Journey" button
}

export function EditJourneyModal({
  isOpen,
  onClose,
  onSave,
  journeyName,
  journeyDescription,
  journeyStatus,
  selectedProjectId,
  selectedLawFirmIds,
  lawFirmSearchQuery,
  projects,
  lawFirms,
  onNameChange,
  onDescriptionChange,
  onStatusChange,
  onProjectChange,
  onLawFirmSearchChange,
  onLawFirmToggle,
  onAddLawFirmClick,
  saveDisabled = false,
  isCreating = false
}: EditJourneyModalProps) {
  // Handle Enter key to trigger Save Details
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Enter is pressed and journey name is not empty
      if (event.key === 'Enter' && journeyName.trim() && !saveDisabled) {
        // Don't trigger if user is typing in a textarea or input field
        // (textarea for newlines, input for emoji autocomplete)
        const target = event.target as HTMLElement
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
          return
        }
        
        event.preventDefault()
        onSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, journeyName, saveDisabled, onSave])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCreating ? "Create User Journey" : "Edit Journey Details"}
      size="md"
      closeOnOverlayClick={false}
      footerContent={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={saveDisabled || !journeyName.trim()}
          >
            {isCreating ? "Create Journey" : "Save Details"}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Journey Name * <span className="text-xs text-gray-500 font-normal">(Type : for emojis)</span>
          </label>
          <EmojiAutocomplete
            value={journeyName}
            onChange={onNameChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter journey name"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <RichTextDescription
            value={journeyDescription}
            onChange={onDescriptionChange}
            placeholder="Optional description (use Link button to add hyperlinks)"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Share to make this journey accessible to everyone in Legl
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={journeyStatus === 'shared'}
                onChange={(e) => onStatusChange(e.target.checked ? 'shared' : 'personal')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {journeyStatus === 'shared' ? 'Shared' : 'Personal'}
            </span>
          </label>
        </div>
      </div>
    </Modal>
  )
}

