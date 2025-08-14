import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { updateResearchNote, getResearchNoteStakeholders, getNoteLinks, saveNoteLinks, getThemesForResearchNote, linkThemeToResearchNote, unlinkThemeFromResearchNote } from '../lib/database'
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
import { HistorySection } from './common/HistorySection'
import { getTasks, createTask, updateTask, deleteTask } from '../lib/database'
import { getResearchNoteComments, createResearchNoteComment, updateResearchNoteComment, deleteResearchNoteComment, type ResearchNoteComment } from '../lib/database/services/researchNoteCommentService'
import type { ResearchNote, Stakeholder, UserRole, LawFirm, NoteLink, Theme, WorkspaceUser, UserPermission, NoteTemplate, Task } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

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
  currentUser?: User | null
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
  currentUser,
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
  const [noteThemes, setNoteThemes] = useState<Theme[]>([])
  const [sharingToSlack, setSharingToSlack] = useState(false)
  const [slackShareStatus, setSlackShareStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // History panel state
  const [showHistory, setShowHistory] = useState(true)
  const [noteComments, setNoteComments] = useState<ResearchNoteComment[]>([])

  useEffect(() => {
    if (note && !isCreating) {
      loadNoteStakeholders()
      loadNoteLinks()
      loadNoteTasks()
      loadNoteThemes()
      loadNoteComments()
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
    
    try {
      const tasks = await getTasks(undefined, note.id)
      setNoteTasks(tasks)
    } catch (error) {
      console.error('Error loading note tasks:', error)
    }
  }

  const loadNoteComments = async () => {
    if (!note) return
    
    try {
      const comments = await getResearchNoteComments(note.id)
      setNoteComments(comments)
    } catch (error) {
      console.error('Error loading note comments:', error)
    }
  }

  const handleSaveBasicInfo = async (updates: { name: string; note_date: string }) => {
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

  const handleUpdateSummary = async (summary: string): Promise<ResearchNote | null> => {
    if (!note) return null
    
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

  const handleCreateTask = async (name: string, description: string, status: string, assignedToUserId?: string, userStoryId?: string) => {
    if (!note) return
    
    setSaving(true)
    try {
      console.log('Creating task with:', { projectId: note.project_id, name, description, status, researchNoteId: note.id })
      await createTask(
        note.project_id,
        name,
        description,
        status as 'not_complete' | 'complete' | 'no_longer_required',
        assignedToUserId,
        note.id, // researchNoteId
        userStoryId // userStoryId
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
      await updateTask(taskId, {
        ...updates,
        status: updates.status as 'not_complete' | 'complete' | 'no_longer_required' | undefined
      })
      
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

  // Comment handling functions
  const handleAddComment = async (commentText: string) => {
    if (!note || !currentUser) return
    
    setSaving(true)
    try {
      const newComment = await createResearchNoteComment(note.id, commentText, currentUser.id, false)
      if (newComment) {
        await loadNoteComments() // Reload to get fresh data
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleAddDecision = async (decisionText: string) => {
    if (!note || !currentUser) return
    
    setSaving(true)
    try {
      const newComment = await createResearchNoteComment(note.id, decisionText, currentUser.id, true)
      if (newComment) {
        await loadNoteComments() // Reload to get fresh data
      }
    } catch (error) {
      console.error('Error adding decision:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleEditComment = async (commentId: string, commentText: string) => {
    setSaving(true)
    try {
      const updatedComment = await updateResearchNoteComment(commentId, commentText)
      if (updatedComment) {
        await loadNoteComments() // Reload to get fresh data
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    setSaving(true)
    try {
      const success = await deleteResearchNoteComment(commentId)
      if (success) {
        await loadNoteComments() // Reload to get fresh data
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleEditDecision = async (decisionIndex: number, decisionText: string) => {
    setSaving(true)
    try {
      // Get the decision comments in chronological order
      const decisionComments = noteComments
        .filter(comment => comment.is_decision)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      if (decisionIndex < decisionComments.length) {
        const decisionToEdit = decisionComments[decisionIndex]
        const updatedComment = await updateResearchNoteComment(decisionToEdit.id, decisionText)
        if (updatedComment) {
          await loadNoteComments() // Reload to get fresh data
        }
      }
    } catch (error) {
      console.error('Error editing decision:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDecision = async (decisionIndex: number) => {
    setSaving(true)
    try {
      // Get the decision comments in chronological order
      const decisionComments = noteComments
        .filter(comment => comment.is_decision)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      if (decisionIndex < decisionComments.length) {
        const decisionToDelete = decisionComments[decisionIndex]
        const success = await deleteResearchNoteComment(decisionToDelete.id)
        if (success) {
          await loadNoteComments() // Reload to get fresh data
        }
      }
    } catch (error) {
      console.error('Error deleting decision:', error)
      throw error
    } finally {
      setSaving(false)
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
        projectId={note?.project_id || ''}
        userRoles={userRoles}
        userPermissions={userPermissions}
        lawFirms={lawFirms}
        themes={themes}
        noteTemplates={noteTemplates}
        availableUsers={availableUsers}
        onBack={onBack}
        onAssignStakeholderToProject={onAssignStakeholderToProject}
        onThemeCreate={onThemeCreate}
        onCreate={onCreateNote!}
      />
    )
  }

  if (!note) return null

  return (
    <div className="h-screen flex flex-col w-full relative">
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

      {/* Full-width page header */}
      <NoteHeader 
        note={note} 
        onBack={onBack} 
        onEdit={() => setShowEditModal(true)} 
        onShareToSlack={handleShareToSlack}
        sharingToSlack={sharingToSlack}
      />

      {/* Content with normal padding */}
      <div className="flex-1 w-full flex">
        <div className="flex-1 space-y-6 p-6">
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

        {/* History Column */}
        <HistorySection
          entityId={note.id}
          entityType="research note"
          comments={noteComments
            .filter(comment => !comment.is_decision)
            .map(comment => ({
              id: comment.id,
              user_id: comment.user_id,
              comment_text: comment.comment_text,
              created_at: comment.created_at,
              updated_at: comment.updated_at
            }))}
          decisions={noteComments
            .filter(comment => comment.is_decision)
            .map(comment => `${comment.created_at}|${comment.comment_text}`)}
          user={currentUser || null}
          allUsers={availableUsers}
          showHistory={showHistory}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onAddDecision={handleAddDecision}
          onEditDecision={handleEditDecision}
          onDeleteDecision={handleDeleteDecision}
          saving={saving}
        />
      </div>

      {/* Toggle History Button */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className={`absolute top-1/2 transform -translate-y-1/2 bg-blue-600 text-white z-50 transition-all duration-300 ease-in-out rounded-l-full rounded-r-none pr-1 pl-2 pt-2 pb-2 ${
          showHistory ? 'right-[384px]' : 'right-0'
        }`}
        title={showHistory ? 'Hide history' : 'Show history'}
      >
        {showHistory ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

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