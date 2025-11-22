import React, { useState, useEffect } from 'react'
import { ArrowLeft, Palette, Edit } from 'lucide-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { CopyLinkButton } from './common/CopyLinkButton'
import { EditDesignModal } from './DesignsSection/EditDesignModal'
import { HistorySection } from './common/HistorySection'
import { DesignLinkedContentSection } from './DesignDetail/DesignLinkedContentSection'
import { DesignPreviewSection } from './DesignDetail/DesignPreviewSection'
import { DesignLightbox } from './DesignDetail/DesignLightbox'
import { 
  getAssetByShortId as getDesignByShortId, 
  updateAsset as updateDesign,
  getAssetComments as getDesignComments,
  createAssetComment as createDesignComment,
  updateAssetComment as updateDesignComment,
  deleteAssetComment as deleteDesignComment,
  getUserStoriesForAsset as getUserStoriesForDesign,
  getResearchNotesForAsset as getResearchNotesForDesign
} from '../lib/database'
import { getUserStories, getResearchNotes } from '../lib/database'
import type { Design, DesignComment, UserStory, ResearchNote, WorkspaceUser } from '../lib/supabase'

interface DesignDetailProps {
  designShortId: number
  availableUsers?: WorkspaceUser[]
  onBack: () => void
}

export function DesignDetail({ designShortId, availableUsers = [], onBack }: DesignDetailProps) {
  const { user } = useAuth()
  const [design, setDesign] = useState<Design | null>(null)
  const [comments, setComments] = useState<DesignComment[]>([])
  const [linkedUserStories, setLinkedUserStories] = useState<UserStory[]>([])
  const [linkedResearchNotes, setLinkedResearchNotes] = useState<ResearchNote[]>([])
  const [allUserStories, setAllUserStories] = useState<UserStory[]>([])
  const [allResearchNotes, setAllResearchNotes] = useState<ResearchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const [savingDecision, setSavingDecision] = useState(false)

  useEffect(() => {
    loadDesignData()
  }, [designShortId])

  const loadDesignData = async () => {
    try {
      setLoading(true)
      
      const designData = await getDesignByShortId(designShortId)
      
      if (!designData) {
        console.error('Design not found')
        return
      }
      
      setDesign(designData)
      
      // Load related data
      const [
        commentsData,
        userStoriesData,
        researchNotesData,
        allUserStoriesData,
        allResearchNotesData
      ] = await Promise.all([
        getDesignComments(designData.id),
        getUserStoriesForDesign(designData.id),
        getResearchNotesForDesign(designData.id),
        getUserStories(designData.project_id),
        getResearchNotes()
      ])
      
      setComments(commentsData)
      setLinkedUserStories(userStoriesData)
      setLinkedResearchNotes(researchNotesData.filter(note => note.project_id === designData.project_id))
      setAllUserStories(allUserStoriesData)
      setAllResearchNotes(allResearchNotesData.filter(note => note.project_id === designData.project_id))
    } catch (error) {
      console.error('Error loading design data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateDesign = async (designData: {
    name: string
    snapshotImageUrl?: string
    description?: string
    linkUrl?: string
    userStoryIds: string[]
    researchNoteIds: string[]
  }) => {
    if (!design) return
    
    try {
      const updatedDesign = await updateDesign(design.id, {
        name: designData.name,
        snapshot_image_url: designData.snapshotImageUrl,
        description: designData.description,
        link_url: designData.linkUrl
      }, designData.userStoryIds, designData.researchNoteIds)
      
      if (updatedDesign) {
        setDesign(updatedDesign)
        setShowEditModal(false)
        // Reload linked content
        const [userStoriesData, researchNotesData] = await Promise.all([
          getUserStoriesForDesign(design.id),
          getResearchNotesForDesign(design.id)
        ])
        setLinkedUserStories(userStoriesData)
        setLinkedResearchNotes(researchNotesData.filter(note => note.project_id === design.project_id))
      }
    } catch (error) {
      console.error('Error updating design:', error)
    }
  }

  const handleAddComment = async (commentText: string) => {
    if (!user || !design) return
    
    setSaving(true)
    try {
      const comment = await createDesignComment(design.id, commentText, user.id)
      if (comment) {
        setComments([comment, ...comments])
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditComment = async (commentId: string, commentText: string) => {
    if (!commentText.trim()) return
    
    setSaving(true)
    try {
      const updatedComment = await updateDesignComment(commentId, commentText)
      if (updatedComment) {
        setComments(comments.map(comment => 
          comment.id === commentId ? updatedComment : comment
        ))
      }
    } catch (error) {
      console.error('Error updating comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    setSaving(true)
    try {
      const success = await deleteDesignComment(commentId)
      if (success) {
        setComments(comments.filter(comment => comment.id !== commentId))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDecision = async (decisionText: string) => {
    if (!design) return
    
    setSavingDecision(true)
    try {
      const currentDecisions = design.decision_text || []
      // Create a decision with timestamp like in UserStoryDetail
      const newDecisionWithTimestamp = `${new Date().toISOString()}|${decisionText}`
      const updatedDecisions = [...currentDecisions, newDecisionWithTimestamp]
      
      // Update the design with new decision
      const updatedDesign = await updateDesign(design.id, {
        decision_text: updatedDecisions
      }, [], [])
      
      if (updatedDesign) {
        setDesign(updatedDesign)
      }
    } catch (error) {
      console.error('Error updating decision:', error)
      throw error
    } finally {
      setSavingDecision(false)
    }
  }

  const handleEditDecision = async (decisionIndex: number, decisionText: string) => {
    if (!design) return
    
    setSavingDecision(true)
    try {
      const currentDecisions = design.decision_text || []
      const updatedDecisions = [...currentDecisions]
      
      // Extract the original timestamp if it exists, otherwise use current time
      const originalDecision = updatedDecisions[decisionIndex]
      const timestampMatch = originalDecision?.match(/^(.+?)\|(.+)$/)
      const originalTimestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString()
      
      // Preserve the original timestamp but update the text
      updatedDecisions[decisionIndex] = `${originalTimestamp}|${decisionText}`
      
      const updatedDesign = await updateDesign(design.id, {
        decision_text: updatedDecisions
      }, [], [])
      
      if (updatedDesign) {
        setDesign(updatedDesign)
      }
    } catch (error) {
      console.error('Error editing decision:', error)
      throw error
    } finally {
      setSavingDecision(false)
    }
  }

  const handleDeleteDecision = async (decisionIndex: number) => {
    if (!design) return
    
    setSavingDecision(true)
    try {
      const currentDecisions = design.decision_text || []
      const updatedDecisions = currentDecisions.filter((_, index) => index !== decisionIndex)
      
      const updatedDesign = await updateDesign(design.id, {
        decision_text: updatedDecisions
      }, [], [])
      
      if (updatedDesign) {
        setDesign(updatedDesign)
      }
    } catch (error) {
      console.error('Error deleting decision:', error)
      throw error
    } finally {
      setSavingDecision(false)
    }
  }

  const handleImageClick = () => {
    if (design?.snapshot_image_url) {
      setShowLightbox(true)
    }
  }

  const handleCloseLightbox = () => {
    setShowLightbox(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!design) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Palette size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Design not found</p>
        </div>
      </div>
    )
  }

  const linkedUserStoryIds = linkedUserStories.map(story => story.id)
  const linkedResearchNoteIds = linkedResearchNotes.map(note => note.id)

  return (
    <div className="h-screen flex flex-col w-full relative">
      {/* Full-width page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 w-full">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3"
            >
              <ArrowLeft size={20} />
              Back to Designs
            </button>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{design.name}</h2>
            </div>
            
            {design.description && (
              <p className="text-gray-600 mb-2">{design.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{comments.length} comments</span>
              <span>•</span>
              <span>Created {new Date(design.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Edit size={14} />
              Edit
            </button>
            <CopyLinkButton entityType="design" shortId={design.short_id || 0} />
          </div>
        </div>
      </div>

      {/* Content with normal padding */}
      <div className="flex-1 w-full flex">
        <div className="flex-1 space-y-6 p-6">
          {/* Design Image */}
          <DesignPreviewSection 
            design={design}
            onImageClick={handleImageClick}
          />

          {/* Linked Content */}
          <DesignLinkedContentSection 
            linkedUserStories={linkedUserStories}
            linkedResearchNotes={linkedResearchNotes}
          />
        </div>

        {/* History Column */}
        <HistorySection
          entityId={design.id}
          entityType="design"
          comments={comments}
          decisions={design.decision_text || []}
          auditHistory={[]} // No audit history for designs yet
          user={user}
          allUsers={availableUsers}
          showHistory={showComments}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onAddDecision={handleUpdateDecision}
          onEditDecision={handleEditDecision}
          onDeleteDecision={handleDeleteDecision}
          saving={saving || savingDecision}
        />
      </div>

      {/* Toggle Comments Button */}
      <button
        onClick={() => setShowComments(!showComments)}
        className={`absolute top-1/2 transform -translate-y-1/2 bg-blue-600 text-white z-50 transition-all duration-300 ease-in-out rounded-l-full rounded-r-none pr-1 pl-2 pt-2 pb-2 ${
          showComments ? 'right-[384px]' : 'right-0'
        }`}
        title={showComments ? 'Hide history' : 'Show history'}
      >
        {showComments ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Edit Design Modal */}
      {showEditModal && (
        <EditDesignModal
          design={design}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateDesign}
          userStories={allUserStories}
          researchNotes={allResearchNotes}
          linkedUserStoryIds={linkedUserStoryIds}
          linkedResearchNoteIds={linkedResearchNoteIds}
        />
      )}

      {/* Lightbox */}
      <DesignLightbox 
        isOpen={showLightbox}
        imageUrl={design.snapshot_image_url || null}
        onClose={handleCloseLightbox}
      />
    </div>
  )
}

export { DesignDetail as AssetDetail }