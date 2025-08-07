import React, { useState } from 'react'
import { ArrowLeft, Calendar, Check, Users, Sparkles, Plus, Trash2, ExternalLink, CheckCircle, ClipboardList, X } from 'lucide-react'
import { CKEditorComponent } from '../CKEditorComponent'
import { StakeholderAvatar } from '../common/StakeholderAvatar'
import { AddStakeholdersModal } from '../common/AddStakeholdersModal'
import { TagThemeCard } from '../common/TagThemeCard'
import { NoteTemplateSelectionModal } from './NoteTemplateSelectionModal'
import type { Stakeholder, UserRole } from '../../lib/supabase'

interface NoteLink {
  name: string
  url: string
}

interface TaskData {
  name: string
  description: string
  status: 'not_complete' | 'complete' | 'no_longer_required'
  assignedToUserId?: string
}

interface NoteCreateFormProps {
  assignedStakeholders: Stakeholder[]
  allWorkspaceStakeholders: Stakeholder[]
  projectId: string
  projectAssignedStakeholderIds: string[]
  userRoles?: UserRole[]
  userPermissions?: UserPermission[]
  lawFirms?: LawFirm[]
  themes: Theme[]
  availableUsers?: WorkspaceUser[]
  noteTemplates: NoteTemplate[]
  onBack: () => void
  onAssignStakeholderToProject: (stakeholderId: string) => Promise<void>
  onThemeCreate: (theme: Theme) => void
  onCreate: (noteData: {
    name: string
    summary: string
    nativeNotes: string
    note_date: string
    stakeholderIds: string[]
    decision_text: string[]
    links: NoteLink[]
    tasks: TaskData[]
    themeIds: string[]
  }) => Promise<void>
}

export function NoteCreateForm({ 
  assignedStakeholders, 
  allWorkspaceStakeholders,
  projectId,
  projectAssignedStakeholderIds,
  userRoles, 
  userPermissions = [],
  lawFirms = [],
  themes,
  availableUsers = [],
  noteTemplates,
  onBack, 
  onAssignStakeholderToProject,
  onThemeCreate,
  onCreate 
}: NoteCreateFormProps) {
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedStakeholderIds, setSelectedStakeholderIds] = useState<string[]>([])
  const [decisionTexts, setDecisionTexts] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [links, setLinks] = useState<NoteLink[]>([{ name: '', url: '' }])
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [newTask, setNewTask] = useState<TaskData>({
    name: '',
    description: '',
    status: 'not_complete',
    assignedToUserId: undefined,
    projectId: projectId
  })
  const [showAddStakeholderModal, setShowAddStakeholderModal] = useState(false)
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return
    
    setSaving(true)
    try {
      await onCreate({
        name: name.trim(),
        summary,
        nativeNotes: '',
        note_date: noteDate,
        stakeholderIds: selectedStakeholderIds,
        decision_text: decisionTexts.filter(decision => decision.trim() !== ''),
        links: links.filter(link => link.name.trim() && link.url.trim()),
        tasks: tasks,
        themeIds: selectedThemes.map(theme => theme.id)
      })
      // After successful creation, go back to the notes dashboard
      onBack()
    } catch (error) {
      console.error('Error creating note:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleThemeAdd = (theme: Theme) => {
    if (!selectedThemes.some(t => t.id === theme.id)) {
      setSelectedThemes([...selectedThemes, theme])
    }
  }

  const handleThemeRemove = (themeId: string) => {
    setSelectedThemes(selectedThemes.filter(theme => theme.id !== themeId))
  }

  const handleTemplateSelected = (templateBody: string) => {
    if (templateBody.trim()) {
      // Add template content to existing summary with proper separation
      const separator = summary.trim() ? '<br><br>' : ''
      setSummary(summary + separator + templateBody)
    }
  }

  const toggleStakeholder = (stakeholderId: string) => {
    setSelectedStakeholderIds(prev =>
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    )
  }

  const addDecision = () => {
    setDecisionTexts([...decisionTexts, ''])
  }

  const removeDecision = (index: number) => {
    if (decisionTexts.length > 1) {
      setDecisionTexts(decisionTexts.filter((_, i) => i !== index))
    }
  }

  const updateDecision = (index: number, value: string) => {
    const newValues = [...decisionTexts]
    newValues[index] = value
    setDecisionTexts(newValues)
  }

  const addLink = () => {
    setLinks([...links, { name: '', url: '' }])
  }

  const removeLink = (index: number) => {
    if (links.length > 1) {
      setLinks(links.filter((_, i) => i !== index))
    }
  }

  const updateLink = (index: number, field: 'name' | 'url', value: string) => {
    const updatedLinks = [...links]
    updatedLinks[index][field] = value
    setLinks(updatedLinks)
  }

  const addTask = () => {
    if (!newTask.name.trim()) return
    
    setTasks([...tasks, { ...newTask }])
    setNewTask({
      name: '',
      description: '',
      status: 'not_complete',
      assignedToUserId: undefined
    })
  }

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  const updateNewTask = (field: keyof TaskData, value: string) => {
    setNewTask(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveStakeholderSelection = async (stakeholderIds: string[]) => {
    try {
      // Update the selected stakeholders for the note
      setSelectedStakeholderIds(stakeholderIds)
    } catch (error) {
      console.error('Error adding stakeholders to note:', error)
      throw error
    }
  }


  const isValidUrl = (url: string) => {
    if (!url.trim()) return true // Empty URLs are allowed
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="h-full flex flex-col w-full">
      <div className="bg-white border-b border-gray-200 p-6 -mx-6 -mt-6 mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Notes & Calls
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">Create New Note</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Note Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter note name..."
                required
              />
            </div>

            <div>
              <label htmlFor="noteDate" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="noteDate"
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {noteDate && (
                  <button
                    type="button"
                    onClick={() => setNoteDate('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Clear date"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">

          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Plus size={14} />
                  Add Note Template
                </button>
              </div>
              <CKEditorComponent
                value={summary}
                onChange={setSummary}
                placeholder="Enter summary..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Decisions ({decisionTexts.filter(d => d.trim() !== '').length})
            </h2>
          </div>
          
          <div className="space-y-3">
            {decisionTexts.map((decision, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={decision}
                  onChange={(e) => updateDecision(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter decision..."
                />
                {decisionTexts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDecision(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove decision"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addDecision}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Plus size={16} />
              Add Decision
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Associated Tasks ({tasks.length})
            </h2>
          </div>
          
          {/* Add New Task */}
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => updateNewTask('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task name..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newTask.status}
                  onChange={(e) => updateNewTask('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="not_complete">Not Complete</option>
                  <option value="complete">Complete</option>
                  <option value="no_longer_required">No Longer Required</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => updateNewTask('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter task description..."
              />
            </div>

            {availableUsers.length > 0 && (
              <div className="mt-4">
                <AssignUserCard
                  availableUsers={availableUsers}
                  selectedUser={availableUsers.find(u => u.user_id === newTask.assignedToUserId) || null}
                  onAssignUser={(user) => updateNewTask('assignedToUserId', user.user_id || '')}
                  onRemoveUser={() => updateNewTask('assignedToUserId', '')}
                />
              </div>
            )}
            
            <div className="mt-4">
              <button
                type="button"
                onClick={addTask}
                disabled={!newTask.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                Add Task
              </button>
            </div>
          </div>
          
          {/* Task List */}
          {tasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Tasks to be created:</h3>
              {tasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{task.name}</h4>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          task.status === 'complete' 
                            ? 'bg-green-100 text-green-700'
                            : task.status === 'no_longer_required'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {task.status === 'not_complete' ? 'Not Complete' : 
                           task.status === 'complete' ? 'Complete' : 'No Longer Required'}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600">{task.description}</p>
                      )}
                      {task.assignedToUserId && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Assigned to: </span>
                          <span className="text-xs font-medium text-blue-600">
                            {availableUsers.find(u => u.user_id === task.assignedToUserId)?.user_email || 'Unknown User'}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTask(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <TagThemeCard
          availableThemes={themes}
          selectedThemes={selectedThemes}
          onThemeAdd={handleThemeAdd}
          onThemeRemove={handleThemeRemove}
          onThemeCreate={onThemeCreate}
        />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
            Tagged Stakeholders ({selectedStakeholderIds.length})
            </h2>
            <button
             type="button"
              onClick={() => setShowAddStakeholderModal(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Plus size={14} />
              Add Stakeholders
            </button>
          </div>
          
          <div className="space-y-2 overflow-y-auto">
            {assignedStakeholders.map(stakeholder => {
              const isSelected = selectedStakeholderIds.includes(stakeholder.id)
              const userRole = userRoles?.find(role => role.id === stakeholder.user_role_id)
              
              return (
                <div
                  key={stakeholder.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleStakeholder(stakeholder.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StakeholderAvatar userRole={userRole} size="md" />
                      <div className="font-medium text-gray-900">{stakeholder.name}</div>
                    </div>
                    
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStakeholder(stakeholder.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Links ({links.filter(link => link.name.trim() && link.url.trim()).length})
          </h2>
          
          <div className="space-y-4">
            {links.map((link, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link Name
                    </label>
                    <input
                      type="text"
                      value={link.name}
                      onChange={(e) => updateLink(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter link name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(index, 'url', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          link.url && !isValidUrl(link.url) ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="https://example.com"
                      />
                      {links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove link"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {link.url && !isValidUrl(link.url) && (
                      <p className="text-sm text-red-600 mt-1">Please enter a valid URL</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addLink}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add Link
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4 mr-1" />
              {saving ? 'Creating...' : 'Create Note'}
            </button>
          </div>
        </div>
      </form>

      <AddStakeholdersModal
        isOpen={showAddStakeholderModal}
        onClose={() => setShowAddStakeholderModal(false)}
        allWorkspaceStakeholders={allWorkspaceStakeholders}
        userRoles={userRoles || []}
        lawFirms={lawFirms}
        userPermissions={userPermissions}
        initialSelectedStakeholderIds={selectedStakeholderIds}
        onSaveSelection={handleSaveStakeholderSelection}
        title="Add Stakeholders to Note"
      />

      <NoteTemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        noteTemplates={noteTemplates}
        onSelectTemplate={handleTemplateSelected}
      />
    </div>
  )
}