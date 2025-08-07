import React from 'react'
import { ExternalLink } from 'lucide-react'
import type { Design } from '../../lib/supabase'

interface DesignPreviewSectionProps {
  design: Design
  onImageClick: () => void
}

export function DesignPreviewSection({ design, onImageClick }: DesignPreviewSectionProps) {
  if (!design.snapshot_image_url) return null

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Design Preview</h3>
      <div className="flex justify-center">
        <img 
          src={design.snapshot_image_url} 
          alt={design.name}
          className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onImageClick}
          style={{ maxHeight: '400px' }}
        />
      </div>
      {design.link_url && (
        <div className="mt-4 flex justify-center">
          <a
            href={design.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <ExternalLink size={16} />
            View External Link
          </a>
        </div>
      )}
    </div>
  )
}