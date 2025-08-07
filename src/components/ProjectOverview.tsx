import React from 'react'
import { Check, X } from 'lucide-react'
import { FolderOpen, Users, FileText, Edit, AlertTriangle, TrendingUp, CheckSquare, Star, BarChart, Palette } from 'lucide-react'
import { UserRoleTag } from './common/UserRoleTag'
import { StructureTag } from '../utils/structureTagStyles'
import { CopyLinkButton } from './common/CopyLinkButton'
import { PROGRESS_QUESTIONS } from '../lib/database'
import type { Project, ResearchNote, UserStory, UserJourney, Design, Stakeholder, UserRole, LawFirm, Task, ProblemOverview } from '../lib/supabase'
import type { ProjectProgressStatus } from '../lib/supabase'

interface ProjectOverviewProps {
  project: Project
  assignedStakeholders: Stakeholder[]
  notes: ResearchNote[]
  tasks: Task[]
  problemOverview: ProblemOverview
  userRoles: UserRole[]
  lawFirms: LawFirm[]
  allProjectProgressStatus: ProjectProgressStatus[]
  onProblemOverviewChange?: (updates: Partial<ProblemOverview>) => void
  onSaveProblemOverview?: (updates?: Partial<ProblemOverview>) => Promise<void>
  projectTasks: Task[]
  onNavigateToStakeholders?: () => void
}

export function ProjectOverview({ 
  project, 
  assignedStakeholders, 
  notes, 
  tasks,
  problemOverview, 
  userRoles, 
  lawFirms,
  allProjectProgressStatus,
  projectTasks,
  onProblemOverviewChange,
  onSaveProblemOverview,
  onNavigateToStakeholders
}: ProjectOverviewProps) {
  const [originalUnderstandingRating, setOriginalUnderstandingRating] = React.useState(problemOverview.understanding_rating)
  const [showUnderstandingButtons, setShowUnderstandingButtons] = React.useState(false)
  const [savingUnderstanding, setSavingUnderstanding] = React.useState(false)
  const [originalRiskLevel, setOriginalRiskLevel] = React.useState(problemOverview.risk_level)
  const [showRiskButtons, setShowRiskButtons] = React.useState(false)
  const [savingRisk, setSavingRisk] = React.useState(false)

  // Update original rating when problemOverview changes (e.g., on page load)
  React.useEffect(() => {
    setOriginalUnderstandingRating(problemOverview.understanding_rating)
    setOriginalRiskLevel(problemOverview.risk_level)
  }, [problemOverview.understanding_rating])

  const handleUnderstandingRatingChange = (newRating: number) => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ understanding_rating: newRating })
    }
    setShowUnderstandingButtons(newRating !== originalUnderstandingRating)
  }

  const handleSaveUnderstandingRating = async () => {
    setSavingUnderstanding(true)
    try {
      if (onSaveProblemOverview) {
        await onSaveProblemOverview()
      }
      setOriginalUnderstandingRating(problemOverview.understanding_rating)
      setShowUnderstandingButtons(false)
    } catch (error) {
      console.error('Error saving understanding rating:', error)
    } finally {
      setSavingUnderstanding(false)
    }
  }

  const handleCancelUnderstandingRating = () => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ understanding_rating: originalUnderstandingRating })
    }
    setShowUnderstandingButtons(false)
  }

  const handleRiskLevelChange = (newRiskLevel: number) => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ risk_level: newRiskLevel })
    }
    setShowRiskButtons(newRiskLevel !== originalRiskLevel)
  }

  const handleSaveRiskLevel = async () => {
    setSavingRisk(true)
    try {
      if (onSaveProblemOverview) {
        await onSaveProblemOverview()
      }
      setOriginalRiskLevel(problemOverview.risk_level)
      setShowRiskButtons(false)
    } catch (error) {
      console.error('Error saving risk level:', error)
    } finally {
      setSavingRisk(false)
    }
  }

  const handleCancelRiskLevel = () => {
    if (onProblemOverviewChange) {
      onProblemOverviewChange({ risk_level: originalRiskLevel })
    }
    setShowRiskButtons(false)
  }

  const getProjectProgressPercentage = (): number => {
    const projectProgressStatuses = allProjectProgressStatus.filter(status => status.project_id === project.id)
    const totalQuestions = Object.keys(PROGRESS_QUESTIONS).length
    
    if (totalQuestions === 0) return 0
    
    const completedQuestions = projectProgressStatuses.filter(status => status.is_completed).length
    return Math.round((completedQuestions / totalQuestions) * 100)
  }

  const getCompletedQuestionsCount = (): number => {
    const projectProgressStatuses = allProjectProgressStatus.filter(status => status.project_id === project.id)
    return projectProgressStatuses.filter(status => status.is_completed).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Overview</h2>
          {project.overview && (
            <p className="text-gray-600 mb-4">{project.overview}</p>
          )}
      
        </div>
        <CopyLinkButton entityType="project" shortId={project.short_id} />
      </div>

      {/* Assigned Stakeholders Breakdown */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Stakeholders Overview</h3>
              <p className="text-sm text-gray-600">{assignedStakeholders.length} stakeholders assigned to this project</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* User Roles Section */}
          <div className="w-full">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">User Roles</h4>
            <div className="space-y-2">
              {(() => {
                const roleBreakdown = new Map<string, { count: number, userRole: UserRole }>()
                
                assignedStakeholders.forEach(stakeholder => {
                  if (stakeholder.user_role_id) {
                    const userRole = userRoles.find(role => role.id === stakeholder.user_role_id)
                    if (userRole) {
                      const roleName = userRole.name
                      
                      if (roleBreakdown.has(roleName)) {
                        roleBreakdown.set(roleName, {
                          count: roleBreakdown.get(roleName)!.count + 1,
                          userRole: userRole
                        })
                      } else {
                        roleBreakdown.set(roleName, { count: 1, userRole: userRole })
                      }
                    } else {
                      // Create a placeholder role for unknown roles
                      const unknownRole: UserRole = {
                        id: 'unknown',
                        workspace_id: '',
                        name: 'Unknown Role',
                        colour: '#9CA3AF',
                        icon: 'Person',
                        created_at: '',
                        updated_at: ''
                      }
                      
                      if (roleBreakdown.has('Unknown Role')) {
                        roleBreakdown.set('Unknown Role', {
                          count: roleBreakdown.get('Unknown Role')!.count + 1,
                          userRole: unknownRole
                        })
                      } else {
                        roleBreakdown.set('Unknown Role', { count: 1, userRole: unknownRole })
                      }
                    }
                  } else {
                    // Create a placeholder role for no role assigned
                    const noRole: UserRole = {
                      id: 'no-role',
                      workspace_id: '',
                      name: 'No Role Assigned',
                      colour: '#9CA3AF',
                      icon: 'Person',
                      created_at: '',
                      updated_at: ''
                    }
                    
                    if (roleBreakdown.has('No Role Assigned')) {
                      roleBreakdown.set('No Role Assigned', {
                        count: roleBreakdown.get('No Role Assigned')!.count + 1,
                        userRole: noRole
                      })
                    } else {
                      roleBreakdown.set('No Role Assigned', { count: 1, userRole: noRole })
                    }
                  }
                })
                
                if (roleBreakdown.size === 0) {
                  return (
                    <p className="text-sm text-gray-500">No stakeholders assigned</p>
                  )
                }
                
                return (
                  <div className="flex flex-wrap gap-2 w-full">
                    {Array.from(roleBreakdown.entries()).map(([roleName, data]) => (
                      <UserRoleTag
                        key={roleName}
                        userRole={data.userRole}
                        count={data.count}
                        size="md"
                      />
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
          
          {/* Law Firms Section */}
          <div className="w-full">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Law Firms</h4>
            <div className="flex flex-wrap gap-2 w-full">
              {(() => {
                const structureBreakdown = new Map<string, number>()
                
                assignedStakeholders.forEach(stakeholder => {
                  if (stakeholder.law_firm_id) {
                    const lawFirm = lawFirms.find(firm => firm.id === stakeholder.law_firm_id)
                    const structure = lawFirm?.structure === 'centralised' ? 'Centralised' : 
                                    lawFirm?.structure === 'decentralised' ? 'Decentralised' : 
                                    'Unknown Structure'
                    
                    if (structureBreakdown.has(structure)) {
                      structureBreakdown.set(structure, structureBreakdown.get(structure)! + 1)
                    } else {
                      structureBreakdown.set(structure, 1)
                    }
                  } else {
                    // Stakeholder without law firm
                    if (structureBreakdown.has('No Firm Assigned')) {
                      structureBreakdown.set('No Firm Assigned', structureBreakdown.get('No Firm Assigned')! + 1)
                    } else {
                      structureBreakdown.set('No Firm Assigned', 1)
                    }
                  }
                })
                
                if (structureBreakdown.size === 0) {
                  return (
                    <p className="text-sm text-gray-500">No stakeholders assigned</p>
                  )
                }
                
                return Array.from(structureBreakdown.entries()).map(([structure, count]) => (
                  <div key={structure}>
                    {structure === 'Centralised' || structure === 'Decentralised' ? (
                      <StructureTag 
                        structure={structure.toLowerCase() as 'centralised' | 'decentralised'}
                        count={count}
                      />
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-2 rounded-full">
                        <span className="text-sm font-medium text-gray-600">{structure}</span>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium bg-gray-400">
                          {count}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Problem Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Progress Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart size={20} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion</span>
              <span className="text-2xl font-bold text-purple-600">{getProjectProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProjectProgressPercentage()}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600">
              {getCompletedQuestionsCount()} of {Object.keys(PROGRESS_QUESTIONS).length} milestones completed
            </div>
          </div>
        </div>

        {/* How well do we understand the problem? */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">How well do we understand the problem?</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Rating</span>
              <span className="text-2xl font-bold text-blue-600">{problemOverview.understanding_rating}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={problemOverview.understanding_rating}
              onChange={(e) => handleUnderstandingRatingChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Poor understanding</span>
              <span>Complete understanding</span>
            </div>
            {showUnderstandingButtons && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveUnderstandingRating}
                  disabled={savingUnderstanding}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Check size={16} />
                  {savingUnderstanding ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelUnderstandingRating}
                  disabled={savingUnderstanding}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* What is the level of risk? */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">What is the level of risk?</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Risk Level</span>
              <span className="text-2xl font-bold text-red-600">{problemOverview.risk_level}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={problemOverview.risk_level}
              onChange={(e) => handleRiskLevelChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low risk</span>
              <span>High risk</span>
            </div>
            {showRiskButtons && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveRiskLevel}
                  disabled={savingRisk}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  <Check size={16} />
                  {savingRisk ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelRiskLevel}
                  disabled={savingRisk}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notes & Calls</h3>
        <div className="space-y-3">
          {notes.slice(0, 3).map((note) => (
            <div key={note.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{note.name}</p>
                  {(() => {
                    const displayDate = note.note_date ? new Date(note.note_date) : new Date(note.created_at)
                    const isFutureDate = displayDate > new Date()
                    return isFutureDate ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Upcoming
                      </span>
                    ) : null
                  })()}
                </div>
                <p className="text-sm text-gray-500">
                  {note.note_date 
                    ? new Date(note.note_date).toLocaleDateString()
                    : `Created ${new Date(note.created_at).toLocaleDateString()}`
                  }
                </p>
              </div>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-gray-500 text-center py-4">No notes & calls yet</p>
          )}
        </div>
      </div>
    </div>
  )
}