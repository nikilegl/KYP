import React, { useState, useEffect } from 'react'
import { ArrowLeft, Palette, Edit } from 'lucide-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { CopyLinkButton } from './common/CopyLinkButton'
import { TagThemeCard } from './common/TagThemeCard'
import { EditDesignModal } from './DesignsSection/EditDesignModal'
import { CommentsSection } from './common/CommentsSection'
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
  getResearchNotesForAsset as getResearchNotesForDesign,
  getThemesForAsset as getThemesForDesign,
  linkThemeToAsset as linkThemeToDesign,
  unlinkThemeFromAsset as unlinkThemeFromDesign
} from '../lib/database'
import { getUserStories, getResearchNotes, getThemes } from '../lib/database'
import type { Design, DesignComment, UserStory, ResearchNote, Theme, WorkspaceUser } from '../lib/supabase'

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
  const [designThemes, setDesignThemes] = useState<Theme[]>([])
  const [allThemes, setAllThemes] = useState<Theme[]>([])
  const [allUserStories, setAllUserStories] = useState<UserStory[]>([])
  const [allResearchNotes, setAllResearchNotes] = useState<ResearchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [showComments, setShowComments] = useState(true)

  useEffect(() => {
    loadDesignData()
  }, [designShortId])

  const loadDesignData = async () => {
    try {
      setLoading(true)
      
      const [designData, themesData] = await Promise.all([
        getDesignByShortId(designShortId),
        getThemes()
      ])
      
      if (!designData) {
        console.error('Design not found')
        return
      }
      
      setDesign(designData)
      setAllThemes(themesData)
      
      // Load related data
      const [
        commentsData,
        userStoriesData,
        researchNotesData,
        designThemesData,
        allUserStoriesData,
        allResearchNotesData
      ] = await Promise.all([
        getDesignComments(designData.id),
        getUserStoriesForDesign(designData.id),
        getResearchNotesForDesign(designData.id),
        getThemesForDesign(designData.id),
        getUserStories(designData.project_id),
        getResearchNotes()
      ])
      
      setComments(commentsData)
      setLinkedUserStories(userStoriesData)
      setLinkedResearchNotes(researchNotesData.filter(note => note.project_id === designData.project_id))
      setDesignThemes(designThemesData)
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

  const handleThemeAdd = async (theme: Theme) => {
    if (!design) return
    
    try {
      await linkThemeToDesign(theme.id, design.id)
      setDesignThemes([...designThemes, theme])
    } catch (error) {
      console.error('Error linking theme to design:', error)
    }
  }

  const handleThemeRemove = async (themeId: string) => {
    if (!design) return
    
    try {
      await unlinkThemeFromDesign(themeId, design.id)
      setDesignThemes(designThemes.filter(theme => theme.id !== themeId))
    } catch (error) {
      console.error('Error unlinking theme from design:', error)
    }
  }

  const handleThemeCreate = (newTheme: Theme) => {
    setAllThemes([newTheme, ...allThemes])
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

          {/* Theme Tagging */}
          <TagThemeCard
            availableThemes={allThemes}
            selectedThemes={designThemes}
            onThemeAdd={handleThemeAdd}
            onThemeRemove={handleThemeRemove}
            onThemeCreate={handleThemeCreate}
          />

          {/* Linked Content */}
          <DesignLinkedContentSection 
            linkedUserStories={linkedUserStories}
            linkedResearchNotes={linkedResearchNotes}
          />
        </div>

        {/* Comments Column */}
        <CommentsSection
          entityId={design.id}
          entityType="design"
          comments={comments}
          user={user}
          allUsers={availableUsers}
          showComments={showComments}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          saving={saving}
        />
      </div>

      {/* Toggle Comments Button */}
      <button
        onClick={() => setShowComments(!showComments)}
        className={`absolute top-1/2 transform -translate-y-1/2 bg-blue-600 text-white z-50 transition-all duration-300 ease-in-out rounded-l-full rounded-r-none pr-1 pl-2 pt-2 pb-2 ${
          showComments ? 'right-[384px]' : 'right-0'
        }`}
        title={showComments ? 'Hide comments' : 'Show comments'}
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