import React, { useState, useRef } from 'react'
import { Link as LinkIcon, X } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface RichTextDescriptionProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

export function RichTextDescription({
  value,
  onChange,
  placeholder = 'Optional description',
  rows = 3,
  className = ''
}: RichTextDescriptionProps) {
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertLink = () => {
    if (!linkText.trim() || !linkUrl.trim()) return

    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    // Use selected text as link text if available, otherwise use entered text
    const finalLinkText = selectedText.trim() || linkText.trim()
    const markdownLink = `[${finalLinkText}](${linkUrl.trim()})`
    
    const newValue = 
      value.substring(0, start) + 
      markdownLink + 
      value.substring(end)
    
    onChange(newValue)
    
    // Reset and close modal
    setLinkText('')
    setLinkUrl('')
    setShowLinkModal(false)
    
    // Focus back on textarea and position cursor after the link
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + markdownLink.length
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleLinkButtonClick = () => {
    const textarea = textareaRef.current
    if (textarea) {
      // Get selected text to pre-fill link text
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end)
      setLinkText(selectedText)
    }
    setShowLinkModal(true)
  }

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={handleLinkButtonClick}
          className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Insert link"
        >
          <LinkIcon size={14} />
          <span>Link</span>
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
      />

      {/* Link Insertion Modal */}
      {showLinkModal && (
        <Modal
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false)
            setLinkText('')
            setLinkUrl('')
          }}
          title="Insert Link"
          size="sm"
          footerContent={
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowLinkModal(false)
                  setLinkText('')
                  setLinkUrl('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={insertLink}
                disabled={!linkText.trim() || !linkUrl.trim()}
              >
                Insert Link
              </Button>
            </div>
          }
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link Text
              </label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Enter link text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkText.trim() && linkUrl.trim()) {
                    e.preventDefault()
                    insertLink()
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkText.trim() && linkUrl.trim()) {
                    e.preventDefault()
                    insertLink()
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Tip: Select text in the description field before clicking "Link" to use it as the link text.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}

