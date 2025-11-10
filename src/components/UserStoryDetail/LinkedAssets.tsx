import React, { useState, useEffect } from 'react'
import { Palette, Plus, ExternalLink, X } from 'lucide-react'
import { getAssetsForUserStory as getDesignsForUserStory, getAssets as getDesigns, updateAsset as updateDesign } from '../../lib/database'
import type { Design } from '../../lib/supabase'

interface LinkedDesignsProps {
  userStoryId: string
  projectId: string
}

export function LinkedDesigns({ userStoryId, projectId }: LinkedDesignsProps) {
  const [linkedDesigns, setLinkedDesigns] = useState<Design[]>([])
  const [allDesigns, setAllDesigns] = useState<Design[]>([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedDesignIds, setSelectedDesignIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (userStoryId && projectId) {
      loadLinkedDesigns()
      loadAllDesigns()
    }
  }, [userStoryId, projectId])

  const loadLinkedDesigns = async () => {
    try {
      const designs = await getDesignsForUserStory(userStoryId)
      setLinkedDesigns(designs)
    } catch (error) {
      console.error('Error loading linked designs:', error)
    }
  }

  const loadAllDesigns = async () => {
    try {
      setLoading(true)
      const designs = await getDesigns(projectId)
      setAllDesigns(designs)
      
      // Set currently linked design IDs
      const linkedDesignData = await getDesignsForUserStory(userStoryId)
      setSelectedDesignIds(linkedDesignData.map(design => design.id))
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
          // Get current user story links for this design
          const { getUserStoriesForAsset: getUserStoriesForDesign } = await import('../../lib/database')
          const currentUserStoryIds = await getUserStoriesForDesign(design.id)
          
          let newUserStoryIds: string[]
          if (shouldBeLinked) {
            // Add this user story to the design's links
            newUserStoryIds = [...currentUserStoryIds, userStoryId]
          } else {
            // Remove this user story from the design's links
            newUserStoryIds = currentUserStoryIds.filter(id => id !== userStoryId)
          }
          
          // Get current research note links for this design
          const { getResearchNotesForAsset: getResearchNotesForDesign } = await import('../../lib/database')
          const currentResearchNoteIds = await getResearchNotesForDesign(design.id)
          
          await updateDesign(design.id, {
            name: design.name,
            snapshot_image_url: design.snapshot_image_url,
            description: design.description,
            link_url: design.link_url
          }, newUserStoryIds, currentResearchNoteIds)
        }
      }
      
      // Reload linked designs
      await loadLinkedDesigns()
      setShowLinkModal(false)
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

  const getUnlinkedDesigns = () => {
    const linkedDesignIds = linkedDesigns.map(design => design.id)
    return allDesigns.filter(design => !linkedDesignIds.includes(design.id))
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Linked Designs ({linkedDesigns.length})
        </h3>
        <button
          onClick={() => setShowLinkModal(true)}
          className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <Plus size={14} />
          Link Designs
        </button>
      </div>

      {linkedDesigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {linkedDesigns.map((design) => (
            <div
              key={design.id}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-colors"
              onClick={() => {
                window.location.href = `/design/${design.short_id}`
              }}
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
                  {design.link_url && (
                    <a
                      href={design.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
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
      ) : (
        <div className="text-center py-8">
          <Palette size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No designs linked to this user story yet.</p>
        </div>
      )}

      {/* Link Designs Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Link Designs to User Story</h3>
              <button
                onClick={() => setShowLinkModal(false)}
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
                onClick={() => setShowLinkModal(false)}
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
    </div>
  )
}