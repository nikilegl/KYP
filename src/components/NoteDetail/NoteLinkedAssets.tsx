import React, { useState, useEffect } from 'react'
import { Palette, Plus, ExternalLink, X } from 'lucide-react'
import { getAssetsForResearchNote as getDesignsForResearchNote, getAssets as getDesigns, updateAsset as updateDesign } from '../../lib/database'
import type { Design } from '../../lib/supabase'

interface NoteLinkedDesignsProps {
  researchNoteId: string
  projectId: string
  linkedDesigns: Design[]
  onLinkedDesignsChange: (designs: Design[]) => void
  showLinkModal: boolean
  onShowLinkModal: (show: boolean) => void
}

export function NoteLinkedDesigns({ 
  researchNoteId, 
  projectId, 
  linkedDesigns, 
  onLinkedDesignsChange,
  showLinkModal,
  onShowLinkModal
}: NoteLinkedDesignsProps) {
  const [allDesigns, setAllDesigns] = useState<Design[]>([])
  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null)

  useEffect(() => {
    loadAllDesigns()
  }, [researchNoteId, projectId])

  // Update selectedDesignIds when linkedDesigns prop changes
  useEffect(() => {
    setSelectedDesignIds(linkedDesigns.map(design => design.id))
  }, [linkedDesigns])

  const loadAllDesigns = async () => {
    try {
      setLoading(true)
      const designs = await getDesigns(projectId)
      setAllDesigns(designs)
    } catch (error) {
      console.error('Error loading all designs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLinks = async () => {
    setSaving(true)
    
    try {
      // Update each design's relationships
      for (const design of allDesigns) {
        const shouldBeLinked = selectedDesignIds.includes(design.id)
        const currentlyLinked = linkedDesigns.some(linked => linked.id === design.id)
        
        if (shouldBeLinked !== currentlyLinked) {
          // Get current research note links for this design
          const { getResearchNotesForAsset: getResearchNotesForDesign } = await import('../../lib/database')
          const currentResearchNoteIds = await getResearchNotesForDesign(design.id)
          
          let newResearchNoteIds: string[]
          if (shouldBeLinked) {
            // Add this research note to the design's links
            newResearchNoteIds = [...currentResearchNoteIds, researchNoteId]
          } else {
            // Remove this research note from the design's links
            newResearchNoteIds = currentResearchNoteIds.filter(id => id !== researchNoteId)
          }
          
          // Get current user story links for this design
          const { getUserStoriesForAsset: getUserStoriesForDesign } = await import('../../lib/database')
          const currentUserStoryIds = await getUserStoriesForDesign(design.id)
          
          await updateDesign(design.id, {
            name: design.name,
            snapshot_image_url: design.snapshot_image_url,
            description: design.description,
            link_url: design.link_url
          }, currentUserStoryIds, newResearchNoteIds)
        }
      }
      
      // Reload linked designs
      const updatedDesigns = await getDesignsForResearchNote(researchNoteId)
      onLinkedDesignsChange(updatedDesigns)
      onShowLinkModal(false)
    } catch (error) {
      console.error('Error saving design links:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDesign = (designId: string) => {
    setSelectedDesignIds(prev =>
      prev.includes(designId)
        ? prev.filter(id => id !== designId)
        : [...prev, designId]
    )
  }

  const handleImageClick = (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLightboxImageUrl(imageUrl)
    setShowLightbox(true)
  }

  const handleCloseLightbox = () => {
    setShowLightbox(false)
    setLightboxImageUrl(null)
  }

  return (
    <>
      {/* If no designs are linked, return null (button will be shown in unified row) */}
      {linkedDesigns.length === 0 ? null : (
        /* Show the full card when designs exist */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Linked Designs ({linkedDesigns.length})
            </h2>
            <button
              onClick={() => onShowLinkModal(true)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <Plus size={14} />
              Link Designs
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkedDesigns.map((design) => (
              <div key={design.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {design.snapshot_image_url ? (
                    <button
                      type="button"
                      onClick={(e) => handleImageClick(design.snapshot_image_url!, e)}
                      className="p-0 border-none bg-transparent cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img 
                        src={design.snapshot_image_url} 
                        alt={design.name}
                        className="w-12 h-12 object-cover rounded border border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <Palette size={12} className="mx-auto text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500">Image not available</p>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      <Palette size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{design.name}</h4>
                   
                    {design.link_url && (
                      <a
                        href={design.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                      >
                        <ExternalLink size={12} />
                        View Link
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link Designs Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Link Designs to Note</h3>
              <button
                onClick={() => onShowLinkModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : allDesigns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No designs available in this project.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allDesigns.map((design) => {
                    const isSelected = selectedDesignIds.includes(design.id)
                    
                    return (
                      <div
                        key={design.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleToggleDesign(design.id)}
                      >
                        <div className="flex items-start gap-3">
                          {design.snapshot_image_url ? (
                            <img 
                              src={design.snapshot_image_url} 
                              alt={design.name}
                              className="w-12 h-12 object-cover rounded border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                              <Palette size={16} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{design.name}</h4>
                            {design.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{design.description}</p>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleDesign(design.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => onShowLinkModal(false)}
                disabled={saving}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLinks}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Links'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && lightboxImageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={handleCloseLightbox}
        >
          <div className="relative p-4">
            <button
              onClick={handleCloseLightbox}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={lightboxImageUrl} 
              alt="Full size preview"
              className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}