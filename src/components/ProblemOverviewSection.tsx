import React from 'react'
import { EditableContentSection } from './common/EditableContentSection'
import type { Project, ProblemOverview } from '../lib/supabase'

interface ProblemOverviewSectionProps {
  project: Project
  problemOverview: ProblemOverview
  onSaveProblemOverview: (updates: Partial<ProblemOverview>) => Promise<void>
}

export function ProblemOverviewSection({ 
  project, 
  problemOverview, 
  onSaveProblemOverview 
}: ProblemOverviewSectionProps) {
  const handleSaveWhatIsTheProblem = async (content: string) => {
    await onSaveProblemOverview({ what_is_the_problem: content })
  }

  const handleSaveShouldWeSolveIt = async (content: string) => {
    await onSaveProblemOverview({ should_we_solve_it: content })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Problem Definition</h2>
        <p className="text-gray-600">Define and assess the problem for {project.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <EditableContentSection
          title="What is the problem?"
          initialContent={problemOverview.what_is_the_problem || ''}
          placeholder="Describe the problem you're trying to solve..."
          onSave={handleSaveWhatIsTheProblem}
        />

        <EditableContentSection
          title="Should we solve it?"
          initialContent={problemOverview.should_we_solve_it || ''}
          placeholder="Explain why this problem is worth solving..."
          onSave={handleSaveShouldWeSolveIt}
        />
      </div>
    </div>
  )
}