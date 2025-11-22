import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Plus, X, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { updateResearchNote, getResearchNoteStakeholders, getNoteLinks, saveNoteLinks } from '../lib/database'
import { NoteHeader } from './NoteDetail/NoteHeader'
import { NoteStakeholdersSection } from './NoteDetail/NoteStakeholdersSection'
import { NoteEditModal } from './NoteDetail/NoteEditModal'
import { NoteCreateForm } from './NoteDetail/NoteCreateForm'
import { NoteContentTabs } from './NoteDetail/NoteContentTabs'
import { LinksSection } from './common/LinksSection'
import { NoteLinkedDesigns } from './NoteDetail/NoteLinkedAssets'
import { TasksSection } from './TasksSection'
import { HistorySection } from './common/HistorySection'
import { TaskForm, type TaskData } from './common/TaskForm'
import { AddLinkModal } from './common/AddLinkModal'
import { getTasks, createTask, updateTask, deleteTask, getAssetsForResearchNote as getDesignsForResearchNote } from '../lib/database'
import { getResearchNoteComments, createResearchNoteComment, updateResearchNoteComment, deleteResearchNoteComment, type ResearchNoteComment } from '../lib/database/services/researchNoteCommentService'
import type { ResearchNote, Stakeholder, UserRole, LawFirm, NoteLink, WorkspaceUser, UserPermission, NoteTemplate, Task, Design } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface NoteDetailProps {
  note: ResearchNote | null
  assignedStakeholders: Stakeholder[]
  allWorkspaceStakeholders: Stakeholder[]
  projectAssignedStakeholderIds: string[]
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  noteTemplates?: NoteTemplate[]
  availableUsers?: WorkspaceUser[]
  currentUser?: User | null
  projectId?: string
  onBack: () => void
  onUpdate: (updatedNote: ResearchNote, updatedStakeholderIds?: string[]) => void
  onAssignStakeholderToProject: (stakeholderId: string) => Promise<void>
  onRemoveStakeholderFromNoteAndConditionallyProject: (stakeholderId: string, noteId: string) => Promise<void>
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
      assignedToUserId?: string
    }>
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
  noteTemplates = [],
  availableUsers = [],
  currentUser,
  projectId,
  onBack, 
  onUpdate,
  onAssignStakeholderToProject,
  onRemoveStakeholderFromNoteAndConditionallyProject,
  onCreateNote,
  isCreating = false
}: NoteDetailProps) {
  const [noteStakeholderIds, setNoteStakeholderIds] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localNote, setLocalNote] = useState<ResearchNote | null>(note)
  const [noteLinks, setNoteLinks] = useState<NoteLink[]>([])
  const [noteTasks, setNoteTasks] = useState<Task[]>([])
  const [linkedDesigns, setLinkedDesigns] = useState<Design[]>([])
  const [sharingToSlack, setSharingToSlack] = useState(false)
  const [slackShareStatus, setSlackShareStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // History panel state
  const [showHistory, setShowHistory] = useState(true)
  const [noteComments, setNoteComments] = useState<ResearchNoteComment[]>([])
  
  // Create task modal state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  
  // Add link modal state
  const [showAddLinkModal, setShowAddLinkModal] = useState(false)
  
  // Add design link modal state  
  const [showAddDesignLinkModal, setShowAddDesignLinkModal] = useState(false)

  useEffect(() => {
    if (note && !isCreating) {
      loadNoteStakeholders()
      loadNoteLinks()
      loadNoteTasks()
      loadNoteComments()
      loadLinkedDesigns()
    }
  }, [note, isCreating])

  // Update localNote when note prop changes
  useEffect(() => {
    setLocalNote(note)
  }, [note])
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

  const loadLinkedDesigns = async () => {
    if (!note) return
    
    try {
      const designs = await getDesignsForResearchNote(note.id)
      setLinkedDesigns(designs)
    } catch (error) {
      console.error('Error loading linked designs:', error)
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
        []
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
        []
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

  const handleCreateTaskFromButton = async (taskData: TaskData) => {
    try {
      await handleCreateTask(
        taskData.name,
        taskData.description,
        taskData.status,
        taskData.assignedToUserId
      )
      setShowCreateTaskModal(false)
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const handleAddNewLink = async (name: string, url: string) => {
    try {
      // Create new link and combine with existing links
      const newLink = { name, url }
      const updatedLinks = [...noteLinks.map(link => ({ ...link })), newLink]
      await handleSaveLinks(updatedLinks)
      setShowAddLinkModal(false)
    } catch (error) {
      console.error('Error adding new link:', error)
      throw error
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

  // Comment handling functions
  const handleAddComment = async (commentText: string) => {
    if (!note || !currentUser) return
    
    setSaving(true)
    try {
      const newComment = await createResearchNoteComment(note.id, commentText, currentUser.id, false)
      if (newComment) {
        setNoteComments([newComment, ...noteComments])
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleAddDecision = async (decisionText: string) => {
    if (!localNote) return
    
    setSaving(true)
    try {
      const currentDecisions = localNote.decision_text || []
      // Create a decision with timestamp like in UserStoryDetail and AssetDetail
      const newDecisionWithTimestamp = `${new Date().toISOString()}|${decisionText}`
      const updatedDecisions = [...currentDecisions, newDecisionWithTimestamp]
      
      // Update local state immediately for UI responsiveness
      const updatedNote = { ...localNote, decision_text: updatedDecisions }
      setLocalNote(updatedNote)
      
      // Update the note in the database
      const savedNote = await updateResearchNote(localNote.id, {
        decision_text: updatedDecisions
      })
      
      if (savedNote) {
        onUpdate(savedNote, noteStakeholderIds)
      }
    } catch (error) {
      console.error('Error adding decision:', error)
      // Revert local state on error
      setLocalNote(localNote)
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
        setNoteComments(noteComments.map(comment => 
          comment.id === commentId ? updatedComment : comment
        ))
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
        setNoteComments(noteComments.filter(comment => comment.id !== commentId))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleEditDecision = async (decisionIndex: number, decisionText: string) => {
    if (!localNote) return
    
    setSaving(true)
    try {
      const currentDecisions = localNote.decision_text || []
      const updatedDecisions = [...currentDecisions]
      
      // Extract the original timestamp if it exists, otherwise use current time
      const originalDecision = updatedDecisions[decisionIndex]
      const timestampMatch = originalDecision?.match(/^(.+?)\|(.+)$/)
      const originalTimestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString()
      
      // Preserve the original timestamp but update the text
      updatedDecisions[decisionIndex] = `${originalTimestamp}|${decisionText}`
      
      // Update local state immediately for UI responsiveness
      const updatedNote = { ...localNote, decision_text: updatedDecisions }
      setLocalNote(updatedNote)
      
      const savedNote = await updateResearchNote(localNote.id, {
        decision_text: updatedDecisions
      })
      
      if (savedNote) {
        onUpdate(savedNote, noteStakeholderIds)
      }
    } catch (error) {
      console.error('Error editing decision:', error)
      // Revert local state on error
      setLocalNote(localNote)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDecision = async (decisionIndex: number) => {
    if (!localNote) return
    
    setSaving(true)
    try {
      const currentDecisions = localNote.decision_text || []
      const updatedDecisions = currentDecisions.filter((_, index) => index !== decisionIndex)
      
      // Update local state immediately for UI responsiveness
      const updatedNote = { ...localNote, decision_text: updatedDecisions }
      setLocalNote(updatedNote)
      
      const savedNote = await updateResearchNote(localNote.id, {
        decision_text: updatedDecisions
      })
      
      if (savedNote) {
        onUpdate(savedNote, noteStakeholderIds)
      }
    } catch (error) {
      console.error('Error deleting decision:', error)
      // Revert local state on error
      setLocalNote(localNote)
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
      <div className="h-screen flex flex-col w-full">
        <div className="flex-1 p-6 overflow-y-auto">
          <NoteCreateForm
            assignedStakeholders={assignedStakeholders}
            allWorkspaceStakeholders={allWorkspaceStakeholders}
            projectAssignedStakeholderIds={projectAssignedStakeholderIds}
            projectId={projectId || note?.project_id || ''}
            userRoles={userRoles}
            userPermissions={userPermissions}
            lawFirms={lawFirms}
            noteTemplates={noteTemplates}
            availableUsers={availableUsers}
            onBack={onBack}
            onAssignStakeholderToProject={onAssignStakeholderToProject}
            onCreate={onCreateNote!}
          />
        </div>
      </div>
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

          {noteLinks.length > 0 && (
            <LinksSection
              entityId={note.id}
              entityType="note"
              links={noteLinks}
              onSaveLinks={handleSaveLinks}
              saving={saving}
            />
          )}

          <NoteLinkedDesigns
            researchNoteId={note.id}
            projectId={note.project_id}
            linkedDesigns={linkedDesigns}
            onLinkedDesignsChange={setLinkedDesigns}
            showLinkModal={showAddDesignLinkModal}
            onShowLinkModal={setShowAddDesignLinkModal}
          />

          {noteTasks.length > 0 && (
            <TasksSection
              researchNoteId={note.id}
              tasks={noteTasks}
              availableUsers={availableUsers}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              saving={saving}
            />
          )}

          {/* Unified Action Buttons Row */}
          {(noteLinks.length === 0 || noteTasks.length === 0 || linkedDesigns.length === 0) && (
            <div className="flex items-center gap-4">
              {noteLinks.length === 0 && (
                <button
                  onClick={() => setShowAddLinkModal(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Link
                </button>
              )}
              
              {noteTasks.length === 0 && (
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Plus size={16} />
                  Create Tasks
                </button>
              )}

              {linkedDesigns.length === 0 && (
                <button
                  onClick={() => setShowAddDesignLinkModal(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Design Link
                </button>
              )}

            </div>
          )}
        </div>

        {/* History Column */}
        <HistorySection
          entityId={note.id}
          entityType="research note"
          comments={noteComments
            .filter(comment => !comment.is_decision) // Only show regular comments, not decisions
            .map(comment => ({
              id: comment.id,
              user_id: comment.user_id,
              comment_text: comment.comment_text,
              created_at: comment.created_at,
              updated_at: comment.updated_at
            }))}
          decisions={localNote?.decision_text || []}
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

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Task</h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <TaskForm
                availableUsers={availableUsers}
                initialTaskData={{ projectId: note.project_id }}
                onSubmit={handleCreateTaskFromButton}
                onCancel={() => setShowCreateTaskModal(false)}
                loading={saving}
                isEditing={false}
                isInsideModal={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      <AddLinkModal
        isOpen={showAddLinkModal}
        onClose={() => setShowAddLinkModal(false)}
        onSaveLink={handleAddNewLink}
      />

    </div>
  )
}