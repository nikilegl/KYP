import React from 'react'
import { convertEmojis } from './emojiConverter'

/**
 * Converts markdown links [text](url) to HTML anchor tags
 * Also converts emoji shortcodes
 * 
 * @param text - Text containing markdown links and emoji shortcodes
 * @returns React element with links and emojis converted
 * 
 * @example
 * renderMarkdown("Check out [Google](https://google.com) :smile:")
 * // Returns: React element with clickable link and emoji
 */
export function renderMarkdown(text: string | null | undefined): React.ReactNode {
  if (!text) return null

  // First convert emojis
  const textWithEmojis = convertEmojis(text)

  // Split by markdown links pattern: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = linkRegex.exec(textWithEmojis)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>
          {textWithEmojis.substring(lastIndex, match.index)}
        </span>
      )
    }

    // Add the link
    const linkText = match[1]
    const linkUrl = match[2]
    
    // Validate URL (add http:// if no protocol)
    const validUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
      ? linkUrl 
      : `https://${linkUrl}`

    parts.push(
      <a
        key={key++}
        href={validUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
      >
        {linkText}
      </a>
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last link
  if (lastIndex < textWithEmojis.length) {
    parts.push(
      <span key={key++}>
        {textWithEmojis.substring(lastIndex)}
      </span>
    )
  }

  return parts.length > 0 ? <>{parts}</> : textWithEmojis
}

/**
 * Converts markdown links to HTML string (for non-React contexts)
 */
export function renderMarkdownToString(text: string | null | undefined): string {
  if (!text) return ''

  // First convert emojis
  const textWithEmojis = convertEmojis(text)

  // Convert markdown links to HTML
  return textWithEmojis.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, linkText, linkUrl) => {
      const validUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
        ? linkUrl 
        : `https://${linkUrl}`
      return `<a href="${validUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${linkText}</a>`
    }
  )
}

