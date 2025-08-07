import React from 'react'
import { ProjectDataFetcher } from './ProjectDashboard/ProjectDataFetcher'
import type { Project, ResearchNote, UserStory, UserJourney, WorkspaceUser } from '../lib/supabase'

interface ProjectDashboardProps {
  project: Project
  onBack: () => void
  initialSelectedNote?: ResearchNote | null
  initialView?: string
  initialSelectedUserStory?: UserStory | null
  initialSelectedUserJourney?: UserJourney | null
  initialUserStoryRoleIds?: string[]
  initialSelectedDesign?: Design | null
  workspaceUsers: WorkspaceUser[]
  onNavigateToWorkspace?: (view: string) => void
  onSignOut?: () => void
}

export function ProjectDashboard({ 
  project, 
  onBack, 
  initialSelectedNote = null,
  initialView = 'dashboard',
  initialSelectedUserStory = null,
  initialSelectedUserJourney = null,
  initialUserStoryRoleIds = [],
  initialSelectedDesign = null,
  workspaceUsers,
  onNavigateToWorkspace, 
  onSignOut 
}: ProjectDashboardProps) {
  return (
    <ProjectDataFetcher
      project={project}
      initialSelectedNote={initialSelectedNote}
      initialView={initialView}
      initialSelectedUserStory={initialSelectedUserStory}
      initialSelectedUserJourney={initialSelectedUserJourney}
      initialUserStoryRoleIds={initialUserStoryRoleIds}
      initialSelectedDesign={initialSelectedDesign}
      workspaceUsers={workspaceUsers}
      onBack={onBack}
      onNavigateToWorkspace={onNavigateToWorkspace}
      onSignOut={onSignOut}
    />
  )
}