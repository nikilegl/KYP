import React, { useState, useEffect } from 'react'
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { updateResearchNote, getResearchNoteStakeholders, getNoteLinks, saveNoteLinks, getThemes, getThemesForResearchNote, linkThemeToResearchNote, unlinkThemeFromResearchNote } from '../lib/database'
import { NoteHeader } from './NoteDetail/NoteHeader'
import { NoteStakeholdersSection } from './NoteDetail/NoteStakeholdersSection'
import { NoteEditModal } from './NoteDetail/NoteEditModal'
import { NoteCreateForm } from './NoteDetail/NoteCreateForm'
import { NoteContentTabs } from './NoteDetail/NoteContentTabs'
import { LinksSection } from './common/LinksSection'
import { DecisionSection } from './common/DecisionSection'
import { NoteLinkedDesigns } from './NoteDetail/NoteLinkedAssets'
import { TasksSection } from './TasksSection'
import { TagThemeCard } from './common/TagThemeCard'
import { getTasks, createTask, updateTask, deleteTask } from '../lib/database'
import type { ResearchNote, Stakeholder, UserRole, LawFirm, NoteLink, Theme } from '../lib/supabase'

interface NoteDetailProps {
  note: ResearchNote | null
  assignedStakeholders: Stakeholder[]
  allWorkspaceStakeholders: Stakeholder[]
  projectAssignedStakeholderIds: string[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  themes: Theme[]
  noteTemplates?: NoteTemplate[]
  availableUsers?: WorkspaceUser[]
  onBack: () => void
  onUpdate: (updatedNote: ResearchNote, updatedStakeholderIds?: string[]) => void
  onAssignStakeholderToProject: (stakeholderId: string) => Promise<void>
  onRemoveStakeholderFromNoteAndConditionallyProject: (stakeholderId: string, noteId: string) => Promise<void>
  onThemeCreate: (theme: Theme) => void
  onCreateNote?: (noteData: {
    name: string
    summary: string
    nativeNotes: string
    note_date: string
    stakeholderIds: string[]
    decision_text: string[]
    links: { name: string; url: string }[]
    tasks: Array<{
      name: string
      description: string
      status: 'not_complete' | 'complete' | 'no_longer_required'
    }>
    themeIds: string[]
  }) => Promise<void>
  isCreating?: boolean
}

export function NoteDetail({ 
  note, 
  assignedStakeholders, 
  allWorkspaceStakeholders,
  projectAssignedStakeholderIds,
  userRoles, 
  lawFirms, 
  userPermissions,
  themes,
  noteTemplates = [],
  availableUsers = [],
  onBack, 
  onUpdate,
  onAssignStakeholderToProject,
  onRemoveStakeholderFromNoteAndConditionallyProject,
  onThemeCreate,
  onCreateNote,
  isCreating = false
}: NoteDetailProps) {
  const [noteStakeholderIds, setNoteStakeholderIds] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noteLinks, setNoteLinks] = useState<NoteLink[]>([])
  const [noteTasks, setNoteTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [noteThemes, setNoteThemes] = useState<Theme[]>([])
  const [sharingToSlack, setSharingToSlack] = useState(false)
  const [slackShareStatus, setSlackShareStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    if (note && !isCreating) {
      loadNoteStakeholders()
      loadNoteLinks()
      loadNoteTasks()
      loadNoteThemes()
    }
  }, [note, isCreating])

  const loadNoteStakeholders = async () => {
    if (!note) return
    
    try {
      const stakeholderIds = await getResearchNoteStakeholders(note.id)
      setNoteStakeholderIds(stakeholderIds)
    } catch (error) {
      console.error('Error loading note stakeholders:', error)
    }
  }

  const loadNoteLinks = async () => {
    if (!note) return
    
    try {
      const links = await getNoteLinks(note.id)
      setNoteLinks(links)
    } catch (error) {
      console.error('Error loading note links:', error)
    }
  }

  const loadNoteThemes = async () => {
    if (!note) return
    
    try {
      const themes = await getThemesForResearchNote(note.id)
      setNoteThemes(themes)
    } catch (error) {
      console.error('Error loading note themes:', error)
    }
  }

  const loadNoteTasks = async () => {
    if (!note) return
    
    setLoadingTasks(true)
    try {
      const tasks = await getTasks(undefined, note.id)
      setNoteTasks(tasks)
    } catch (error) {
      console.error('Error loading note tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleSaveBasicInfo = async (updates: { name: string; note_date: string; is_decision: boolean }) => {
    if (!note) return
    
    console.log('🔵 NoteDetail: handleSaveBasicInfo called with updates:', updates)
    console.log('🔵 NoteDetail: Current note before update:', note)
    
    setSaving(true)
    try {
      const updatedNote = await updateResearchNote(
        note.id,
        updates,
        noteStakeholderIds,
        noteThemes.map(t => t.id)
      )
      
      console.log('🔵 NoteDetail: updateResearchNote returned:', updatedNote)
      
      if (updatedNote) {
        console.log('✅ NoteDetail: Calling onUpdate with updated note:', updatedNote)
        onUpdate(updatedNote)
      } else {
        console.error('❌ NoteDetail: updateResearchNote returned null')
      }
    } catch (error) {
      console.error('Error updating note basic info:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDecision = async (decisionTexts: string[]) => {
    if (!note) return
    
    setSaving(true)
    try {
      const updatedNote = await updateResearchNote(
        note.id,
        { decision_text: decisionTexts },
        noteStakeholderIds,
        noteThemes.map(t => t.id)
      )
      
      if (updatedNote) {
        onUpdate(updatedNote)
      }
    } catch (error) {
      console.error('Error updating decision:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSummary = async (summary: string) => {
    if (!note) return
    
    setSaving(true)
    try {
      const updatedNote = await updateResearchNote(
        note.id,
        { summary },
        noteStakeholderIds,
        noteThemes.map(t => t.id)
      )
      
      if (updatedNote) {
        onUpdate(updatedNote)
        return updatedNote
      }
      return null
    } catch (error) {
      console.error('Error updating summary:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStakeholders = async (stakeholderIds: string[]) => {
    if (!note) return
    
    console.log('🔵 NoteDetail: handleSaveStakeholders called with stakeholderIds:', stakeholderIds)
    console.log('🔵 NoteDetail: Current note ID:', note.id)
    console.log('🔵 NoteDetail: Current noteStakeholderIds state:', noteStakeholderIds)
    
    setSaving(true)
    try {
      const updatedNote = await updateResearchNote(
        note.id,
        {},
        stakeholderIds,
        noteThemes.map(t => t.id)
      )
      
      console.log('🔵 NoteDetail: updateResearchNote returned:', updatedNote)
      
      if (updatedNote) {
        console.log('✅ NoteDetail: Setting noteStakeholderIds to:', stakeholderIds)
        setNoteStakeholderIds(stakeholderIds)
        onUpdate(updatedNote, stakeholderIds)
      } else {
        console.error('❌ NoteDetail: updateResearchNote returned null/undefined')
      }
    } catch (error) {
      console.error('❌ NoteDetail: Error in handleSaveStakeholders:', error)
      console.error('Error updating stakeholders:', error)
    } finally {
      console.log('🔵 NoteDetail: Setting saving to false')
      setSaving(false)
    }
  }

  const handleSaveLinks = async (links: Array<{ id?: string; name: string; url: string }>) => {
    if (!note) return
    
    setSaving(true)
    try {
      await saveNoteLinks(note.id, links)
      
      // Reload links to get updated data with IDs
      await loadNoteLinks()
    } catch (error) {
      console.error('Error saving links:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTask = async (name: string, description: string, status: string, assignedToUserId?: string) => {
    if (!note) return
    
    setSaving(true)
    try {
      console.log('Creating task with:', { projectId: note.project_id, name, description, status, researchNoteId: note.id })
      await createTask(
        note.project_id,
        name,
        description,
        status,
        assignedToUserId,
        note.id, // researchNoteId
        undefined // userStoryId
      )
      
      // Reload tasks to show the new task
      await loadNoteTasks()
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task. Please try again.')
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: { name?: string; description?: string; status?: string }) => {
    setSaving(true)
    try {
      await updateTask(taskId, updates)
      
      // Reload tasks to show the updated task
      await loadNoteTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    setSaving(true)
    try {
      await deleteTask(taskId)
      
      // Reload tasks to remove the deleted task
      await loadNoteTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleThemeAdd = async (theme: Theme) => {
    if (!note) return
    
    try {
      await linkThemeToResearchNote(theme.id, note.id)
      setNoteThemes([...noteThemes, theme])
    } catch (error) {
      console.error('Error linking theme to note:', error)
    }
  }

  const handleThemeRemove = async (themeId: string) => {
    if (!note) return
    
    try {
      await unlinkThemeFromResearchNote(themeId, note.id)
      setNoteThemes(noteThemes.filter(theme => theme.id !== themeId))
    } catch (error) {
      console.error('Error unlinking theme from note:', error)
    }
  }

  const handleShareToSlack = async () => {
    if (!note || !supabase) return
    
    setSharingToSlack(true)
    setSlackShareStatus(null)
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setSlackShareStatus({ type: 'error', message: 'You must be logged in to share notes' })
        return
      }

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('send-note-to-slack', {
        body: { noteId: note.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) {
        console.error('Edge function error:', error)
        console.error('Edge function error details:', error);
        throw new Error(error.message || 'Failed to share note to Slack');
      } else if (data.error) {
        setSlackShareStatus({ type: 'error', message: data.error })
      } else {
        setSlackShareStatus({ type: 'success', message: 'Shared successfully' })
        // Clear success message after 5 seconds
        setTimeout(() => setSlackShareStatus(null), 5000)
      }
    } catch (error) {
      console.error('Error sharing to Slack:', error)
      setSlackShareStatus({ 
        type: 'error', 
        message: 'An unexpected error occurred while sharing to Slack' 
      })
    } finally {
      setSharingToSlack(false)
    }
  }

  // Handle creation mode
  if (isCreating) {
    return (
      <NoteCreateForm
        assignedStakeholders={assignedStakeholders}
        allWorkspaceStakeholders={allWorkspaceStakeholders}
        projectAssignedStakeholderIds={projectAssignedStakeholderIds}
        userRoles={userRoles}
        userPermissions={userPermissions}
        lawFirms={lawFirms}
        themes={themes}
        noteTemplates={noteTemplates}
        onBack={onBack}
        onAssignStakeholderToProject={onAssignStakeholderToProject}
        onThemeCreate={onThemeCreate}
        onCreate={onCreateNote!}
      />
    )
  }

  if (!note) return null

  return (
    <div className="h-full flex flex-col w-full">
      {/* Slack Share Status */}
      {slackShareStatus && (
        <div className={`p-4 rounded-lg border absolute z-100 w-[240px] ${
          slackShareStatus.type === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {slackShareStatus.type === 'success' ? (
              <CheckCircle size={20} className="text-green-600" />
            ) : (
              <AlertCircle size={20} className="text-red-600" />
            )}
            <p className={`text-sm font-medium ${
              slackShareStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {slackShareStatus.message}
            </p>
          </div>
        </div>
      )}

      <NoteHeader 
        note={note} 
        onBack={onBack} 
        onEdit={() => setShowEditModal(true)} 
        onShareToSlack={handleShareToSlack}
        sharingToSlack={sharingToSlack}
      />

      <div className="flex-1 overflow-y-auto w-full space-y-6">
        <NoteContentTabs
          key={`${note.id}-${note.summary || ''}`}
          note={note}
          onUpdateSummary={handleUpdateSummary}
          saving={saving}
        />

        <DecisionSection
          entity={note}
          onSave={handleUpdateDecision}
          saving={saving}
        />

        <TagThemeCard
          availableThemes={themes}
          selectedThemes={noteThemes}
          onThemeAdd={handleThemeAdd}
          onThemeRemove={handleThemeRemove}
          onThemeCreate={onThemeCreate}
        />

        <NoteStakeholdersSection
          assignedStakeholders={assignedStakeholders}
          allWorkspaceStakeholders={allWorkspaceStakeholders}
          noteStakeholderIds={noteStakeholderIds}
          noteId={note.id}
          projectAssignedStakeholderIds={projectAssignedStakeholderIds}
          userRoles={userRoles}
          userPermissions={userPermissions}
          lawFirms={lawFirms}
          onSave={handleSaveStakeholders}
          onAssignStakeholderToProject={onAssignStakeholderToProject}
          onRemoveStakeholderFromNoteAndConditionallyProject={onRemoveStakeholderFromNoteAndConditionallyProject}
          saving={saving}
        />

        <LinksSection
          entityId={note.id}
          entityType="note"
          links={noteLinks}
          onSaveLinks={handleSaveLinks}
          saving={saving}
        />

        <NoteLinkedDesigns
          researchNoteId={note.id}
          projectId={note.project_id}
        />

        <TasksSection
          researchNoteId={note.id}
          tasks={noteTasks}
          availableUsers={availableUsers}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          saving={saving}
        />
      </div>

      {showEditModal && (
        <NoteEditModal
          note={note}
          onSave={handleSaveBasicInfo}
          onClose={() => setShowEditModal(false)}
          saving={saving}
        />
      )}
    </div>
  )
}