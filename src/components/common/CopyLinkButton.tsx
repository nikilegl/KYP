import React, { useState } from 'react'
import { Link } from 'lucide-react'

interface CopyLinkButtonProps {
  entityType: 'project' | 'stakeholder' | 'note' | 'user-journey' | 'user-story' | 'theme' | 'design'
  shortId: number
  className?: string
}

export function CopyLinkButton({ entityType, shortId, className = '' }: CopyLinkButtonProps) {
  const [showCopiedMessage, setShowCopiedMessage] = useState(false)

  const handleCopyLink = async () => {
    try {
      const entityUrl = `${window.location.origin}/${entityType}/${shortId}`
      await navigator.clipboard.writeText(entityUrl)
      setShowCopiedMessage(true)
      setTimeout(() => setShowCopiedMessage(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleCopyLink}
        className={`w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 transition-all ${className}`}
        title="Copy link"
      >
        <Link size={16} className="text-blue-600" />
      </button>
      {showCopiedMessage && (
        <div className="absolute top-full right-0 mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg shadow-lg z-10">
          Copied!
        </div>
      )}
    </div>
  )
}