import React from 'react'

interface DesignLightboxProps {
  isOpen: boolean
  imageUrl: string | null
  onClose: () => void
}

export function DesignLightbox({ isOpen, imageUrl, onClose }: DesignLightboxProps) {
  if (!isOpen || !imageUrl) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div className="relative p-4">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img 
          src={imageUrl} 
          alt="Full size preview"
          className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}