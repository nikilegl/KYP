import React, { useState, useEffect } from 'react'
import { ArrowLeft, FileText, GitBranch, Edit, Star } from 'lucide-react'
import { UserRoleTag } from './common/UserRoleTag'
import { CopyLinkButton } from './common/CopyLinkButton'
import { updateStakeholder, getProjectsForStakeholder, getResearchNotesForStakeholder, getUserJourneysForStakeholder, getProjects, assignStakeholderToProject } from '../lib/database'
import { getStructureTagStyles } from '../utils/structureTagStyles'
import { StakeholderSummary } from './StakeholderDetail/StakeholderSummary'
import { StakeholderNotes } from './StakeholderDetail/StakeholderNotes'
import { StakeholderProjects } from './StakeholderDetail/StakeholderProjects'
import { StakeholderForm } from './StakeholderManager/StakeholderForm'
import type { Stakeholder, UserRole, LawFirm, Project, ResearchNote, UserJourney } from '../lib/supabase'

interface StakeholderDetailProps {
  stakeholder: Stakeholder
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  userPermissions: UserPermission[]
  origin: 'project' | 'manager'
  backButtonText: string
  onBack: () => void
  onUpdate: (updates: Partial<Stakeholder>) => void
}

export function StakeholderDetail({ 
  stakeholder, 
  userRoles, 
  lawFirms, 
  userPermissions,
  origin,
  backButtonText,
  onBack, 
  onUpdate 
}: StakeholderDetailProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [researchNotes, setResearchNotes] = useState<ResearchNote[]>([])
  const [userJourneys, setUserJourneys] = useState<UserJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStakeholderData, setEditingStakeholderData] = useState({
    name: '',
    user_role_id: '',
    law_firm_id: '',
    user_permission_id: '',
    visitor_id: '',
    department: '',
    pendo_role: ''
  })
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    loadStakeholderData()
  }, [stakeholder.id])

  const loadStakeholderData = async () => {
    try {
      setLoading(true)
      const [projectsData, notesData, journeysData] = await Promise.all([
        getProjectsForStakeholder(stakeholder.id),
        getResearchNotesForStakeholder(stakeholder.id),
        getUserJourneysForStakeholder(stakeholder.id)
      ])
      
      setProjects(projectsData)
      setResearchNotes(notesData)
      setUserJourneys(journeysData)
    } catch (error) {
      console.error('Error loading stakeholder data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async (notes: string) => {
    const updates = { notes }
    const updatedStakeholder = await updateStakeholder(stakeholder.id, updates)
    
    if (updatedStakeholder) {
      onUpdate(updates)
    }
  }

  const handleOpenEditModal = () => {
    setEditingStakeholderData({
      name: stakeholder.name,
      user_role_id: stakeholder.user_role_id || '',
      law_firm_id: stakeholder.law_firm_id || '',
      user_permission_id: stakeholder.user_permission_id || '',
      visitor_id: stakeholder.visitor_id || '',
      department: stakeholder.department || '',
      pendo_role: stakeholder.pendo_role || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEditedStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEdit(true)
    
    try {
      const updates = {
        name: editingStakeholderData.name,
        user_role_id: editingStakeholderData.user_role_id || undefined,
        law_firm_id: editingStakeholderData.law_firm_id || undefined,
        user_permission_id: editingStakeholderData.user_permission_id || undefined,
        visitor_id: editingStakeholderData.visitor_id || undefined,
        department: editingStakeholderData.department || undefined,
        pendo_role: editingStakeholderData.pendo_role || undefined
      }
      
      await onUpdate(updates)
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating stakeholder:', error)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleEditFormChange = (updates: Partial<{ name: string; user_role_id: string; law_firm_id: string; user_permission_id: string }>) => {
    setEditingStakeholderData({ ...editingStakeholderData, ...updates })
  }

  const handleProjectClick = (project: Project) => {
    // Navigate to the project detail page
    window.location.href = `/project/${project.short_id}`
  }

  const handleNoteClick = (note: ResearchNote) => {
    // Navigate to the note detail page
    window.location.href = `/note/${note.short_id}`
  }

  const handleJourneyClick = (journey: UserJourney) => {
    // Navigate to the user journey detail page
    window.location.href = `/user-journey/${journey.short_id}`
  }

  const getUserRole = () => {
    if (!stakeholder.user_role_id) return null
    return userRoles.find(role => role.id === stakeholder.user_role_id)
  }

  const getUserPermission = () => {
    if (!stakeholder.user_permission_id) return null
    return userPermissions.find(permission => permission.id === stakeholder.user_permission_id)
  }

  const getLawFirm = () => {
    if (!stakeholder.law_firm_id) return null
    return lawFirms.find(firm => firm.id === stakeholder.law_firm_id)
  }

  const userRole = getUserRole()
  const userPermission = getUserPermission()
  const lawFirm = getLawFirm()

  return (
    <div className="h-full flex flex-col w-full">
      {/* Full-width page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        <div className="flex justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft size={20} />
              {backButtonText}
            </button>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{stakeholder.name}</h2>
              {userRole && <UserRoleTag userRole={userRole} size="md" />}
            </div>
            
            {/* Tags */}
            <div className="flex items-center gap-2">
              {lawFirm && (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-gray-700">{lawFirm.name}</span>
                    {lawFirm.top_4 && (
                      <Star size={14} className="text-yellow-500 fill-current" />
                    )}
                  </div>
                  <span 
                    className={getStructureTagStyles(lawFirm.structure).className}
                    style={getStructureTagStyles(lawFirm.structure).style}
                  >
                    {lawFirm.structure === 'centralised' ? 'Centralised' : 'Decentralised'}
                  </span>
                </>
              )}
              {userPermission && (
                <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-700">
                  {userPermission.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleOpenEditModal}
              className="flex text-sm gap-2 px-4 py-2 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
            >
              <Edit size={16} />
              Edit
            </button>
            <CopyLinkButton entityType="stakeholder" shortId={stakeholder.short_id} />
          </div>
        </div>
      </div>

      {/* Content with normal padding */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full space-y-6 p-6">
          <StakeholderSummary
            projects={projects}
            researchNotes={researchNotes}
            userJourneys={userJourneys}
          />

          <StakeholderNotes
            notes={stakeholder.notes || ''}
            onSave={handleSaveNotes}
          />

          <StakeholderProjects
            projects={projects}
            loading={loading}
            onProjectClick={handleProjectClick}
          />

          {/* Research Notes */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notes & Calls ({researchNotes.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : researchNotes.length > 0 ? (
              <div className="space-y-3">
                {researchNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleNoteClick(note)}
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FileText size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{note.name}</p>
                     
                      <p className="text-xs text-gray-500 mt-1">
                        Created {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Not tagged in any notes & calls yet.</p>
              </div>
            )}
          </div>

          {/* User Journeys */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              User Journeys ({userJourneys.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : userJourneys.length > 0 ? (
              <div className="space-y-3">
                {userJourneys.map((journey) => (
                  <div 
                    key={journey.id} 
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleJourneyClick(journey)}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <GitBranch size={20} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{journey.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {new Date(journey.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Not assigned to any user journeys yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Stakeholder Modal */}
      {showEditModal && (
        <StakeholderForm
          isVisible={true}
          isEditing={true}
          stakeholder={editingStakeholderData}
          userRoles={userRoles}
          lawFirms={lawFirms}
          userPermissions={userPermissions}
          loading={savingEdit}
          onSubmit={handleSaveEditedStakeholder}
          onChange={handleEditFormChange}
          onCancel={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}