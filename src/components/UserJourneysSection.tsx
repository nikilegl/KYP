import React, { useState, useEffect } from 'react'
import { GitBranch, Plus, Edit, Trash2, Users, ArrowRight } from 'lucide-react'
import { StakeholderTag } from './common/StakeholderTag'
import { 
  getUserJourneys, 
  createUserJourney, 
  updateUserJourney, 
  deleteUserJourney,
  getUserJourneyStakeholders
} from '../lib/database'
import { UserJourneyEditor } from './UserJourneyEditor'
import type { UserJourney, Stakeholder, UserRole, LawFirm } from '../lib/supabase'

interface UserJourneysSectionProps {
  projectId: string
  assignedStakeholders: Stakeholder[]
  userRoles: UserRole[]
  userPermissions: UserPermission[]
  lawFirms: LawFirm[]
}

export function UserJourneysSection({ 
  projectId, 
  assignedStakeholders, 
  userRoles, 
  userPermissions,
  lawFirms 
}: UserJourneysSectionProps) {
  const [userJourneys, setUserJourneys] = useState<UserJourney[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingJourney, setEditingJourney] = useState<UserJourney | null>(null)
  const [selectedJourney, setSelectedJourney] = useState<UserJourney | null>(null)
  const [newJourney, setNewJourney] = useState({ name: '', stakeholderIds: [] as string[] })
  const [journeyStakeholders, setJourneyStakeholders] = useState<Record<string, string[]>>({})

  useEffect(() => {
    loadUserJourneys()
  }, [projectId])

  const loadUserJourneys = async () => {
    try {
      setLoading(true)
      const journeys = await getUserJourneys(projectId)
      setUserJourneys(journeys)
      
      // Load stakeholder assignments for each journey
      const stakeholderMap: Record<string, string[]> = {}
      for (const journey of journeys) {
        const stakeholderIds = await getUserJourneyStakeholders(journey.id)
        stakeholderMap[journey.id] = stakeholderIds
      }
      setJourneyStakeholders(stakeholderMap)
    } catch (error) {
      console.error('Error loading user journeys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJourney = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const journey = await createUserJourney(projectId, newJourney.name, newJourney.stakeholderIds)
      if (journey) {
        setUserJourneys([journey, ...userJourneys])
        setJourneyStakeholders(prev => ({
          ...prev,
          [journey.id]: newJourney.stakeholderIds
        }))
        setNewJourney({ name: '', stakeholderIds: [] })
        setShowCreateForm(false)
      }
    } catch (error) {
      console.error('Error creating user journey:', error)
    }
  }

  const handleUpdateJourney = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingJourney) return
    
    try {
      const updated = await updateUserJourney(
        editingJourney.id, 
        { name: editingJourney.name },
        journeyStakeholders[editingJourney.id] || []
      )
      if (updated) {
        setUserJourneys(userJourneys.map(j => j.id === updated.id ? updated : j))
        setEditingJourney(null)
      }
    } catch (error) {
      console.error('Error updating user journey:', error)
    }
  }

  const handleDeleteJourney = async (journeyId: string) => {
    if (window.confirm('Are you sure you want to delete this user journey? This will also delete all its nodes.')) {
      try {
        const success = await deleteUserJourney(journeyId)
        if (success) {
          setUserJourneys(userJourneys.filter(j => j.id !== journeyId))
          const { [journeyId]: removed, ...rest } = journeyStakeholders
          setJourneyStakeholders(rest)
        }
      } catch (error) {
        console.error('Error deleting user journey:', error)
      }
    }
  }

  const getAssignedStakeholdersList = (journeyId: string) => {
    const stakeholderIds = journeyStakeholders[journeyId] || []
    return assignedStakeholders.filter(stakeholder => 
      stakeholderIds.includes(stakeholder.id)
    )
  }

  const getUserRoleById = (roleId?: string) => {
    if (!roleId) return null
    return userRoles.find(role => role.id === roleId)
  }

  const getLawFirmById = (firmId?: string) => {
    if (!firmId) return null
    return lawFirms.find(firm => firm.id === firmId)
  }

  // If a journey is selected for editing, show the editor
  if (selectedJourney) {
    return (
      <UserJourneyEditor
        journey={selectedJourney}
        assignedStakeholders={assignedStakeholders}
        userRoles={userRoles}
        lawFirms={lawFirms}
        onBack={() => setSelectedJourney(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User Journeys</h2>
          <p className="text-gray-600">Map user journeys and decision flows for this project</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Create Journey
        </button>
      </div>

      {/* Create Journey Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User Journey</h3>
          <form onSubmit={handleCreateJourney} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Journey Name</label>
              <input
                type="text"
                value={newJourney.name}
                onChange={(e) => setNewJourney({ ...newJourney, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="e.g., User Onboarding Flow"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign Stakeholders (Optional)</label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {assignedStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500">No stakeholders assigned to this project</p>
                ) : (
                  assignedStakeholders.map((stakeholder) => (
                    <label key={stakeholder.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newJourney.stakeholderIds.includes(stakeholder.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewJourney({
                              ...newJourney,
                              stakeholderIds: [...newJourney.stakeholderIds, stakeholder.id]
                            })
                          } else {
                            setNewJourney({
                              ...newJourney,
                              stakeholderIds: newJourney.stakeholderIds.filter(id => id !== stakeholder.id)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{stakeholder.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Create Journey
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Journey Form */}
      {editingJourney && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit User Journey</h3>
          <form onSubmit={handleUpdateJourney} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Journey Name</label>
              <input
                type="text"
                value={editingJourney.name}
                onChange={(e) => setEditingJourney({ ...editingJourney, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign Stakeholders (Optional)</label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {assignedStakeholders.length === 0 ? (
                  <p className="text-sm text-gray-500">No stakeholders assigned to this project</p>
                ) : (
                  assignedStakeholders.map((stakeholder) => (
                    <label key={stakeholder.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(journeyStakeholders[editingJourney.id] || []).includes(stakeholder.id)}
                        onChange={(e) => {
                          const currentIds = journeyStakeholders[editingJourney.id] || []
                          if (e.target.checked) {
                            setJourneyStakeholders({
                              ...journeyStakeholders,
                              [editingJourney.id]: [...currentIds, stakeholder.id]
                            })
                          } else {
                            setJourneyStakeholders({
                              ...journeyStakeholders,
                              [editingJourney.id]: currentIds.filter(id => id !== stakeholder.id)
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{stakeholder.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="submit" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Update Journey
              </button>
              <button
                type="button"
                onClick={() => setEditingJourney(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Journeys List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userJourneys.map((journey) => (
          <div 
            key={journey.id} 
            className="bg-white rounded-xl px-6 pt-6 pb-4 border border-gray-200 hover:shadow-md transition-all cursor-pointer"
            onClick={() => setSelectedJourney(journey)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <GitBranch size={20} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{journey.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(journey.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteJourney(journey.id)
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Delete journey"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Assigned Stakeholders */}
     <div class ="mb-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Assigned Stakeholders</p>
              <div className="flex flex-wrap gap-1">
                {getAssignedStakeholdersList(journey.id).map((stakeholder) => {
                  const userRole = getUserRoleById(stakeholder.user_role_id)
                  return (
                    <StakeholderTag
                      key={stakeholder.id}
                      stakeholder={stakeholder}
                      userRole={userRole}
                      size="sm"
                    />
                  )
                })}
                {getAssignedStakeholdersList(journey.id).length === 0 && (
                  <span className="text-xs text-gray-500">No stakeholders assigned</span>
                )}
              </div>
     </div>
            
            <div className="flex justify-between items-center">
            </div>
          </div>
        ))}
        
        {userJourneys.length === 0 && (
          <div className="col-span-full text-center py-12">
            <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No user journeys yet. Create your first journey to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}