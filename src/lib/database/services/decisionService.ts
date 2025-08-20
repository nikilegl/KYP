import { supabase, isSupabaseConfigured } from '../../supabase'
import type { ResearchNote, UserStory, Design } from '../../supabase'

export interface ProjectDecision {
  id: string
  content: string
  source_type: 'note' | 'user_story' | 'design'
  source_id: string
  source_name: string
  source_short_id?: number
  created_at: string
  updated_at?: string
  user_id?: string
}

export const getProjectDecisions = async (projectId: string): Promise<ProjectDecision[]> => {
  console.log('🔵 getProjectDecisions called for project:', projectId)
  
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const decisions: ProjectDecision[] = []
      
      // Get decisions from notes (research_notes.decision_text column)
      const notes = JSON.parse(localStorage.getItem('kyp_research_notes') || '[]') as ResearchNote[]
      const projectNotes = notes.filter(note => note.project_id === projectId)
      
      projectNotes.forEach(note => {
        if (note.decision_text && note.decision_text.length > 0) {
          note.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `note-${note.id}-${index}`,
                content: content,
                source_type: 'note',
                source_id: note.id,
                source_name: note.name,
                source_short_id: note.short_id,
                created_at: note.created_at,
                updated_at: note.updated_at
              })
            }
          })
        }
      })
      
      // Get decisions from user stories
      const userStories = JSON.parse(localStorage.getItem('kyp_user_stories') || '[]') as UserStory[]
      const projectUserStories = userStories.filter(story => story.project_id === projectId)
      
      projectUserStories.forEach(story => {
        if (story.decision_text && story.decision_text.length > 0) {
          story.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
        
        if (story.decision_text2 && story.decision_text2.length > 0) {
          story.decision_text2.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-2-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
      })
      
      // Get decisions from design assets
      const designs = JSON.parse(localStorage.getItem('kyp_assets') || '[]') as Design[]
      const projectDesigns = designs.filter(design => design.project_id === projectId)
      
      projectDesigns.forEach(design => {
        if (design.decision_text && design.decision_text.length > 0) {
          design.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `design-${design.id}-${index}`,
                content: content,
                source_type: 'design',
                source_id: design.id,
                source_name: design.name,
                source_short_id: design.short_id,
                created_at: design.created_at,
                updated_at: design.updated_at
              })
            }
          })
        }
      })
      
      // Sort by created_at (newest first)
      console.log('🔵 Total decisions found (localStorage):', decisions.length)
      return decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('Error fetching decisions locally:', error)
      return []
    }
  }

  try {
    const decisions: ProjectDecision[] = []
    
    // Get decisions from notes (research_notes.decision_text column)
    const { data: notes, error: noteError } = await supabase
      .from('research_notes')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (noteError) throw noteError

    if (notes) {
      console.log('🔵 Found', notes.length, 'notes with decision_text')
      notes.forEach((note: ResearchNote) => {
        if (note.decision_text && note.decision_text.length > 0) {
          console.log(`🔵 Note "${note.name}" has ${note.decision_text.length} decisions:`, note.decision_text)
          note.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `note-${note.id}-${index}`,
                content: content,
                source_type: 'note',
                source_id: note.id,
                source_name: note.name,
                source_short_id: note.short_id,
                created_at: note.created_at,
                updated_at: note.updated_at
              })
            }
          })
        }
      })
    } else {
      console.log('🔵 No notes found with decision_text')
    }
    
    // Get decisions from user stories
    const { data: userStories, error: userStoryError } = await supabase
      .from('user_stories')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (userStoryError) throw userStoryError

    if (userStories) {
      console.log('🔵 Found', userStories.length, 'user stories with decision_text')
      userStories.forEach((story: UserStory) => {
        if (story.decision_text && story.decision_text.length > 0) {
          story.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
        
        if (story.decision_text2 && story.decision_text2.length > 0) {
          story.decision_text2.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `user-story-2-${story.id}-${index}`,
                content: content,
                source_type: 'user_story',
                source_id: story.id,
                source_name: story.name,
                source_short_id: story.short_id,
                created_at: story.created_at,
                updated_at: story.updated_at
              })
            }
          })
        }
      })
    }
    
    // Get decisions from design assets (assets table)
    const { data: designs, error: designError } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', projectId)
      .not('decision_text', 'is', null)
      .order('created_at', { ascending: false })

    if (designError) throw designError

    if (designs) {
      console.log('🔵 Found', designs.length, 'designs with decision_text')
      designs.forEach((design: Design) => {
        if (design.decision_text && design.decision_text.length > 0) {
          design.decision_text.forEach((decisionText, index) => {
            if (decisionText && decisionText.trim()) {
              // Parse timestamp|text format if present
              const content = decisionText.includes('|') 
                ? decisionText.split('|').slice(1).join('|')
                : decisionText
              
              decisions.push({
                id: `design-${design.id}-${index}`,
                content: content,
                source_type: 'design',
                source_id: design.id,
                source_name: design.name,
                source_short_id: design.short_id,
                created_at: design.created_at,
                updated_at: design.updated_at
              })
            }
          })
        }
      })
    }
    
    // Sort by created_at (newest first)
    console.log('🔵 Total decisions found:', decisions.length)
    return decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch (error) {
    console.error('Error fetching project decisions:', error)
    return []
  }
}
