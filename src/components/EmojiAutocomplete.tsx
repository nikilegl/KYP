import React, { useState, useEffect, useRef } from 'react'
import * as emoji from 'node-emoji'

interface EmojiMatch {
  key: string
  emoji: string
}

interface EmojiAutocompleteProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  autoFocus?: boolean
  multiline?: boolean
  rows?: number
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function EmojiAutocomplete({
  value,
  onChange,
  className = '',
  placeholder = '',
  autoFocus = false,
  multiline = false,
  rows = 3,
  onKeyDown
}: EmojiAutocompleteProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [emojiMatches, setEmojiMatches] = useState<EmojiMatch[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [colonPosition, setColonPosition] = useState(-1)
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Search for emojis matching the query
  const searchEmojis = (query: string): EmojiMatch[] => {
    if (!query) return []
    
    try {
      // Use node-emoji's search function
      const results = emoji.search(query)
      
      // Convert to our format and limit to 8 results
      return results.slice(0, 8).map((result: any) => ({
        key: result.name || result.key,
        emoji: result.emoji
      }))
    } catch (error) {
      console.error('Emoji search error:', error)
      return []
    }
  }

  // Handle input change and detect `:` trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    onChange(newValue)
    
    // Find the last `:` before cursor position
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastColonIndex = textBeforeCursor.lastIndexOf(':')
    
    if (lastColonIndex !== -1) {
      // Check if there's a space or start of string before the colon
      const charBeforeColon = lastColonIndex > 0 ? textBeforeCursor[lastColonIndex - 1] : ' '
      
      if (charBeforeColon === ' ' || lastColonIndex === 0) {
        const query = textBeforeCursor.slice(lastColonIndex + 1)
        
        // Only show picker if query doesn't contain spaces (valid emoji shortcode)
        if (!query.includes(' ') && !query.includes(':')) {
          setSearchQuery(query)
          setColonPosition(lastColonIndex)
          const matches = searchEmojis(query)
          setEmojiMatches(matches)
          setShowPicker(matches.length > 0)
          setSelectedIndex(0)
          return
        }
      }
    }
    
    // Hide picker if conditions aren't met
    setShowPicker(false)
  }

  // Insert selected emoji
  const insertEmoji = (emojiToInsert: string) => {
    if (!inputRef.current || colonPosition === -1) return
    
    const beforeColon = value.slice(0, colonPosition)
    const afterQuery = value.slice(colonPosition + searchQuery.length + 1)
    const newValue = beforeColon + emojiToInsert + ' ' + afterQuery
    
    onChange(newValue)
    setShowPicker(false)
    setSearchQuery('')
    setColonPosition(-1)
    
    // Focus back on input/textarea and set cursor after emoji
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeColon.length + emojiToInsert.length + 1
        inputRef.current.focus()
        if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }
    }, 0)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Handle emoji picker navigation
    if (showPicker && emojiMatches.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % emojiMatches.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + emojiMatches.length) % emojiMatches.length)
          return
        case 'Enter':
          // For textarea, only select emoji if Shift is NOT pressed (Shift+Enter = new line)
          if (multiline && e.shiftKey) {
            // Allow Shift+Enter to create new line
            break
          }
          if (emojiMatches[selectedIndex]) {
            e.preventDefault()
            e.stopPropagation() // Prevent event from bubbling up to modal's Enter handler
            insertEmoji(emojiMatches[selectedIndex].emoji)
            return
          }
          break
        case 'Tab':
          if (emojiMatches[selectedIndex]) {
            e.preventDefault()
            insertEmoji(emojiMatches[selectedIndex].emoji)
            return
          }
          break
        case 'Escape':
          e.preventDefault()
          setShowPicker(false)
          return
      }
    }
    
    // Call custom onKeyDown handler if provided
    if (onKeyDown) {
      onKeyDown(e)
    }
  }

  // Calculate picker position when it's shown
  useEffect(() => {
    const updatePosition = () => {
      if (showPicker && inputRef.current) {
        const input = inputRef.current
        const rect = input.getBoundingClientRect()
        // For fixed positioning, use viewport coordinates (getBoundingClientRect already gives viewport coords)
        setPickerPosition({
          top: rect.bottom + 4, // 4px margin (mt-1)
          left: rect.left
        })
      }
    }

    if (showPicker) {
      updatePosition()
      // Update position on scroll and resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    } else {
      setPickerPosition(null)
    }
  }, [showPicker])

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false)
      }
    }

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker])

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={className}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={rows}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={className}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      )}
      
      {showPicker && emojiMatches.length > 0 && pickerPosition && (
        <div
          ref={pickerRef}
          className="emoji-picker-dropdown fixed z-[100] w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto"
          style={{ 
            top: `${pickerPosition.top}px`, 
            left: `${pickerPosition.left}px` 
          }}
        >
          {emojiMatches.map((match, index) => (
            <button
              key={match.key}
              type="button"
              onClick={() => insertEmoji(match.emoji)}
              className={`
                w-full px-3 py-2 flex items-center gap-2 hover:bg-blue-50 transition-colors text-left
                ${index === selectedIndex ? 'bg-blue-50' : ''}
              `}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="text-xl">{match.emoji}</span>
              <span className="text-sm text-gray-700">:{match.key}:</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
