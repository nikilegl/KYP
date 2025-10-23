import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { SupabaseAuthError } from '../../lib/supabase'
import { MainContentRenderer } from './MainContentRenderer'
import {
  getWorkspaces,
  getProjects,
  getProjectByShortId,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getStakeholders,
  getStakeholderByShortId,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
  getResearchNotes,
  getResearchNoteByShortId,
  getResearchNoteStakeholders,
  getWorkspaceUsers,
  createUser,
  updateUserRole,
  removeUser,
  getUserRoles,
  createUserRole,
  updateCustomUserRole,
  deleteUserRole,
  getPlatforms,
  createPlatform,
  updatePlatform,
  deletePlatform,
  getLawFirms,
  getLawFirmByShortId,
  createLawFirm,
  updateLawFirm,
  deleteLawFirm,
  importLawFirmsFromCSV,
  deleteAllLawFirms,
  importStakeholdersFromCSV,
  getUserPermissions,
  createUserPermission,
  updateUserPermission,
  deleteUserPermission,
  getUserStories,
  getUserStoryByShortId,
  getUserStoryRoles,
  getUserStoryComments,
  createUserStoryComment,
  updateUserStoryComment,
  deleteUserStoryComment,
  updateUserStory,
  getAllResearchNoteStakeholders,
  getAllProjectProgressStatus,
  getThemes,
  getThemesWithContentCounts,
  getThemeByShortId,
  getNoteTemplates,
  createNoteTemplate,
  updateNoteTemplate,
  deleteNoteTemplate,
  getAssets as getDesigns
} from '../../lib/database'
import type { 
  Workspace, 
  Project, 
  Stakeholder, 
  ResearchNote, 
  WorkspaceUser,
  UserRole,
  Platform,
  LawFirm,
  UserPermission,
  UserStory,
  Theme,
  NoteTemplate,
  ProjectProgressStatus,
  Design,
  UserStoryComment
} from '../../lib/supabase'

interface WorkspaceDataFetcherProps {
  routeParams: Record<string, string | undefined>
  pathname: string
  onViewChange: (view: string) => void
  onSignOut: () => void
}

export function WorkspaceDataFetcher({
  routeParams,
  pathname,
  onViewChange,
  onSignOut
}: WorkspaceDataFetcherProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Local state for current view - managed based on URL
  const [currentView, setCurrentView] = useState('projects')
  
  // Selection states
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null)
  const [selectedNote, setSelectedNote] = useState<ResearchNote | null>(null)
  const [selectedUserStory, setSelectedUserStory] = useState<UserStory | null>(null)
  const [noteStakeholderIds, setNoteStakeholderIds] = useState<string[]>([])
  const [userStoryRoleIds, setUserStoryRoleIds] = useState<string[]>([])
  const [stakeholderDetailOrigin, setStakeholderDetailOrigin] = useState<'project' | 'manager' | 'law-firm'>('manager')
  const [originLawFirm, setOriginLawFirm] = useState<LawFirm | null>(null)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [themesWithCounts, setThemesWithCounts] = useState<Array<Theme & { contentCounts: { userStories: number; userJourneys: number; researchNotes: number; assets: number } }>>([])
  const [selectedNoteTemplate, setSelectedNoteTemplate] = useState<NoteTemplate | null>(null)
  const [selectedDesignForProject, setSelectedDesignForProject] = useState<Design | null>(null)
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)
  const [selectedLawFirm, setSelectedLawFirm] = useState<LawFirm | null>(null)
  
  // Data states
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [notes, setNotes] = useState<ResearchNote[]>([])
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [stakeholderNotesCountMap, setStakeholderNotesCountMap] = useState<Record<string, number>>({})
  const [themes, setThemes] = useState<Theme[]>([])
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([])
  const [allProjectProgressStatus, setAllProjectProgressStatus] = useState<ProjectProgressStatus[]>([])
  const [allUserStories, setAllUserStories] = useState<UserStory[]>([])
  const [allDesigns, setAllDesigns] = useState<Design[]>([])
  const [userStoryComments, setUserStoryComments] = useState<UserStoryComment[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(true)

  // Load comments when selected user story changes
  useEffect(() => {
    if (selectedUserStory) {
      loadUserStoryComments(selectedUserStory.id)
    }
  }, [selectedUserStory])

  useEffect(() => {
    fetchAllData()
  }, [])

  // Handle route-based navigation
  useEffect(() => {
    const handleRouteNavigation = async () => {
      // If this is a back navigation, skip the default route handling
      if (isNavigatingBack) {
        setIsNavigatingBack(false)
        return
      }

      if (pathname === '/') {
        setCurrentView('projects')
        onViewChange('projects')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }

      // Handle top-level navigation paths
      if (pathname === '/law-firms') {
        setCurrentView('law-firms')
        onViewChange('law-firms')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }

      if (pathname === '/themes') {
        setCurrentView('themes')
        onViewChange('themes')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }

      if (pathname === '/stakeholders') {
        console.log('🔵 WorkspaceDataFetcher: Processing stakeholders path')
        setCurrentView('stakeholders')
        onViewChange('stakeholders')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }

      if (pathname === '/settings') {
        console.log('🔵 WorkspaceDataFetcher: Processing settings path')
        setCurrentView('settings')
        onViewChange('settings')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }

      if (pathname === '/design-system') {
        console.log('🔵 WorkspaceDataFetcher: Processing design-system path')
        setCurrentView('design-system')
        onViewChange('design-system')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }

      if (pathname === '/user-journeys') {
        console.log('🔵 WorkspaceDataFetcher: Processing user-journeys path')
        setCurrentView('user-journeys')
        onViewChange('user-journeys')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }

      if (pathname === '/user-journey-creator') {
        console.log('🔵 WorkspaceDataFetcher: Processing user-journey-creator path')
        setCurrentView('user-journey-creator')
        onViewChange('user-journey-creator')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }


      const shortId = routeParams.shortId ? parseInt(routeParams.shortId) : null
      console.log('🔵 WorkspaceDataFetcher: Extracted shortId:', shortId, 'from routeParams:', routeParams)
      if (!shortId) {
        console.log('🔵 WorkspaceDataFetcher: No shortId found, returning')
        return
      }

      if (pathname.startsWith('/project/')) {
        const project = await getProjectByShortId(shortId)
        if (project) {
          setSelectedProject(project)
          setCurrentView('project-dashboard')
        } else {
          navigate('/')
        }
      } else if (pathname.startsWith('/stakeholder/')) {
        const stakeholder = await getStakeholderByShortId(shortId)
        if (stakeholder) {
          setSelectedStakeholder(stakeholder)
          setCurrentView('stakeholder-detail')
        } else {
          navigate('/')
        }
      } else if (pathname.startsWith('/note/')) {
        const note = await getResearchNoteByShortId(shortId)
        if (note) {
          // Check if note belongs to a project
          if (note.project_id) {
            const project = await getProjectById(note.project_id)
            if (project) {
              // Show project dashboard with note detail
              setSelectedProject(project)
              setSelectedNote(note)
              setCurrentView('project-dashboard')
              // Load note stakeholders
              const stakeholderIds = await getResearchNoteStakeholders(note.id)
              setNoteStakeholderIds(stakeholderIds)
            } else {
              // Project not found, show standalone note detail
              setSelectedNote(note)
              setCurrentView('note-detail')
              const stakeholderIds = await getResearchNoteStakeholders(note.id)
              setNoteStakeholderIds(stakeholderIds)
            }
          } else {
            // Note doesn't belong to a project, show standalone note detail
            setSelectedNote(note)
            setCurrentView('note-detail')
            const stakeholderIds = await getResearchNoteStakeholders(note.id)
            setNoteStakeholderIds(stakeholderIds)
          }
        } else {
          navigate('/')
        }
      } else if (pathname.startsWith('/user-story/')) {
        const userStory = await getUserStoryByShortId(shortId)
        if (userStory) {
          // Check if user story belongs to a project
          if (userStory.project_id) {
            const project = await getProjectById(userStory.project_id)
            if (project) {
              // Show project dashboard with user story detail
              setSelectedProject(project)
              setSelectedUserStory(userStory)
              setCurrentView('project-dashboard')
              // Load user story roles
              const roleIds = await getUserStoryRoles(userStory.id)
              setUserStoryRoleIds(roleIds)
            } else {
              // Project not found, show standalone user story detail
              setSelectedUserStory(userStory)
              setCurrentView('user-story-detail')
              const roleIds = await getUserStoryRoles(userStory.id)
              setUserStoryRoleIds(roleIds)
            }
          } else {
            // User story doesn't belong to a project, show standalone detail
            setSelectedUserStory(userStory)
            setCurrentView('user-story-detail')
            const roleIds = await getUserStoryRoles(userStory.id)
            setUserStoryRoleIds(roleIds)
          }
        } else {
          navigate('/')
        }
      } else if (pathname.startsWith('/theme/')) {
        setSelectedTheme({ short_id: shortId } as Theme)
        setCurrentView('theme-detail')
      } else if (pathname.startsWith('/design/')) {
        console.log('🔵 WorkspaceDataFetcher: Processing design route with shortId:', shortId)
        const { getAssetByShortId: getDesignByShortId, getProjectById } = await import('../../lib/database')
        const design = await getDesignByShortId(shortId)
        console.log('🔵 WorkspaceDataFetcher: Design lookup result:', design)
        if (design) {
          // Always set the design for viewing
          setSelectedDesignForProject(design)
          setSelectedDesign(design) // Add this line to set selectedDesign
          console.log('🔵 WorkspaceDataFetcher: Set selectedDesign and selectedDesignForProject')
          
          // Try to load the associated project if it exists
          if (design.project_id) {
            try {
              const project = await getProjectById(design.project_id)
              console.log('🔵 WorkspaceDataFetcher: Project lookup result:', project)
              if (project) {
                setSelectedProject(project)
                setCurrentView('project-dashboard')
                console.log('🔵 WorkspaceDataFetcher: Set currentView to project-dashboard')
              } else {
                // Project not found, show standalone design detail
                setCurrentView('design-detail')
                console.log('🔵 WorkspaceDataFetcher: Set currentView to design-detail (no project)')
              }
            } catch (error) {
              console.error('Error loading project for design:', error)
              // Show standalone design detail on error
              setCurrentView('design-detail')
              console.log('🔵 WorkspaceDataFetcher: Set currentView to design-detail (error)')
            }
          } else {
            // Design doesn't belong to a project, show standalone design detail
            setCurrentView('design-detail')
            console.log('🔵 WorkspaceDataFetcher: Set currentView to design-detail (no project_id)')
          }
        } else {
          console.log('🔵 WorkspaceDataFetcher: Design not found, navigating to /')
          navigate('/')
        }
      } else if (pathname.startsWith('/law-firm/')) {
        console.log('🔵 WorkspaceDataFetcher: Processing law-firm route with shortId:', shortId)
        const lawFirm = await getLawFirmByShortId(shortId)
        console.log('🔵 WorkspaceDataFetcher: Law firm lookup result:', lawFirm)
        if (lawFirm) {
          setSelectedLawFirm(lawFirm)
          setCurrentView('law-firm-detail')
          console.log('🔵 WorkspaceDataFetcher: Set currentView to law-firm-detail')
        } else {
          console.log('🔵 WorkspaceDataFetcher: Law firm not found, navigating to /')
          navigate('/')
        }
      } else if (pathname.startsWith('/user-journey/')) {
        console.log('🔵 WorkspaceDataFetcher: Processing user-journey route with shortId:', shortId)
        // Set view to user-journey-creator to render the creator component
        setCurrentView('user-journey-creator')
        onViewChange('user-journey-creator')
        setSelectedProject(null)
        setSelectedStakeholder(null)
        setSelectedNote(null)
        setSelectedUserStory(null)
        setSelectedDesignForProject(null)
        setSelectedLawFirm(null)
        return
      }
    }

    handleRouteNavigation()
  }, [pathname, routeParams])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      const [
        workspacesData,
        projectsData,
        stakeholdersData,
        notesData,
        workspaceUsersData,
        userRolesData,
        platformsData,
        lawFirmsData,
        userPermissionsData,
        allNoteStakeholders,
        themesWithCountsData,
        noteTemplatesData,
        allProjectProgressStatusData,
        allUserStoriesData,
        allDesignsData
      ] = await Promise.all([
        getWorkspaces(),
        getProjects(),
        getStakeholders(),
        getResearchNotes(),
        getWorkspaceUsers(),
        getUserRoles(),
        getPlatforms(),
        getLawFirms(),
        getUserPermissions(),
        getAllResearchNoteStakeholders(),
        getThemesWithContentCounts(),
        getNoteTemplates(),
        getAllProjectProgressStatus(),
        getUserStories(),
        getDesigns()
      ])
      
      setWorkspaces(workspacesData)
      setProjects(projectsData)
      setStakeholders(stakeholdersData)
      setNotes(notesData)
      setWorkspaceUsers(workspaceUsersData)
      setUserRoles(userRolesData)
      setPlatforms(platformsData)
      setLawFirms(lawFirmsData)
      setUserPermissions(userPermissionsData)
      setThemesWithCounts(themesWithCountsData)
      setThemes(themesWithCountsData.map(t => ({ ...t, contentCounts: undefined })))
      setNoteTemplates(noteTemplatesData)
      setAllProjectProgressStatus(allProjectProgressStatusData)
      setAllUserStories(allUserStoriesData)
      setAllDesigns(allDesignsData)
      
      // Debug: Log workspaceUsers data
      console.log('🔵 WorkspaceDataFetcher: workspaceUsersData:', workspaceUsersData)
      console.log('🔵 WorkspaceDataFetcher: workspaceUsersData length:', workspaceUsersData.length)
      console.log('🔵 WorkspaceDataFetcher: workspaceUsersData type:', typeof workspaceUsersData)
      console.log('🔵 WorkspaceDataFetcher: workspaceUsersData is array:', Array.isArray(workspaceUsersData))
      
      // Debug: Check state after setting
      setTimeout(() => {
        console.log('🔵 WorkspaceDataFetcher: workspaceUsers state after setState:', workspaceUsers)
        console.log('🔵 WorkspaceDataFetcher: workspaceUsers state length:', workspaceUsers.length)
      }, 100)
      
      // Calculate stakeholder notes count
      const stakeholderNotesCount: Record<string, number> = {}
      console.log('📊 WorkspaceDataFetcher: allNoteStakeholders data:', allNoteStakeholders)
      console.log('📊 WorkspaceDataFetcher: Number of notes with stakeholders:', Object.keys(allNoteStakeholders).length)
      
      Object.values(allNoteStakeholders).forEach(stakeholderIds => {
        stakeholderIds.forEach(stakeholderId => {
          stakeholderNotesCount[stakeholderId] = (stakeholderNotesCount[stakeholderId] || 0) + 1
        })
      })
      
      console.log('📊 WorkspaceDataFetcher: Final stakeholder notes count:', stakeholderNotesCount)
      setStakeholderNotesCountMap(stakeholderNotesCount)
    } catch (error) {
      if (error instanceof SupabaseAuthError) {
        console.warn('Authentication session expired during data fetch, user will be signed out')
        await onSignOut()
      } else {
        console.error('Error fetching data:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadUserStoryComments = async (userStoryId: string) => {
    try {
      const comments = await getUserStoryComments(userStoryId)
      setUserStoryComments(comments)
    } catch (error) {
      console.error('Error loading user story comments:', error)
    }
  }

  const handleThemeCreate = (newTheme: Theme) => {
    const themeWithCounts = { ...newTheme, contentCounts: { userStories: 0, researchNotes: 0, assets: 0 } }
    setThemesWithCounts([themeWithCounts, ...themesWithCounts])
    setThemes([newTheme, ...themes])
  }

  const handleThemeUpdate = async (themeId: string, updates: { name?: string; description?: string; color?: string }) => {
    const { updateTheme } = await import('../../lib/database')
    const updatedTheme = await updateTheme(themeId, updates)
    if (updatedTheme) {
      setThemesWithCounts(themesWithCounts.map(t => 
        t.id === themeId ? { ...t, ...updates } : t
      ))
      setThemes(themes.map(t => 
        t.id === themeId ? { ...t, ...updates } : t
      ))
    }
  }

  const handleThemeDelete = async (themeId: string) => {
    const { deleteTheme } = await import('../../lib/database')
    const success = await deleteTheme(themeId)
    if (success) {
      setThemesWithCounts(themesWithCounts.filter(t => t.id !== themeId))
      setThemes(themes.filter(t => t.id !== themeId))
    }
  }

  const handleSelectTheme = (theme: Theme) => {
    navigate(`/theme/${theme.short_id}`)
  }

  // Note template handlers
  const handleCreateNoteTemplate = async (name: string, body?: string) => {
    const template = await createNoteTemplate(name, body)
    if (template) {
      setNoteTemplates([template, ...noteTemplates])
    }
  }

  const handleUpdateNoteTemplate = async (templateId: string, updates: { name?: string; body?: string }) => {
    const updatedTemplate = await updateNoteTemplate(templateId, updates)
    if (updatedTemplate) {
      setNoteTemplates(noteTemplates.map(t => t.id === templateId ? updatedTemplate : t))
      // Update selected template if it's the one being edited
      if (selectedNoteTemplate && selectedNoteTemplate.id === templateId) {
        setSelectedNoteTemplate(updatedTemplate)
      }
    }
  }

  const handleDeleteNoteTemplate = async (templateId: string) => {
    const success = await deleteNoteTemplate(templateId)
    if (success) {
      setNoteTemplates(noteTemplates.filter(t => t.id !== templateId))
      // Clear selected template if it was deleted
      if (selectedNoteTemplate && selectedNoteTemplate.id === templateId) {
        setSelectedNoteTemplate(null)
        onViewChange('note-templates')
      }
    }
  }

  const handleSelectNoteTemplate = (template: NoteTemplate) => {
    setSelectedNoteTemplate(template)
    onViewChange('note-template-detail')
  }

  const handleBackFromDesign = () => {
    setSelectedDesignForProject(null)
    setCurrentView('projects')
    setIsNavigatingBack(true)
    navigate('/')
  }

  const handleBackFromLawFirm = () => {
    setSelectedLawFirm(null)
    setCurrentView('law-firms')
    setIsNavigatingBack(true)
    navigate('/law-firms')
  }

  // Project handlers
  const handleCreateProject = async (name: string, overview?: string) => {
    try {
      const project = await createProject(name, overview)
      if (project) {
        setProjects([project, ...projects])
      } else {
        console.error('Project creation returned null')
        alert('Failed to create project. Please try again.')
      }
    } catch (error) {
      console.error('Error in handleCreateProject:', error)
      alert('Failed to create project. Please try again.')
    }
  }

  const handleUpdateProject = async (project: Project) => {
    const updatedProject = await updateProject(project.id, { name: project.name, overview: project.overview })
    if (updatedProject) {
      setProjects(projects.map(p => p.id === project.id ? updatedProject : p))
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId)
    if (success) {
      setProjects(projects.filter(p => p.id !== projectId))
    }
  }

  const handleSelectProject = (project: Project) => {
    navigate(`/project/${project.short_id}`)
  }

  const handleBackToWorkspace = () => {
    setSelectedDesignForProject(null)
    navigate('/')
  }

  // Stakeholder handlers
  const handleCreateStakeholder = async (name: string, userRoleId?: string, lawFirmId?: string, userPermissionId?: string, visitorId?: string, department?: string, pendoRole?: string) => {
    const stakeholder = await createStakeholder(name, visitorId, userRoleId, lawFirmId, userPermissionId, department, pendoRole)
    if (stakeholder) {
      setStakeholders([stakeholder, ...stakeholders])
    }
  }

  const handleUpdateStakeholder = async (
    stakeholderId: string,
    updates: { name?: string; user_role_id?: string; law_firm_id?: string; user_permission_id?: string; notes?: string; visitor_id?: string; department?: string; pendo_role?: string }
  ) => {
    const updatedStakeholder = await updateStakeholder(stakeholderId, updates)
    if (updatedStakeholder) {
      setStakeholders(stakeholders.map(s => 
        s.id === stakeholderId ? updatedStakeholder : s
      ))
    }
  }

  const handleDeleteStakeholder = async (stakeholderId: string) => {
    const success = await deleteStakeholder(stakeholderId)
    if (success) {
      setStakeholders(stakeholders.filter(s => s.id !== stakeholderId))
    }
  }

  const handleSelectStakeholder = (stakeholder: Stakeholder) => {
    // Set origin based on current view
    if (currentView === 'stakeholders') {
      setStakeholderDetailOrigin('manager')
      setOriginLawFirm(null)
    } else {
      setStakeholderDetailOrigin('project')
      setOriginLawFirm(null)
    }
    navigate(`/stakeholder/${stakeholder.short_id}`)
  }

  const handleSelectStakeholderFromLawFirm = (stakeholder: Stakeholder, lawFirm: LawFirm) => {
    setStakeholderDetailOrigin('law-firm')
    setOriginLawFirm(lawFirm)
    navigate(`/stakeholder/${stakeholder.short_id}`)
  }

  const handleStakeholderBack = () => {
    if (stakeholderDetailOrigin === 'manager') {
      setSelectedStakeholder(null)
      onViewChange('stakeholders')
      setIsNavigatingBack(true)
      navigate('/')
    } else if (stakeholderDetailOrigin === 'law-firm' && originLawFirm) {
      setSelectedStakeholder(null)
      // Don't set isNavigatingBack to true because we want the route to be processed normally
      navigate(`/law-firm/${originLawFirm.short_id}`)
    } else {
      setSelectedStakeholder(null)
      onViewChange('projects')
      navigate('/')
    }
  }

  // Team management handlers
  const handleCreateUser = async (
    email: string, 
    role: 'admin' | 'member', 
    fullName?: string, 
    team?: 'Design' | 'Product' | 'Engineering' | 'Other'
  ) => {
    const result = await createUser(email, role, fullName, team)
    if (result.user) {
      setWorkspaceUsers([result.user, ...workspaceUsers])
    }
    return result
  }

  const handleUpdateWorkspaceUser = async (
    userId: string, 
    updates: { 
      full_name?: string
      team?: 'Design' | 'Product' | 'Engineering' | 'Other' | null
    }
  ) => {
    const { updateWorkspaceUser } = await import('../../lib/database')
    const success = await updateWorkspaceUser(userId, updates)
    if (success) {
      setWorkspaceUsers(workspaceUsers.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ))
    }
  }

  const handleUpdateWorkspaceUserRole = async (userId: string, newRole: 'admin' | 'member') => {
    const success = await updateUserRole(userId, newRole)
    if (success) {
      setWorkspaceUsers(workspaceUsers.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
    }
  }

  const handleRemoveUser = async (userId: string) => {
    const success = await removeUser(userId)
    if (success) {
      setWorkspaceUsers(workspaceUsers.filter(user => user.id !== userId))
    }
  }

  // User role handlers
  const handleCreateUserRole = async (name: string, colour: string, icon?: string, glossy_icon?: string) => {
    const userRole = await createUserRole(name, colour, icon, glossy_icon)
    if (userRole) {
      setUserRoles([userRole, ...userRoles])
    }
  }

  const handleUpdateUserRoleDefinition = async (roleId: string, updates: { name?: string; colour?: string; icon?: string; glossy_icon?: string }) => {
    const updatedRole = await updateCustomUserRole(roleId, updates)
    if (updatedRole) {
      setUserRoles(userRoles.map(role => 
        role.id === roleId ? updatedRole : role
      ))
      return true
    }
    return false
  }

  const handleDeleteUserRole = async (roleId: string) => {
    const success = await deleteUserRole(roleId)
    if (success) {
      setUserRoles(userRoles.filter(role => role.id !== roleId))
    }
  }

  // Platform handlers
  const handleCreatePlatform = async (name: string, colour: string, icon?: string, description?: string, logo?: string) => {
    const platform = await createPlatform(name, colour, icon, description, logo)
    if (platform) {
      setPlatforms([platform, ...platforms])
    }
  }

  const handleUpdatePlatform = async (platformId: string, updates: { name?: string; colour?: string; icon?: string; description?: string; logo?: string }): Promise<boolean> => {
    const updatedPlatform = await updatePlatform(platformId, updates)
    if (updatedPlatform) {
      setPlatforms(platforms.map(platform => 
        platform.id === platformId ? updatedPlatform : platform
      ))
      return true
    }
    return false
  }

  const handleDeletePlatform = async (platformId: string) => {
    const success = await deletePlatform(platformId)
    if (success) {
      setPlatforms(platforms.filter(platform => platform.id !== platformId))
    }
  }

  // Navigation handler for stakeholder filtering
  const handleNavigateToStakeholdersWithFilter = (userRoleId: string) => {
    onViewChange('stakeholders')
    // Store the filter in a way that StakeholderManager can access it
    localStorage.setItem('stakeholder_filter_user_role', userRoleId)
  }

  // User permission handlers
  const handleCreateUserPermission = async (name: string, description?: string) => {
    const userPermission = await createUserPermission(name, description)
    if (userPermission) {
      setUserPermissions([userPermission, ...userPermissions])
    }
  }

  const handleUpdateUserPermission = async (permissionId: string, updates: { name?: string; description?: string }) => {
    const updatedPermission = await updateUserPermission(permissionId, updates)
    if (updatedPermission) {
      setUserPermissions(userPermissions.map(permission => 
        permission.id === permissionId ? updatedPermission : permission
      ))
    }
  }

  const handleDeleteUserPermission = async (permissionId: string) => {
    const success = await deleteUserPermission(permissionId)
    if (success) {
      setUserPermissions(userPermissions.filter(permission => permission.id !== permissionId))
    }
  }

  // Navigation handler for stakeholder filtering by permission
  const handleNavigateToStakeholdersWithPermissionFilter = (userPermissionId: string) => {
    onViewChange('stakeholders')
    // Store the filter in a way that StakeholderManager can access it
    localStorage.setItem('stakeholder_filter_user_permission', userPermissionId)
  }

  // Law firm handlers
  const handleCreateLawFirm = async (name: string, structure: 'centralised' | 'decentralised', status: 'active' | 'inactive') => {
    const lawFirm = await createLawFirm(name, structure, status)
    if (lawFirm) {
      setLawFirms([lawFirm, ...lawFirms])
    }
  }

  const handleUpdateLawFirm = async (id: string, updates: Partial<Omit<LawFirm, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>) => {
    const updatedFirm = await updateLawFirm(id, updates)
    if (updatedFirm) {
      setLawFirms(lawFirms.map(firm => 
        firm.id === id ? updatedFirm : firm
      ))
    }
  }

  const handleDeleteLawFirm = async (id: string) => {
    const success = await deleteLawFirm(id)
    if (success) {
      setLawFirms(lawFirms.filter(firm => firm.id !== id))
    }
  }

  const handleImportLawFirmsCSV = async (csvData: string) => {
    const results = await importLawFirmsFromCSV(csvData)
    if (results.success > 0) {
      // Refresh law firms data
      const updatedLawFirms = await getLawFirms()
      setLawFirms(updatedLawFirms)
    }
    return results
  }

  const handleDeleteAllLawFirms = async () => {
    const success = await deleteAllLawFirms()
    if (success) {
      setLawFirms([])
    }
  }

  const handleImportStakeholdersCSV = async (csvData: string) => {
    const results = await importStakeholdersFromCSV(csvData)
    if (results.success > 0) {
      // Refresh stakeholders data
      const updatedStakeholders = await getStakeholders()
      setStakeholders(updatedStakeholders)
    }
    return results
  }

  // User story comment handlers
  const handleAddUserStoryComment = async (userStoryId: string, commentText: string) => {
    if (!user) return
    
    const comment = await createUserStoryComment(userStoryId, commentText, user.id)
    if (comment) {
      setUserStoryComments([comment, ...userStoryComments])
    }
  }

  const handleEditUserStoryComment = async (commentId: string, commentText: string) => {
    const updatedComment = await updateUserStoryComment(commentId, commentText)
    if (updatedComment) {
      setUserStoryComments(userStoryComments.map(comment => 
        comment.id === commentId ? updatedComment : comment
      ))
    }
  }

  const handleDeleteUserStoryComment = async (commentId: string) => {
    const success = await deleteUserStoryComment(commentId)
    if (success) {
      setUserStoryComments(userStoryComments.filter(comment => comment.id !== commentId))
    }
  }

  // User story handlers
  const handleUpdateUserStory = React.useCallback(async (
    story: UserStory,
    updates: { 
      name?: string
      description?: string
      estimated_complexity?: number
      priority_rating?: 'must' | 'should' | 'could' | 'would'
      reason?: string
      assigned_to_user_id?: string | null
      status?: string
    }
  ) => {
    console.log('🔵 WorkspaceDataFetcher.handleUpdateUserStory: Called with story ID:', story.id, 'updates:', updates)
    const updatedUserStory = await updateUserStory(story.id, updates)
    console.log('🔵 WorkspaceDataFetcher.handleUpdateUserStory: updateUserStory returned:', updatedUserStory)
    if (updatedUserStory) {
      console.log('🔵 WorkspaceDataFetcher.handleUpdateUserStory: Updating allUserStories state')
      setAllUserStories(allUserStories.map(story => 
        story.id === story.id ? updatedUserStory : story
      ))
      console.log('✅ WorkspaceDataFetcher.handleUpdateUserStory: State updated successfully')
    } else {
      console.error('❌ WorkspaceDataFetcher.handleUpdateUserStory: updateUserStory returned null/undefined')
    }
  }, [allUserStories])

  // Task handlers for user stories
  const handleCreateTaskForUserStory = async (
    name: string,
    description?: string,
    assignedToUserId?: string,
    userStoryId?: string
  ) => {
    const { createTask } = await import('../../lib/database')
    const projectId = selectedUserStory?.project_id
    const task = await createTask(name, description, assignedToUserId, projectId, undefined, userStoryId)
    if (task) {
      // Refresh tasks or update local state as needed
      console.log('Task created for user story:', task)
    }
  }

  const handleUpdateTaskForUserStory = async (
    taskId: string,
    updates: {
      name?: string
      description?: string
      status?: 'complete' | 'not_complete' | 'no_longer_required'
      assigned_to_user_id?: string | null
      user_story_id?: string
    }
  ) => {
    const { updateTask } = await import('../../lib/database')
    const success = await updateTask(taskId, updates)
    if (success) {
      console.log('Task updated for user story:', taskId)
    }
  }

  const handleDeleteTaskForUserStory = async (taskId: string) => {
    const { deleteTask } = await import('../../lib/database')
    const success = await deleteTask(taskId)
    if (success) {
      console.log('Task deleted for user story:', taskId)
    }
  }

  // Get workspace ID (assuming first workspace)
  const workspaceId = workspaces[0]?.id || ''

  return (
    <MainContentRenderer
      currentView={currentView}
      loading={loading}
      workspaceId={workspaceId}
      projects={projects}
      stakeholders={stakeholders}
      notes={notes}
      workspaceUsers={workspaceUsers}
      userRoles={userRoles}
      platforms={platforms}
      lawFirms={lawFirms}
      userPermissions={userPermissions}
      stakeholderNotesCountMap={stakeholderNotesCountMap}
      themesWithCounts={themesWithCounts}
      themes={themes}
      noteTemplates={noteTemplates}
      selectedProject={selectedProject}
      selectedStakeholder={selectedStakeholder}
      selectedNote={selectedNote}
      selectedUserStory={selectedUserStory}
      noteStakeholderIds={noteStakeholderIds}
      userStoryRoleIds={userStoryRoleIds}
      stakeholderDetailOrigin={stakeholderDetailOrigin}
      originLawFirm={originLawFirm}
      selectedTheme={selectedTheme}
      selectedNoteTemplate={selectedNoteTemplate}
      selectedDesignForProject={selectedDesignForProject}
      selectedDesign={selectedDesign}
      selectedLawFirm={selectedLawFirm}
      allProjectProgressStatus={allProjectProgressStatus}
      allUserStories={allUserStories}
      allDesigns={allDesigns}
      user={user}
      userStoryComments={userStoryComments}
      onCreateProject={handleCreateProject}
      onUpdateProject={handleUpdateProject}
      onDeleteProject={handleDeleteProject}
      onSelectProject={handleSelectProject}
      onBackToWorkspace={handleBackToWorkspace}
      onCreateStakeholder={handleCreateStakeholder}
      onUpdateStakeholder={handleUpdateStakeholder}
      onDeleteStakeholder={handleDeleteStakeholder}
      onSelectStakeholder={handleSelectStakeholder}
      onSelectStakeholderFromLawFirm={handleSelectStakeholderFromLawFirm}
      onStakeholderBack={handleStakeholderBack}
      onCreateUser={handleCreateUser}
      onUpdateWorkspaceUser={handleUpdateWorkspaceUser}
      onUpdateWorkspaceUserRole={handleUpdateWorkspaceUserRole}
      onRemoveUser={handleRemoveUser}
      onCreateUserRole={handleCreateUserRole}
      onUpdateUserRoleDefinition={handleUpdateUserRoleDefinition}
      onDeleteUserRole={handleDeleteUserRole}
      onNavigateToStakeholdersWithFilter={handleNavigateToStakeholdersWithFilter}
      onCreatePlatform={handleCreatePlatform}
      onUpdatePlatform={handleUpdatePlatform}
      onDeletePlatform={handleDeletePlatform}
      onCreateUserPermission={handleCreateUserPermission}
      onUpdateUserPermission={handleUpdateUserPermission}
      onDeleteUserPermission={handleDeleteUserPermission}
      onNavigateToStakeholdersWithPermissionFilter={handleNavigateToStakeholdersWithPermissionFilter}
      onCreateLawFirm={handleCreateLawFirm}
      onUpdateLawFirm={handleUpdateLawFirm}
      onDeleteLawFirm={handleDeleteLawFirm}
      onImportLawFirmsCSV={handleImportLawFirmsCSV}
      onDeleteAllLawFirms={handleDeleteAllLawFirms}
      onImportStakeholdersCSV={handleImportStakeholdersCSV}
      onThemeCreate={handleThemeCreate}
      onThemeUpdate={handleThemeUpdate}
      onThemeDelete={handleThemeDelete}
      onSelectTheme={handleSelectTheme}
      onCreateNoteTemplate={handleCreateNoteTemplate}
      onUpdateNoteTemplate={handleUpdateNoteTemplate}
      onDeleteNoteTemplate={handleDeleteNoteTemplate}
      onSelectNoteTemplate={handleSelectNoteTemplate}
      onBackFromDesign={handleBackFromDesign}
      onBackFromLawFirm={handleBackFromLawFirm}
      onCreateTask={handleCreateTaskForUserStory}
      onUpdateTask={handleUpdateTaskForUserStory}
      onDeleteTask={handleDeleteTaskForUserStory}
      onAddUserStoryComment={handleAddUserStoryComment}
      onEditUserStoryComment={handleEditUserStoryComment}
      onDeleteUserStoryComment={handleDeleteUserStoryComment}
      onUpdateUserStory={handleUpdateUserStory}
      onSignOut={onSignOut}
    />
  )
}