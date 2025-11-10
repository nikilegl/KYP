import React, { useEffect } from 'react'
import { Modal } from './DesignSystem/components/Modal'
import { Button } from './DesignSystem/components/Button'
import { Plus } from 'lucide-react'
import type { Project, LawFirm } from '../lib/supabase'

interface EditJourneyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  journeyName: string
  journeyDescription: string
  journeyLayout: 'vertical' | 'horizontal'
  journeyStatus: 'draft' | 'published'
  selectedProjectId: string
  selectedLawFirmIds: string[]
  lawFirmSearchQuery: string
  projects: Project[]
  lawFirms: LawFirm[]
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onLayoutChange: (layout: 'vertical' | 'horizontal') => void
  onStatusChange: (status: 'draft' | 'published') => void
  onProjectChange: (projectId: string) => void
  onLawFirmSearchChange: (query: string) => void
  onLawFirmToggle: (firmId: string, checked: boolean) => void
  onAddLawFirmClick: () => void
  saveDisabled?: boolean
}

export function EditJourneyModal({
  isOpen,
  onClose,
  onSave,
  journeyName,
  journeyDescription,
  journeyLayout,
  journeyStatus,
  selectedProjectId,
  selectedLawFirmIds,
  lawFirmSearchQuery,
  projects,
  lawFirms,
  onNameChange,
  onDescriptionChange,
  onLayoutChange,
  onStatusChange,
  onProjectChange,
  onLawFirmSearchChange,
  onLawFirmToggle,
  onAddLawFirmClick,
  saveDisabled = false
}: EditJourneyModalProps) {
  const filteredLawFirms = lawFirms.filter(firm =>
    lawFirmSearchQuery.trim() === '' ||
    firm.name.toLowerCase().includes(lawFirmSearchQuery.toLowerCase())
  )

  // Handle Enter key to trigger Save Details
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Enter is pressed and journey name is not empty
      if (event.key === 'Enter' && journeyName.trim() && !saveDisabled) {
        // Don't trigger if user is typing in a textarea (they might want to add a newline)
        const target = event.target as HTMLElement
        if (target.tagName === 'TEXTAREA') {
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
      title="Edit Journey Details"
      size="md"
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
            Save Details
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Journey Name *
          </label>
          <input
            type="text"
            value={journeyName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter journey name"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={journeyDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Layout
          </label>
          <select
            value={journeyLayout}
            onChange={(e) => onLayoutChange(e.target.value as 'vertical' | 'horizontal')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="vertical">Vertical (Top to Bottom)</option>
            <option value="horizontal">Horizontal (Left to Right)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={journeyStatus}
            onChange={(e) => onStatusChange(e.target.value as 'draft' | 'published')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="draft">Draft (Only visible to you)</option>
            <option value="published">Published (Visible to all workspace members)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Epic
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No Epic</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Law Firms
          </label>
          <input
            type="text"
            value={lawFirmSearchQuery}
            onChange={(e) => onLawFirmSearchChange(e.target.value)}
            placeholder="Search law firms..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
          />
          <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
            {filteredLawFirms.map(firm => (
              <label
                key={firm.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedLawFirmIds.includes(firm.id)}
                  onChange={(e) => onLawFirmToggle(firm.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{firm.name}</span>
              </label>
            ))}
            {filteredLawFirms.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-gray-500 mb-2">No law firms found</p>
                <Button
                  variant="outline"
                  size="small"
                  icon={Plus}
                  onClick={onAddLawFirmClick}
                >
                  Add Law Firm
                </Button>
              </div>
            )}
          </div>
          {selectedLawFirmIds.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedLawFirmIds.length} law firm{selectedLawFirmIds.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

