import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Loader2, 
  FolderOpen, 
  AlertTriangle, 
  Building2,
  Workflow, 
  UserCheck, 
  UserPlus, 
  LogOut,
  Users,
  FileText,
  Zap,
  BookOpen,
  Palette,
  Clipboard,
  CheckSquare,
  Clock
} from 'lucide-react'
import { ProjectOverview } from '../ProjectOverview'

import { AssignedStakeholders } from '../AssignedStakeholders'
import { ResearchNotesSection } from '../ResearchNotesSection'
import { PromptBuilderSection } from '../PromptBuilderSection'
import { UserStoriesSection } from '../UserStoriesSection'
import { StakeholderDetail } from '../StakeholderDetail'
import { UserStoryDetail } from '../UserStoryDetail'
import { NoteDetail } from '../NoteDetail'
import { DesignsSection } from '../AssetsSection'
import { AssetDetail } from '../AssetDetail'
import { ProjectTaskManager } from '../ProjectTaskManager'
import { ProjectProgressSection } from '../ProjectProgressSection'
import { DecisionHistory } from '../DecisionHistory'
import type { 
  Project, 
  Stakeholder, 
  ResearchNote, 
  ProblemOverview, 
  UserRole, 
  LawFirm, 
  UserStory, 
  Theme, 
  WorkspaceUser,
  UserPermission,
  NoteTemplate,
  ProjectProgressStatus,
  Task,
  Design,
  UserStoryComment
} from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface ProjectViewRendererProps {
  project: Project
  initialSelectedNote?: ResearchNote | null
  initialView?: string
  initialSelectedUserStory?: UserStory | null
  initialUserStoryRoleIds?: string[]
  initialSelectedDesign?: Design | null
  workspaceUsers: WorkspaceUser[]
  user: User | null
  userStoryComments: UserStoryComment[]
  onBack: () => void
  onNavigateToWorkspace?: (view: string) => void
  onSignOut?: () => void
  loading: boolean
  
  // Data
  allStakeholders: Stakeholder[]
  userRoles: UserRole[]
  userPermissions: UserPermission[]
  lawFirms: LawFirm[]
  assignedStakeholders: string[]
  memoizedAssignedStakeholders: Stakeholder[]
  getUnassignedStakeholders: () => Stakeholder[]
  notes: ResearchNote[]
  userStories: UserStory[]
  storyRoles: Record<string, string[]>
  themes: Theme[]
  noteTemplates: NoteTemplate[]
  problemOverview: ProblemOverview
  noteStakeholders: Record<string, string[]>
  projectTasks: Task[]
  allProjectProgressStatus: ProjectProgressStatus[]
  
  // Handlers
  onProblemOverviewChange: (updates: Partial<ProblemOverview>) => void
  onSaveProblemOverview: (updates?: Partial<ProblemOverview>) => Promise<void>
  onAssignStakeholder: (stakeholderId: string) => Promise<void>
  onRemoveStakeholder: (stakeholderId: string) => Promise<void>
  onRemoveStakeholderFromNoteAndConditionallyProject: (stakeholderId: string, noteId: string) => Promise<void>
  onCreateNote: (noteData: {
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
    themeIds: string[]
  }) => Promise<void>
  onThemeCreate: (theme: Theme) => void
  onUpdateNote: (updatedNote: ResearchNote, updatedStakeholderIds?: string[]) => void
  onDeleteNote: (noteId: string) => Promise<void>
  onAddUserStoryComment: (userStoryId: string, commentText: string) => Promise<void>
  onEditUserStoryComment: (commentId: string, commentText: string) => Promise<void>
  onDeleteUserStoryComment: (commentId: string) => Promise<void>
  onCreateUserStory: (storyData: {
    name: string
    reason?: string
    description: string
    estimatedComplexity: number
    priorityRating: string
    user_permission_id?: string
    assignedToUserId?: string
    roleIds?: string[]
    themeIds?: string[]
    status?: string
  }) => Promise<void>
  onUpdateUserStory: (storyId: string, updates: Partial<UserStory>, updatedRoleIds?: string[]) => Promise<void>
  onDeleteUserStory: (storyId: string) => Promise<void>
  onStoriesReordered: () => Promise<void>
  onCreateTask: (name: string, description: string, status: string, assignedToUserId?: string, userStoryId?: string) => Promise<void>
  onUpdateTask: (taskId: string, updates: { name?: string; description?: string; status?: string; assigned_to_user_id?: string; user_story_id?: string }) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
}

export function ProjectViewRenderer({
  project,
  initialSelectedNote = null,
  initialView = 'dashboard',
  initialSelectedUserStory = null,
  initialUserStoryRoleIds = [],
  initialSelectedDesign = null,
  workspaceUsers,
  user,
  userStoryComments,
  onBack,
  onNavigateToWorkspace,
  onSignOut,
  loading,
  allStakeholders,
  userRoles,
  userPermissions,
  lawFirms,
  assignedStakeholders,
  memoizedAssignedStakeholders,
  getUnassignedStakeholders,
  notes,
  userStories,
  storyRoles,
  themes,
  noteTemplates,
  problemOverview,
  noteStakeholders,
  projectTasks,
  allProjectProgressStatus,
  onProblemOverviewChange,
  onSaveProblemOverview,
  onAssignStakeholder,
  onRemoveStakeholder,
  onRemoveStakeholderFromNoteAndConditionallyProject,
  onCreateNote,
  onThemeCreate,
  onUpdateNote,
  onDeleteNote,
  onAddUserStoryComment,
  onEditUserStoryComment,
  onDeleteUserStoryComment,
  onCreateUserStory,
  onUpdateUserStory,
  onDeleteUserStory,
  onStoriesReordered,
  onCreateTask,
  onUpdateTask,
  onDeleteTask
}: ProjectViewRendererProps) {
  const navigate = useNavigate()
  const mainContentRef = useRef<HTMLElement>(null)
  
  const [currentView, setCurrentView] = useState(() => {
    if (initialView !== 'dashboard') return initialView
    if (initialSelectedNote) return 'note-detail'
    if (initialSelectedUserStory) return 'user-story-detail'
    if (initialSelectedDesign) return 'design-detail'
    return 'dashboard'
  })
  
  // State management
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [selectedNote, setSelectedNote] = useState<ResearchNote | null>(initialSelectedNote)
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [selectedUserStory, setSelectedUserStory] = useState<UserStory | null>(initialSelectedUserStory)
  const [selectedUserStoryRoles, setSelectedUserStoryRoles] = useState<string[]>(initialUserStoryRoleIds)
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(initialSelectedDesign)
  const [refreshingStakeholders, setRefreshingStakeholders] = useState(false)

  // Handle changes to initialSelectedDesign after component mount
  useEffect(() => {
    if (initialSelectedDesign) {
      console.log('🔵 ProjectViewRenderer: initialSelectedDesign changed to:', initialSelectedDesign)
      setSelectedDesign(initialSelectedDesign)
      setCurrentView('design-detail')
    }
  }, [initialSelectedDesign])

  // Scroll to top when view changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0)
    }
  }, [currentView])

  const handleProjectNavigation = (viewId: string) => {
    // Clear all selected detail states when navigating to a new section
    setSelectedStakeholder(null)
    setSelectedNote(null)
    setIsCreatingNote(false)
    setSelectedUserStory(null)
    setSelectedUserStoryRoles([])
    setSelectedDesign(null)
    
    // Set the new current view
    setCurrentView(viewId)
  }

  const handleRefreshProjectStakeholders = async () => {
    setRefreshingStakeholders(true)
    
    try {
      // Get current project stakeholders
      const { getProjectStakeholders, removeStakeholderFromProject, getResearchNotes, getResearchNoteStakeholders } = await import('../../lib/database')
      const currentProjectStakeholders = await getProjectStakeholders(project.id)
      
      // Get all notes for this project and their stakeholder associations
      const projectNotes = await getResearchNotes()
      const filteredProjectNotes = projectNotes.filter(note => note.project_id === project.id)
      
      // Build a set of all stakeholder IDs that are currently linked to notes
      const linkedStakeholderIds = new Set<string>()
      
      // Add stakeholders from notes
      for (const note of filteredProjectNotes) {
        const noteStakeholderIds = await getResearchNoteStakeholders(note.id)
        noteStakeholderIds.forEach(id => linkedStakeholderIds.add(id))
      }
      
      // Find stakeholders that are assigned to project but not linked to any content
      const stakeholdersToRemove = currentProjectStakeholders.filter(
        stakeholderId => !linkedStakeholderIds.has(stakeholderId)
      )
      
      // Remove unlinked stakeholders from the project
      for (const stakeholderId of stakeholdersToRemove) {
        await removeStakeholderFromProject(project.id, stakeholderId)
      }
      
      // Update the local state
      const updatedAssignedStakeholders = currentProjectStakeholders.filter(
        stakeholderId => linkedStakeholderIds.has(stakeholderId)
      )
      // Note: This would need to be passed up to the parent component
      
      console.log(`Removed ${stakeholdersToRemove.length} unlinked stakeholders from project`)
    } catch (error) {
      console.error('Error refreshing project stakeholders:', error)
    } finally {
      setRefreshingStakeholders(false)
    }
  }

  const handleViewNote = (note: ResearchNote) => {
    setSelectedNote(note)
    setCurrentView('note-detail')
  }

  const handleCreateNoteClick = () => {
    setSelectedNote(null)
    setIsCreatingNote(true)
    setCurrentView('note-detail')
  }

  const handleBackFromNote = () => {
    setSelectedNote(null)
    setIsCreatingNote(false)
    setCurrentView('notes')
  }

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: FolderOpen },
    { id: 'notes', label: 'Notes & Calls', icon: FileText },  
    { id: 'user-stories', label: 'User Stories', icon: BookOpen },
    { id: 'designs', label: 'Designs', icon: Palette },    
    { id: 'decision-history', label: 'Decision History', icon: Clock },
   
    { id: 'project-tasks', label: 'Project Tasks', icon: CheckSquare },
    { id: 'project-progress', label: 'Project Progress', icon: Clipboard },
    { id: 'prompt-builder', label: 'Prompt Builder', icon: Zap },
  ]

  const renderContent = () => {
    // If a stakeholder is selected for detail view, show the detail component
    if (selectedStakeholder) {
      return (
        <StakeholderDetail
          stakeholder={selectedStakeholder}
          userRoles={userRoles}
          lawFirms={lawFirms}
          userPermissions={userPermissions}
          origin="project"
          backButtonText="All Project Stakeholders"
          onBack={() => {
            setSelectedStakeholder(null)
            setCurrentView('stakeholders')
          }}
          onUpdate={(updates) => {
            // Update the stakeholder in the parent component if needed
            setSelectedStakeholder({ ...selectedStakeholder, ...updates })
          }}
        />
      )
    }

    // If a user story is selected for detail view, show the detail component
    if (selectedUserStory) {
      return (
        <UserStoryDetail
          userStory={selectedUserStory}
          assignedStakeholders={memoizedAssignedStakeholders}
          userRoles={userRoles}
          userPermissions={userPermissions}
          lawFirms={lawFirms}
          themes={themes}
          availableUsers={workspaceUsers}
          initialSelectedRoleIds={selectedUserStoryRoles}
          userStoryComments={userStoryComments}
          currentUser={user}
          onBack={() => {
            setSelectedUserStory(null)
            setSelectedUserStoryRoles([])
            setCurrentView('user-stories')
          }}
          onUpdate={(storyId, updates, updatedRoleIds) => {
            // Call onUpdateUserStory with the correct signature
            onUpdateUserStory(storyId, updates, updatedRoleIds || [])
            // Update the selected user story for immediate visual consistency
            const currentStory = userStories.find(s => s.id === storyId)
            if (currentStory) {
              const updatedStory = { ...currentStory, ...updates }
              setSelectedUserStory(updatedStory)
              setSelectedUserStoryRoles(updatedRoleIds || [])
            }
          }}
          onThemeCreate={onThemeCreate}
          onAddComment={(commentText) => onAddUserStoryComment(selectedUserStory!.id, commentText)}
          onEditComment={onEditUserStoryComment}
          onDeleteComment={onDeleteUserStoryComment}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      )
    }


    // If a note is selected for detail view, show the note detail component
    if (selectedDesign) {
      return (
        <AssetDetail
          designShortId={selectedDesign.short_id || 0}
          availableUsers={workspaceUsers}
          onBack={() => {
            setSelectedDesign(null)
            setCurrentView('designs')
          }}
        />
      )
    }

    // If a note is selected for detail view, show the note detail component
    if (currentView === 'note-detail') {
      return (
        <NoteDetail
          note={selectedNote}
          assignedStakeholders={memoizedAssignedStakeholders}
          allWorkspaceStakeholders={allStakeholders}
          projectAssignedStakeholderIds={assignedStakeholders}
          userRoles={userRoles}
          lawFirms={lawFirms}
          userPermissions={userPermissions}
          themes={themes}
          noteTemplates={noteTemplates}
          availableUsers={workspaceUsers}
          currentUser={user}
          projectId={project.id}
          onBack={handleBackFromNote}
          onUpdate={onUpdateNote}
          onAssignStakeholderToProject={onAssignStakeholder}
          onRemoveStakeholderFromNoteAndConditionallyProject={onRemoveStakeholderFromNoteAndConditionallyProject}
          onThemeCreate={onThemeCreate}
          onCreateNote={isCreatingNote ? onCreateNote : undefined}
          isCreating={isCreatingNote}
        />
      )
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <ProjectOverview 
            project={project}
            assignedStakeholders={memoizedAssignedStakeholders}
            notes={notes}
            tasks={projectTasks}
            problemOverview={problemOverview}
            userRoles={userRoles}
            lawFirms={lawFirms}
            allProjectProgressStatus={allProjectProgressStatus}
            onProblemOverviewChange={onProblemOverviewChange}
            onSaveProblemOverview={onSaveProblemOverview}
            projectTasks={projectTasks}
            onNavigateToStakeholders={() => setCurrentView('stakeholders')}
            onViewNote={handleViewNote}
          />
        )

      case 'project-progress':
        return (
          <ProjectProgressSection 
            project={project}
            problemOverview={problemOverview}
            assignedStakeholders={memoizedAssignedStakeholders}
            userRoles={userRoles}
            lawFirms={lawFirms}
            projectTasks={projectTasks}
          />
        )
      case 'stakeholders':
        return (
          <AssignedStakeholders 
            assignedStakeholders={memoizedAssignedStakeholders}
            unassignedStakeholders={getUnassignedStakeholders()}
            userRoles={userRoles}
            lawFirms={lawFirms}
            userPermissions={userPermissions}
            showAssignModal={showAssignModal}
            onShowAssignModal={setShowAssignModal}
            onAssignStakeholder={onAssignStakeholder}
            onRemoveStakeholder={onRemoveStakeholder}
            onRefreshStakeholders={handleRefreshProjectStakeholders}
            refreshing={refreshingStakeholders}
            onViewStakeholder={(stakeholder) => {
              setCurrentView('stakeholder-detail')
              setSelectedStakeholder(stakeholder)
            }}
            onBack={() => setCurrentView('dashboard')}
          />
        )
      case 'notes':
        return (
          <ResearchNotesSection 
            notes={notes}
            assignedStakeholders={memoizedAssignedStakeholders}
            userRoles={userRoles}
            lawFirms={lawFirms}
            noteStakeholders={noteStakeholders}
            onViewNote={handleViewNote}
            onCreateNote={handleCreateNoteClick}
            onDeleteNote={onDeleteNote}
          />
        )
      case 'user-stories':
        return (
          <UserStoriesSection 
            projectId={project.id}
            userStories={userStories}
            storyRoles={storyRoles}
            assignedStakeholders={memoizedAssignedStakeholders}
            userRoles={userRoles}
            userPermissions={userPermissions}
            lawFirms={lawFirms}
            themes={themes}
            availableUsers={workspaceUsers}
            onCreateUserStory={onCreateUserStory}
            onUpdateUserStory={onUpdateUserStory}
            onDeleteUserStory={onDeleteUserStory}
            onThemeCreate={onThemeCreate}
            onSelectUserStory={(story) => {
              setSelectedUserStory(story)
              setCurrentView('user-story-detail')
              // Fetch roles for the selected user story
              const roleIds = storyRoles[story.id] || []
              setSelectedUserStoryRoles(roleIds)
            }}
            onStoriesReordered={onStoriesReordered}
          />
        )
      case 'project-tasks':
        return (
          <ProjectTaskManager 
            projectId={project.id}
            workspaceUsers={workspaceUsers}
          />
        )
      case 'designs':
        return (
          <DesignsSection 
            projectId={project.id}
            onSelectDesign={(design) => {
              console.log('🔵 ProjectViewRenderer: onSelectDesign called with design:', design)
              console.log('🔵 ProjectViewRenderer: Navigating to:', `/design/${design.short_id}`)
              navigate(`/design/${design.short_id}`)
            }}
          />
        )
      case 'decision-history':
        return (
          <DecisionHistory 
            project={project}
            onNavigateToSource={(sourceType, sourceId) => {
              // Navigate to the source based on type
              if (sourceType === 'note') {
                const note = notes.find(n => n.id === sourceId)
                if (note) {
                  handleViewNote(note)
                }
              } else if (sourceType === 'user_story') {
                const userStory = userStories.find(us => us.id === sourceId)
                if (userStory) {
                  navigate(`/user-story/${userStory.short_id}`)
                }
              } else if (sourceType === 'design') {
                // Navigate to design detail page by source ID
                // Note: Designs are not in the current props, so we'll navigate by ID
                navigate(`/design/${sourceId}`)
              }
            }}
          />
        )
      case 'prompt-builder':
        return <PromptBuilderSection />
      default:
        return (
          <ProjectOverview 
            project={project}
            assignedStakeholders={memoizedAssignedStakeholders}
            notes={notes}
            tasks={projectTasks}
            problemOverview={problemOverview}
            userRoles={userRoles}
            lawFirms={lawFirms}
            allProjectProgressStatus={allProjectProgressStatus}
            onProblemOverviewChange={onProblemOverviewChange}
            onSaveProblemOverview={onSaveProblemOverview}
            projectTasks={projectTasks}
            onNavigateToStakeholders={() => setCurrentView('stakeholders')}
            onViewNote={handleViewNote}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  const workspaceMenuItems = [
    { id: 'projects', label: 'Epics', icon: FolderOpen },
    { id: 'law-firms', label: 'Law Firms', icon: Building2 },
    { id: 'user-roles', label: 'User Roles', icon: UserCheck },
    { id: 'stakeholders', label: 'Stakeholders', icon: Users },
    { id: 'team', label: 'KYP Team', icon: UserPlus },
  ]

  const handleWorkspaceNavigation = (viewId: string) => {
    if (onNavigateToWorkspace) {
      onNavigateToWorkspace(viewId)
    }
  }

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut()
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden w-full">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
          >
            <ArrowLeft size={20} />
            All Epics
          </button>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h1>
          <p className="text-sm text-gray-500">Project Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map(item => {
              const Icon = item.icon
              const isActive = currentView === item.id || 
                (item.id === 'notes' && currentView === 'note-detail') ||
                (item.id === 'user-stories' && currentView === 'user-story-detail') ||
                (item.id === 'stakeholders' && currentView === 'stakeholder-detail')
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleProjectNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" ref={mainContentRef}>
        <div className={currentView === 'stakeholder-detail' && selectedStakeholder || currentView === 'user-story-detail' || currentView === 'user-story-create' || (selectedUserStory && currentView !== 'user-stories') || currentView === 'design-detail' || currentView === 'note-detail' ? '' : 'p-6'}>
          {renderContent()}
        </div>
      </main>
    </div>
  )
}