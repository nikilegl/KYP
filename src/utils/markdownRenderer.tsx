import React from 'react'
import { convertEmojis } from './emojiConverter'

/**
 * Converts markdown links [text](url) and bold **text** to HTML
 * Also converts emoji shortcodes
 * 
 * @param text - Text containing markdown links, bold text, and emoji shortcodes
 * @returns React element with links, bold text, and emojis converted
 * 
 * @example
 * renderMarkdown("Check out [Google](https://google.com) and **bold text** :smile:")
 * // Returns: React element with clickable link, bold text, and emoji
 */
export function renderMarkdown(text: string | null | undefined): React.ReactNode {
  if (!text) return null

  // First convert emojis
  const textWithEmojis = convertEmojis(text)

  // Find all markdown patterns (bold and links) and process them in order
  interface MarkdownMatch {
    type: 'bold' | 'link'
    start: number
    end: number
    content: string
    url?: string
  }

  const matches: MarkdownMatch[] = []

  // Find all bold text: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g
  let match
  while ((match = boldRegex.exec(textWithEmojis)) !== null) {
    matches.push({
      type: 'bold',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1]
    })
  }

  // Find all links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  while ((match = linkRegex.exec(textWithEmojis)) !== null) {
    matches.push({
      type: 'link',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
      url: match[2]
    })
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start)

  // Build React elements
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of matches) {
    // Add text before this match
    if (match.start > lastIndex) {
      parts.push(
        <span key={key++}>
          {textWithEmojis.substring(lastIndex, match.start)}
        </span>
      )
    }

    // Add the matched element
    if (match.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold">
          {match.content}
        </strong>
      )
    } else if (match.type === 'link') {
      const validUrl = match.url!.startsWith('http://') || match.url!.startsWith('https://') 
        ? match.url! 
        : `https://${match.url!}`
      parts.push(
        <a
          key={key++}
          href={validUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {match.content}
        </a>
      )
    }

    lastIndex = match.end
  }

  // Add remaining text
  if (lastIndex < textWithEmojis.length) {
    parts.push(
      <span key={key++}>
        {textWithEmojis.substring(lastIndex)}
      </span>
    )
  }

  return parts.length > 0 ? <>{parts}</> : <>{textWithEmojis}</>
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

