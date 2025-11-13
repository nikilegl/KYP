import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Copy, FolderOpen, ChevronRight, Link as LinkIcon, Move } from 'lucide-react'
import { Button } from './DesignSystem/components/Button'
import { Modal } from './DesignSystem/components/Modal'
import { DataTable, Column } from './DesignSystem/components/DataTable'
import { LoadingState } from './DesignSystem/components/LoadingSpinner'
import { LawFirmForm } from './LawFirmManager/LawFirmForm'
import { EditJourneyModal } from './EditJourneyModal'
import { getProjects, getUserJourneys, deleteUserJourney, updateUserJourney, createUserJourney, type UserJourney } from '../lib/database'
import { getLawFirms, createLawFirm } from '../lib/database/services/lawFirmService'
import { getUserJourneyLawFirms, setUserJourneyLawFirms } from '../lib/database/services/userJourneyService'
import { getUserJourneyFolders, assignUserJourneysToFolder, moveFolderToParent, countJourneysInFolder, updateUserJourneyFolder, deleteUserJourneyFolder, createUserJourneyFolder, type UserJourneyFolder } from '../lib/database/services/userJourneyFolderService'
import type { Project, LawFirm } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { convertEmojis } from '../utils/emojiConverter'
import * as emoji from 'node-emoji'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import { nameToSlug, findFolderBySlug } from '../utils/slugUtils'

interface WorkspaceUserInfo {
  id: string
  email: string
  full_name?: string
}

interface UserJourneyWithProject extends UserJourney {
  project?: Project
  folder?: UserJourneyFolder
  lawFirms?: LawFirm[]
  createdByUser?: WorkspaceUserInfo
  updatedByUser?: WorkspaceUserInfo
  nodes_count?: number // Computed property for sorting
  law_firms_text?: string // Computed property for sorting law firms
}

// Combined type for table rows (folders + journeys)
type FolderWithUserInfo = UserJourneyFolder & { 
  journey_count: number
  createdByUser?: WorkspaceUserInfo
}

type TableItem = 
  | { type: 'folder', data: FolderWithUserInfo }
  | { type: 'journey', data: UserJourneyWithProject }

interface UserJourneysManagerProps {
  projectId?: string // Optional - if provided, filters journeys to this project
}

export function UserJourneysManager({ projectId }: UserJourneysManagerProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ folderSlug?: string }>()
  const [userJourneys, setUserJourneys] = useState<UserJourneyWithProject[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [folders, setFolders] = useState<UserJourneyFolder[]>([])
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<UserJourneyFolder[]>([])
  const [draggedItem, setDraggedItem] = useState<{ type: 'journey' | 'folder', id: string } | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [folderJourneyCounts, setFolderJourneyCounts] = useState<Record<string, number>>({})
  const [usersMap, setUsersMap] = useState<Map<string, WorkspaceUserInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [showAddToFolderModal, setShowAddToFolderModal] = useState(false)
  const [selectedFolderForAssignment, setSelectedFolderForAssignment] = useState<string>('')
  const [assigningToFolder, setAssigningToFolder] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [journeyToDelete, setJourneyToDelete] = useState<UserJourneyWithProject | null>(null)
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<UserJourneyFolder | null>(null)
  const [showEditFolderModal, setShowEditFolderModal] = useState(false)
  const [folderToEdit, setFolderToEdit] = useState<UserJourneyFolder | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [editFolderColor, setEditFolderColor] = useState('')
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [journeyToDuplicate, setJourneyToDuplicate] = useState<UserJourneyWithProject | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [selectedJourneys, setSelectedJourneys] = useState<string[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [journeyToEdit, setJourneyToEdit] = useState<UserJourneyWithProject | null>(null)
  const [contextMenu, setContextMenu] = useState<{ 
    x: number
    y: number
    journey?: UserJourneyWithProject
    folder?: FolderWithUserInfo
  } | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [journeyToMove, setJourneyToMove] = useState<UserJourneyWithProject | null>(null)
  const [folderToMove, setFolderToMove] = useState<FolderWithUserInfo | null>(null)
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>('')
  const [movingJourney, setMovingJourney] = useState(false)
  const [movingFolder, setMovingFolder] = useState(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    layout: 'vertical' as 'vertical' | 'horizontal',
    status: 'draft' as 'draft' | 'published',
    project_id: ''
  })
  const [selectedLawFirmIds, setSelectedLawFirmIds] = useState<string[]>([])
  const [lawFirmSearchQuery, setLawFirmSearchQuery] = useState('')
  const [showAddLawFirmModal, setShowAddLawFirmModal] = useState(false)
  const [newLawFirm, setNewLawFirm] = useState({ 
    name: '', 
    structure: 'decentralised' as 'centralised' | 'decentralised',
    status: 'active' as 'active' | 'inactive',
    top_4: false
  })
  const [creatingLawFirm, setCreatingLawFirm] = useState(false)

  // Load projects and journeys on mount and when folder slug changes
  useEffect(() => {
    loadData()
  }, [])

  // Update current folder when URL slug changes
  useEffect(() => {
    // Wait for folders to load before processing URL slug
    if (folders.length === 0) return

    if (params.folderSlug) {
      const folder = findFolderBySlug(folders, params.folderSlug)
      if (folder) {
        setCurrentFolderId(folder.id)
        setFolderPath(buildFolderPath(folder.id))
      } else {
        // Folder not found, navigate to root
        setCurrentFolderId(null)
        setFolderPath([])
        navigate('/user-journeys', { replace: true })
      }
    } else {
      // No folder slug in URL, show root
      setCurrentFolderId(null)
      setFolderPath([])
    }
  }, [params.folderSlug, location.pathname, folders, navigate])

  // Handle creating a new law firm from the Edit Journey Details modal
  const handleCreateLawFirmFromModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingLawFirm(true)
    
    try {
      // Get current user's workspace
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: workspaceUser } = await supabase
            .from('workspace_users')
            .select('workspace_id')
            .eq('user_id', user.id)
            .single()
          
          if (workspaceUser) {
            await createLawFirm(
              newLawFirm.name,
              newLawFirm.structure,
              newLawFirm.status
            )
            
            // Reload law firms
            const lawFirmsData = await getLawFirms({ workspaceId: workspaceUser.workspace_id })
            setLawFirms(lawFirmsData)
            
            // Reset form and close modal
            setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
            setShowAddLawFirmModal(false)
          }
        }
      }
    } catch (error) {
      console.error('Error creating law firm:', error)
    } finally {
      setCreatingLawFirm(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const projectsData = await getProjects()
      setProjects(projectsData)

      // Load all folders
      const foldersData = await getUserJourneyFolders()
      setFolders(foldersData)

      // Count journeys in each folder
      const counts: Record<string, number> = {}
      for (const folder of foldersData) {
        const count = await countJourneysInFolder(folder.id)
        counts[folder.id] = count
      }
      setFolderJourneyCounts(counts)

      // Load all law firms
      const lawFirmsData = await getLawFirms()
      setLawFirms(lawFirmsData)

      // Load all journeys (including those without projects)
      const allJourneys = await getUserJourneys()
      
      // Get unique user IDs from created_by and updated_by (journeys and folders)
      const userIds = new Set<string>()
      allJourneys.forEach(journey => {
        if (journey.created_by) userIds.add(journey.created_by)
        if (journey.updated_by) userIds.add(journey.updated_by)
      })
      foldersData.forEach(folder => {
        if (folder.created_by) userIds.add(folder.created_by)
      })
      
      console.log('📊 User Journey Tracking Debug:')
      console.log('- Total journeys:', allJourneys.length)
      console.log('- Journeys with created_by:', allJourneys.filter(j => j.created_by).length)
      console.log('- Journeys with updated_by:', allJourneys.filter(j => j.updated_by).length)
      console.log('- Unique user IDs:', Array.from(userIds))
      
      // Fetch user information if we have Supabase configured
      const usersMap = new Map<string, WorkspaceUserInfo>()
      if (supabase && userIds.size > 0) {
        const { data: users, error: usersError } = await supabase
          .from('workspace_users')
          .select('user_id, full_name, user_email')
          .in('user_id', Array.from(userIds))
        
        console.log('- Fetched users:', users?.length || 0)
        if (usersError) console.error('- Error fetching users:', usersError)
        
        if (users) {
          users.forEach(user => {
            usersMap.set(user.user_id, {
              id: user.user_id,
              full_name: user.full_name,
              email: user.user_email
            })
          })
          console.log('- Users map size:', usersMap.size)
        }
      }
      
      // Store users map in state for use in table
      setUsersMap(usersMap)
      
      // Enrich with project data, folder data, law firms, and user information
      const journeysWithData: UserJourneyWithProject[] = await Promise.all(
        allJourneys.map(async journey => {
          const project = journey.project_id 
            ? projectsData.find(p => p.id === journey.project_id)
            : undefined
          
          const folder = journey.folder_id 
            ? foldersData.find(f => f.id === journey.folder_id)
            : undefined
          
          // Get law firm IDs for this journey
          const lawFirmIds = await getUserJourneyLawFirms(journey.id)
          
          // Get full law firm objects
          const lawFirms = lawFirmsData.filter(firm => lawFirmIds.includes(firm.id))
          
          return {
            ...journey,
            project,
            folder,
            lawFirms,
            createdByUser: journey.created_by ? usersMap.get(journey.created_by) : undefined,
            updatedByUser: journey.updated_by ? usersMap.get(journey.updated_by) : undefined,
            nodes_count: journey.flow_data?.nodes?.length || 0, // Computed property for sorting
            law_firms_text: lawFirms.map(firm => firm.name).join(', ') || '' // Computed property for sorting law firms
          }
        })
      )
      
      setUserJourneys(journeysWithData)
    } catch (error) {
      console.error('Error loading user journeys:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get folders at current level (for navigation)
  const currentLevelFolders = folders.filter(folder => 
    folder.parent_folder_id === currentFolderId
  )

  // Get journeys at current level (for navigation)
  const currentLevelJourneys = userJourneys.filter(journey =>
    journey.folder_id === currentFolderId
  )

  // Build path from root to current folder
  const buildFolderPath = (folderId: string | null): UserJourneyFolder[] => {
    if (!folderId) return []
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return []
    return [...buildFolderPath(folder.parent_folder_id), folder]
  }

  // Check if a folder is a descendant of another folder (to prevent circular moves)
  const isDescendantOf = (folderId: string, ancestorId: string): boolean => {
    const folder = folders.find(f => f.id === folderId)
    if (!folder || !folder.parent_folder_id) return false
    if (folder.parent_folder_id === ancestorId) return true
    return isDescendantOf(folder.parent_folder_id, ancestorId)
  }

  // Filter and combine folders + journeys for table display
  const filteredTableItems: TableItem[] = (() => {
    // If searching, show all matching items regardless of folder
    if (searchTerm) {
      const searchWithEmojis = emoji.emojify(searchTerm)
      const searchLower = searchWithEmojis.toLowerCase()
      
      const matchingJourneys = userJourneys.filter(journey => {
        const matchesSearch = journey.name.toLowerCase().includes(searchLower) ||
                             (journey.description && journey.description.toLowerCase().includes(searchLower))
        
        // Apply project filter
        let matchesProject = true
        if (projectId) {
          matchesProject = journey.project_id === projectId
        } else {
          matchesProject = projectFilter === 'all' || 
                          (projectFilter === 'none' && !journey.project_id) ||
                          journey.project_id === projectFilter
        }
        
        return matchesSearch && matchesProject
      }).map(journey => ({ type: 'journey' as const, data: journey }))

      const matchingFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchLower)
      ).map(folder => ({ 
        type: 'folder' as const, 
        data: { 
          ...folder, 
          journey_count: folderJourneyCounts[folder.id] || 0,
          createdByUser: folder.created_by ? usersMap.get(folder.created_by) : undefined
        } 
      }))

      return [...matchingFolders, ...matchingJourneys]
    }

    // Normal navigation mode - show current level only
    const folderItems: TableItem[] = currentLevelFolders.map(folder => ({
      type: 'folder',
      data: { 
        ...folder, 
        journey_count: folderJourneyCounts[folder.id] || 0,
        createdByUser: folder.created_by ? usersMap.get(folder.created_by) : undefined
      }
    }))

    const journeyItems: TableItem[] = currentLevelJourneys.filter(journey => {
      // Apply project filter
      let matchesProject = true
      if (projectId) {
        matchesProject = journey.project_id === projectId
      } else {
        matchesProject = projectFilter === 'all' || 
                        (projectFilter === 'none' && !journey.project_id) ||
                        journey.project_id === projectFilter
      }
      
      return matchesProject
    }).map(journey => ({ type: 'journey', data: journey }))

    // Folders first, then journeys
    return [...folderItems, ...journeyItems]
  })()

  // Handle edit
  const handleEditClick = (journey: UserJourneyWithProject) => {
    setJourneyToEdit(journey)
    setEditForm({
      name: journey.name,
      description: journey.description || '',
      layout: journey.layout || 'vertical',
      status: journey.status || 'draft',
      project_id: journey.project_id || ''
    })
    // Set selected law firms
    setSelectedLawFirmIds(journey.lawFirms?.map(firm => firm.id) || [])
    setLawFirmSearchQuery('')
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!journeyToEdit || !editForm.name.trim()) return
    
    try {
      await updateUserJourney(journeyToEdit.id, {
        name: editForm.name,
        description: editForm.description,
        layout: editForm.layout,
        status: editForm.status,
        project_id: editForm.project_id || null
      })
      
      // Save law firm associations
      await setUserJourneyLawFirms(journeyToEdit.id, selectedLawFirmIds)
      
      // Get updated law firms for local state
      const updatedLawFirms = lawFirms.filter(firm => selectedLawFirmIds.includes(firm.id))
      
      // Update local state
      setUserJourneys(prev => prev.map(j => 
        j.id === journeyToEdit.id 
          ? { 
              ...j, 
              name: editForm.name, 
              description: editForm.description,
              layout: editForm.layout,
              status: editForm.status,
              project_id: editForm.project_id || null,
              project: editForm.project_id ? projects.find(p => p.id === editForm.project_id) : undefined,
              lawFirms: updatedLawFirms
            }
          : j
      ))
      
      setShowEditModal(false)
      setJourneyToEdit(null)
      setSelectedLawFirmIds([])
      setLawFirmSearchQuery('')
    } catch (error) {
      console.error('Error updating journey:', error)
      alert('Failed to update journey')
    }
  }

  // Handle delete
  const handleDeleteClick = (journey: UserJourneyWithProject) => {
    setJourneyToDelete(journey)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!journeyToDelete) return
    
    const success = await deleteUserJourney(journeyToDelete.id)
    if (success) {
      setUserJourneys(prev => prev.filter(j => j.id !== journeyToDelete.id))
      setShowDeleteConfirm(false)
      setJourneyToDelete(null)
    } else {
      alert('Failed to delete journey')
    }
  }

  // Handle duplicate
  const handleDuplicateClick = (journey: UserJourneyWithProject) => {
    setJourneyToDuplicate(journey)
    setShowDuplicateConfirm(true)
  }

  const confirmDuplicate = async () => {
    if (!journeyToDuplicate) return
    
    try {
      setDuplicating(true)
      
      // Create a copy with a new name
      const duplicateName = `${journeyToDuplicate.name} (Copy)`
      
      const duplicated = await createUserJourney(
        duplicateName,
        journeyToDuplicate.description || '',
        journeyToDuplicate.flow_data || { nodes: [], edges: [] },
        journeyToDuplicate.project_id || null,
        journeyToDuplicate.layout || 'vertical'
      )
      
      if (duplicated) {
        // Copy law firm associations
        const lawFirmIds = journeyToDuplicate.lawFirms?.map(firm => firm.id) || []
        await setUserJourneyLawFirms(duplicated.id, lawFirmIds)
        
        // Assign to the same folder as the original journey
        if (journeyToDuplicate.folder_id) {
          await assignUserJourneysToFolder([duplicated.id], journeyToDuplicate.folder_id)
        }
        
        // Reload data to show the new journey
        await loadData()
        
        setShowDuplicateConfirm(false)
        setJourneyToDuplicate(null)
      } else {
        alert('Failed to duplicate journey')
      }
    } catch (error) {
      console.error('Error duplicating journey:', error)
      alert('Failed to duplicate journey')
    } finally {
      setDuplicating(false)
    }
  }

  // Navigate to user journey creator
  const handleCreateUserJourney = () => {
    const params = new URLSearchParams()
    if (projectId) {
      params.set('projectId', projectId)
    }
    if (currentFolderId) {
      params.set('folderId', currentFolderId)
    }
    const queryString = params.toString()
    navigate(`/user-journey-creator${queryString ? `?${queryString}` : ''}`)
  }

  // Navigate into a folder
  const handleFolderClick = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      const slug = nameToSlug(folder.name)
      navigate(`/user-journeys/${slug}`)
      setCurrentFolderId(folderId)
      setFolderPath(buildFolderPath(folderId))
      setSelectedJourneys([])
    }
  }

  // Navigate to root
  const handleNavigateToRoot = () => {
    navigate('/user-journeys')
    setCurrentFolderId(null)
    setFolderPath([])
    setSelectedJourneys([])
  }

  // Navigate to specific folder in breadcrumb
  const handleNavigateToFolder = (folderId: string | null) => {
    if (!folderId) {
      navigate('/user-journeys')
      setCurrentFolderId(null)
      setFolderPath([])
      setSelectedJourneys([])
      return
    }
    
    const folder = folders.find(f => f.id === folderId)
    if (folder) {
      const slug = nameToSlug(folder.name)
      navigate(`/user-journeys/${slug}`)
      setCurrentFolderId(folderId)
      setFolderPath(buildFolderPath(folderId))
      setSelectedJourneys([])
    }
  }

  // Drag and drop handlers
  const handleDragStart = (type: 'journey' | 'folder', id: string) => {
    setDraggedItem({ type, id })
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverFolder(null)
  }

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault()
    setDragOverFolder(folderId)
  }

  const handleDragLeave = () => {
    setDragOverFolder(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    if (!draggedItem) return

    try {
      if (draggedItem.type === 'journey') {
        await assignUserJourneysToFolder([draggedItem.id], targetFolderId)
      } else if (draggedItem.type === 'folder') {
        // Prevent dropping folder into itself or its descendants
        if (targetFolderId === draggedItem.id) return
        await moveFolderToParent(draggedItem.id, targetFolderId)
      }
      await loadData()
    } catch (error) {
      console.error('Error moving item:', error)
      alert('Failed to move item. Please try again.')
    } finally {
      setDraggedItem(null)
      setDragOverFolder(null)
    }
  }

  // Drag handlers for DataTable
  const getItemDragType = (item: TableItem): 'journey' | 'folder' | null => {
    return item.type
  }

  const handleTableDragStart = (item: TableItem) => {
    if (item.type === 'folder') {
      handleDragStart('folder', item.data.id)
    } else {
      handleDragStart('journey', item.data.id)
    }
  }

  const handleTableDragOver = (e: React.DragEvent, item: TableItem) => {
    // Only folders can receive drops
    if (item.type === 'folder') {
      handleDragOver(e, item.data.id)
    }
  }

  const handleTableDrop = (e: React.DragEvent, item: TableItem) => {
    // Only folders can receive drops
    if (item.type === 'folder') {
      handleDrop(e, item.data.id)
    }
  }

  // Context menu handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  const handleContextMenu = (e: React.MouseEvent, item: UserJourneyWithProject | FolderWithUserInfo, type: 'journey' | 'folder') => {
    e.preventDefault()
    e.stopPropagation()
    if (type === 'journey') {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        journey: item as UserJourneyWithProject
      })
    } else {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        folder: item as FolderWithUserInfo
      })
    }
  }

  const handleCopyLink = async (journey: UserJourneyWithProject) => {
    if (journey.status !== 'published') {
      alert('Only published journeys can be shared via link.')
      return
    }

    const url = `${window.location.origin}/user-journey/${journey.short_id}`
    try {
      await navigator.clipboard.writeText(url)
      setContextMenu(null)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  const handleMoveClick = (journey: UserJourneyWithProject) => {
    setJourneyToMove(journey)
    setFolderToMove(null)
    setSelectedMoveFolder(journey.folder_id || '')
    setShowMoveModal(true)
    setContextMenu(null)
  }

  const handleMoveFolderClick = (folder: FolderWithUserInfo) => {
    setFolderToMove(folder)
    setJourneyToMove(null)
    setSelectedMoveFolder(folder.parent_folder_id || '')
    setShowMoveModal(true)
    setContextMenu(null)
  }

  const handleMoveConfirm = async () => {
    if (journeyToMove) {
      try {
        setMovingJourney(true)
        await assignUserJourneysToFolder(
          [journeyToMove.id],
          selectedMoveFolder || null
        )
        await loadData()
        setShowMoveModal(false)
        setJourneyToMove(null)
        setSelectedMoveFolder('')
      } catch (error) {
        console.error('Error moving journey:', error)
        alert('Failed to move journey. Please try again.')
      } finally {
        setMovingJourney(false)
      }
    } else if (folderToMove) {
      try {
        setMovingFolder(true)
        await moveFolderToParent(
          folderToMove.id,
          selectedMoveFolder || null
        )
        await loadData()
        setShowMoveModal(false)
        setFolderToMove(null)
        setSelectedMoveFolder('')
      } catch (error) {
        console.error('Error moving folder:', error)
        alert('Failed to move folder. Please try again.')
      } finally {
        setMovingFolder(false)
      }
    }
  }

  // Handle adding selected journeys to a folder
  const handleAddToFolderClick = () => {
    if (selectedJourneys.length === 0) return
    setSelectedFolderForAssignment('')
    setShowAddToFolderModal(true)
  }

  const handleAssignToFolder = async () => {
    if (selectedJourneys.length === 0) return

    setAssigningToFolder(true)
    try {
      // Allow assigning to null to remove from folder
      const folderId = selectedFolderForAssignment === 'none' ? null : selectedFolderForAssignment
      await assignUserJourneysToFolder(selectedJourneys, folderId)
      await loadData()
      setSelectedJourneys([])
      setShowAddToFolderModal(false)
      setSelectedFolderForAssignment('')
    } catch (error) {
      console.error('Error assigning journeys to folder:', error)
      alert('Failed to assign journeys to folder. Please try again.')
    } finally {
      setAssigningToFolder(false)
    }
  }

  // Handle folder deletion
  const handleDeleteFolderClick = (folder: UserJourneyFolder) => {
    setFolderToDelete(folder)
    setShowDeleteFolderConfirm(true)
  }

  const handleDeleteFolderConfirm = async () => {
    if (!folderToDelete) return

    try {
      await deleteUserJourneyFolder(folderToDelete.id)
      await loadData()
      setShowDeleteFolderConfirm(false)
      setFolderToDelete(null)
      
      // If we're inside the deleted folder, navigate to parent
      if (currentFolderId === folderToDelete.id) {
        setCurrentFolderId(folderToDelete.parent_folder_id)
        setFolderPath(buildFolderPath(folderToDelete.parent_folder_id))
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder. Please try again.')
    }
  }

  const handleAddFolderClick = () => {
    setFolderToEdit(null)
    setEditFolderName('')
    setEditFolderColor('#3B82F6') // Default blue color
    setShowEditFolderModal(true)
  }

  const handleEditFolderClick = (folder: UserJourneyFolder) => {
    setFolderToEdit(folder)
    setEditFolderName(folder.name)
    setEditFolderColor(folder.color)
    setShowEditFolderModal(true)
  }

  const handleEditFolderSave = async () => {
    if (!editFolderName.trim()) return

    try {
      if (folderToEdit) {
        // Update existing folder
        await updateUserJourneyFolder(folderToEdit.id, {
          name: editFolderName.trim(),
          color: editFolderColor
        })
      } else {
        // Create new folder - nest it in current folder if we're inside one
        await createUserJourneyFolder(editFolderName.trim(), editFolderColor, currentFolderId)
      }
      
      await loadData()
      setShowEditFolderModal(false)
      setFolderToEdit(null)
      setEditFolderName('')
      setEditFolderColor('')
    } catch (error) {
      console.error(`Error ${folderToEdit ? 'updating' : 'creating'} folder:`, error)
      alert(`Failed to ${folderToEdit ? 'update' : 'create'} folder. Please try again.`)
    }
  }

  // Table columns configuration
  const columns: Column<TableItem>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      width: '400px',
      render: (item) => {
        if (item.type === 'folder') {
          const folder = item.data
          return (
            <div className="break-words whitespace-normal flex items-center gap-3">
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: folder.color }}
              >
                <FolderOpen size={14} className="text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{convertEmojis(folder.name)}</div>
                <div className="text-xs text-gray-500">{folder.journey_count} item{folder.journey_count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          )
        } else {
          const journey = item.data
          return (
            <div className="break-words whitespace-normal">
              <div className="font-medium text-gray-900">{convertEmojis(journey.name)}</div>
            </div>
          )
        }
      }
    },
    {
      key: 'status',
      header: 'Type / Status',
      sortable: true,
      width: '120px',
      render: (item) => {
        if (item.type === 'folder') {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Folder
            </span>
          )
        } else {
          const status = item.data.status || 'draft'
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              status === 'published' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {status === 'published' ? 'Published' : 'Draft'}
            </span>
          )
        }
      }
    },
    {
      key: 'updated_at',
      header: 'Modified',
      sortable: true,
      width: '180px',
      render: (item) => {
        const data = item.data
        const updatedDate = new Date(data.updated_at)
        const formattedDate = updatedDate.toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        })
        
        return (
          <div className="text-sm text-gray-600">
            {formattedDate}
          </div>
        )
      }
    },
    {
      key: 'created_by',
      header: 'Created by',
      sortable: false,
      width: '180px',
      render: (item) => {
        const createdByUser = item.data.createdByUser
        if (!createdByUser) {
          return (
            <div className="text-sm text-gray-400">
              Unknown User
            </div>
          )
        }
        
        return (
          <div className="text-sm text-gray-600">
            {createdByUser.full_name || createdByUser.email || 'Unknown User'}
          </div>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      width: '150px',
      render: (item) => {
        if (item.type === 'folder') {
          const folder = item.data
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditFolderClick(folder)
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Edit folder"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteFolderClick(folder)
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Delete folder"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        } else {
          const journey = item.data
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditClick(journey)
                }}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Edit journey details"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDuplicateClick(journey)
                }}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                title="Duplicate journey"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteClick(journey)
                }}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                title="Delete journey"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        }
      }
    }
  ]

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <LoadingState message="Loading user journeys..." size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={projectId ? "flex-1 flex flex-col overflow-auto" : "flex-1 flex flex-col p-6 overflow-auto"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Journeys</h2>
          <p className="text-gray-600">Visual flow diagrams showing user interactions and processes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAddFolderClick}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Add Folder
          </Button>
          <Button
            onClick={handleCreateUserJourney}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Create User Journey
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search user journeys (supports emojis: :gear:)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Only show Epic filter if not filtering by project */}
        {!projectId && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Epics</option>
            <option value="none">No Epic</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 mb-6 text-sm flex-shrink-0">
        <button
          onClick={handleNavigateToRoot}
          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
            currentFolderId === null ? 'text-gray-900 font-medium' : 'text-gray-600'
          }`}
        >
          <FolderOpen size={16} />
          <span>All User Journeys</span>
        </button>
        
        {folderPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <ChevronRight size={16} className="text-gray-400" />
            <button
              onClick={() => handleNavigateToFolder(folder.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                index === folderPath.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600'
              }`}
            >
              <span>{convertEmojis(folder.name)}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Bulk Actions - Show when items are selected */}
      {selectedJourneys.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-900 font-medium">
            {selectedJourneys.length} user journey{selectedJourneys.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAddToFolderClick}
              className="flex items-center gap-2"
            >
              <FolderOpen size={16} />
              Add to Folder
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedJourneys([])}
              className="text-sm"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* User Journeys Table */}
      <div className="flex-shrink-0">
        <DataTable
          data={filteredTableItems}
          getItemId={(item) => item.type === 'folder' ? `folder-${item.data.id}` : item.data.id}
          columns={columns}
          sortableFields={['name', 'updated_at']}
          onRowClick={(item, e) => {
            // Check for option-click (Mac) or Ctrl+click (Windows/Linux)
            if (e && (e.metaKey || e.altKey || e.ctrlKey)) {
              if (item.type === 'journey') {
                handleContextMenu(e as React.MouseEvent, item.data, 'journey')
              } else if (item.type === 'folder') {
                handleContextMenu(e as React.MouseEvent, item.data, 'folder')
              }
              return
            }
            
            if (item.type === 'folder') {
              handleFolderClick(item.data.id)
            } else {
              navigate(`/user-journey/${item.data.short_id}`)
            }
          }}
          onRowContextMenu={(e, item) => {
            // Show context menu for both journeys and folders
            if (item.type === 'journey') {
              handleContextMenu(e, item.data, 'journey')
            } else if (item.type === 'folder') {
              handleContextMenu(e, item.data, 'folder')
            }
          }}
          selectable={false}
          selectedItems={selectedJourneys}
          onSelectionChange={setSelectedJourneys}
          showSelectionBar={false}
          onDragStart={handleTableDragStart}
          onDragOver={handleTableDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleTableDrop}
          getItemDragType={getItemDragType}
          dragOverItemId={dragOverFolder ? `folder-${dragOverFolder}` : null}
        />
      </div>




      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && journeyToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setJourneyToDelete(null)
          }}
          title="Delete User Journey"
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setJourneyToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Journey
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-gray-600">
              Are you sure you want to delete "<strong>{journeyToDelete.name}</strong>"? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateConfirm && journeyToDuplicate && (
        <Modal
          isOpen={showDuplicateConfirm}
          onClose={() => {
            setShowDuplicateConfirm(false)
            setJourneyToDuplicate(null)
          }}
          title="Duplicate User Journey"
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDuplicateConfirm(false)
                  setJourneyToDuplicate(null)
                }}
                disabled={duplicating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmDuplicate}
                disabled={duplicating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {duplicating ? 'Duplicating...' : 'Confirm'}
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-gray-600">
              Are you sure you want to duplicate this user journey? A copy will be created with the name "<strong>{journeyToDuplicate.name} (Copy)</strong>".
            </p>
          </div>
        </Modal>
      )}

      {/* Add/Edit Folder Modal */}
      {showEditFolderModal && (
        <Modal
          isOpen={showEditFolderModal}
          onClose={() => {
            setShowEditFolderModal(false)
            setFolderToEdit(null)
            setEditFolderName('')
            setEditFolderColor('')
          }}
          title={folderToEdit ? "Edit Folder" : "Add Folder"}
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEditFolderModal(false)
                  setFolderToEdit(null)
                  setEditFolderName('')
                  setEditFolderColor('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEditFolderSave}
                disabled={!editFolderName.trim()}
              >
                {folderToEdit ? 'Save Changes' : 'Add Folder'}
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder Name
              </label>
              <EmojiAutocomplete
                value={editFolderName}
                onChange={setEditFolderName}
                placeholder="Enter folder name (type : to search emojis)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditFolderColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editFolderColor === color
                        ? 'border-gray-900 scale-110'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderConfirm && folderToDelete && (
        <Modal
          isOpen={showDeleteFolderConfirm}
          onClose={() => {
            setShowDeleteFolderConfirm(false)
            setFolderToDelete(null)
          }}
          title="Delete Folder"
          size="md"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteFolderConfirm(false)
                  setFolderToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteFolderConfirm}
              >
                Delete Folder & Contents
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete "<strong>{convertEmojis(folderToDelete.name)}</strong>"?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm text-red-700 mb-2">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                <li>The folder "{convertEmojis(folderToDelete.name)}"</li>
                <li>{folderJourneyCounts[folderToDelete.id] || 0} user journey(s) inside it</li>
                <li>Any subfolders and their contents</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[180px]"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 100)}px`,
          }}
        >
          {contextMenu.journey && contextMenu.journey.status === 'published' && (
            <button
              onClick={() => handleCopyLink(contextMenu.journey!)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <LinkIcon size={16} />
              <span>Copy link</span>
            </button>
          )}
          {(contextMenu.journey || contextMenu.folder) && (
            <button
              onClick={() => {
                if (contextMenu.journey) {
                  handleMoveClick(contextMenu.journey)
                } else if (contextMenu.folder) {
                  handleMoveFolderClick(contextMenu.folder)
                }
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
            >
              <Move size={16} />
              <span>Move</span>
            </button>
          )}
        </div>
      )}

      {/* Move Journey/Folder Modal */}
      {showMoveModal && (journeyToMove || folderToMove) && (
        <Modal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false)
            setJourneyToMove(null)
            setFolderToMove(null)
            setSelectedMoveFolder('')
          }}
          title={journeyToMove ? "Move User Journey" : "Move Folder"}
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowMoveModal(false)
                  setJourneyToMove(null)
                  setFolderToMove(null)
                  setSelectedMoveFolder('')
                }}
                disabled={movingJourney || movingFolder}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMoveConfirm}
                disabled={movingJourney || movingFolder}
              >
                {(movingJourney || movingFolder) ? 'Moving...' : 'Move'}
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Move "<strong>{convertEmojis(journeyToMove?.name || folderToMove?.name || '')}</strong>" to a folder:
            </p>
            <div>
              <select
                value={selectedMoveFolder}
                onChange={(e) => setSelectedMoveFolder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={movingJourney || movingFolder}
              >
                <option value="">No folder (root)</option>
                {folders
                  .filter(folder => {
                    // Don't show current folder or the folder being moved (to prevent moving into itself)
                    if (journeyToMove) {
                      return folder.id !== journeyToMove.folder_id
                    } else if (folderToMove) {
                      // Prevent moving folder into itself or its own descendants
                      return folder.id !== folderToMove.id && 
                             !isDescendantOf(folder.id, folderToMove.id)
                    }
                    return true
                  })
                  .map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {convertEmojis(folder.name)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Journey Modal */}
      {showEditModal && journeyToEdit && (
        <EditJourneyModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setJourneyToEdit(null)
            setSelectedLawFirmIds([])
            setLawFirmSearchQuery('')
          }}
          onSave={saveEdit}
          journeyName={editForm.name}
          journeyDescription={editForm.description}
          journeyLayout={editForm.layout}
          journeyStatus={editForm.status}
          selectedProjectId={editForm.project_id}
          selectedLawFirmIds={selectedLawFirmIds}
          lawFirmSearchQuery={lawFirmSearchQuery}
          projects={projects}
          lawFirms={lawFirms}
          onNameChange={(name) => setEditForm(prev => ({ ...prev, name }))}
          onDescriptionChange={(description) => setEditForm(prev => ({ ...prev, description }))}
          onLayoutChange={(layout) => setEditForm(prev => ({ ...prev, layout }))}
          onStatusChange={(status) => setEditForm(prev => ({ ...prev, status }))}
          onProjectChange={(project_id) => setEditForm(prev => ({ ...prev, project_id }))}
          onLawFirmSearchChange={setLawFirmSearchQuery}
          onLawFirmToggle={(firmId, checked) => {
            if (checked) {
              setSelectedLawFirmIds(prev => [...prev, firmId])
            } else {
              setSelectedLawFirmIds(prev => prev.filter(id => id !== firmId))
            }
          }}
          onAddLawFirmClick={() => setShowAddLawFirmModal(true)}
        />
      )}

      {/* Add Law Firm Modal - Opens from Edit Journey Details when no search results */}
      <LawFirmForm
        isOpen={showAddLawFirmModal}
        isEditing={false}
        lawFirm={newLawFirm}
        loading={creatingLawFirm}
        onUpdate={(updates) => setNewLawFirm({ ...newLawFirm, ...updates })}
        onSubmit={handleCreateLawFirmFromModal}
        onClose={() => {
          setNewLawFirm({ name: '', structure: 'decentralised', status: 'active', top_4: false })
          setShowAddLawFirmModal(false)
        }}
      />

      {/* Add to Folder Modal */}
      <Modal
        isOpen={showAddToFolderModal}
        onClose={() => setShowAddToFolderModal(false)}
        title="Add to Folder"
        size="sm"
        footerContent={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowAddToFolderModal(false)}
              disabled={assigningToFolder}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAssignToFolder}
              disabled={!selectedFolderForAssignment || assigningToFolder}
              loading={assigningToFolder}
            >
              Assign to Folder
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            Assign <strong>{selectedJourneys.length}</strong> selected user journey{selectedJourneys.length > 1 ? 's' : ''} to a folder:
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Folder
            </label>
            <select
              value={selectedFolderForAssignment}
              onChange={(e) => setSelectedFolderForAssignment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            >
              <option value="">Choose a folder...</option>
              <option value="none">Remove from folder</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          
          {folders.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No folders available. Create a folder first using the "Add Folder" button.
            </p>
          )}
        </div>
      </Modal>

    </div>
  )
}
