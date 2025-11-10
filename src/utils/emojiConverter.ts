/**
 * Emoji converter utility
 * Converts emoji shortcodes like :smile: to actual Unicode emojis 😊
 * 
 * This version uses the node-emoji library which has ALL emojis (3000+)
 * automatically mapped and maintained.
 */

import * as emoji from 'node-emoji'

/**
 * Converts emoji shortcodes in text to actual Unicode emojis
 * @param text - Text containing emoji shortcodes like :smile: or :heart:
 * @returns Text with shortcodes replaced by actual emojis
 * 
 * @example
 * convertEmojis("Hello :smile: world :heart:")
 * // Returns: "Hello 😊 world ❤️"
 * 
 * @example
 * convertEmojis("Settings :gear: Dashboard")
 * // Returns: "Settings ⚙️ Dashboard"
 */
export function convertEmojis(text: string | null | undefined): string {
  if (!text) return ''
  
  // Use node-emoji to replace all emoji shortcodes
  // This supports 3000+ emojis automatically!
  return emoji.emojify(text)
}

/**
 * Checks if a string contains any emoji shortcodes
 */
export function hasEmojiShortcodes(text: string | null | undefined): boolean {
  if (!text) return false
  const regex = /(:[a-zA-Z0-9_+-]+:)/g
  return regex.test(text)
}

/**
 * Returns all emoji shortcodes found in text
 */
export function extractEmojiShortcodes(text: string | null | undefined): string[] {
  if (!text) return []
  const regex = /(:[a-zA-Z0-9_+-]+:)/g
  return text.match(regex) || []
}

/**
 * Get the emoji character for a specific shortcode
 * @param shortcode - The emoji shortcode (with or without colons)
 * @returns The emoji character or null if not found
 * 
 * @example
 * getEmoji('smile') // Returns: '😊'
 * getEmoji(':heart:') // Returns: '❤️'
 * getEmoji(':gear:') // Returns: '⚙️'
 */
export function getEmoji(shortcode: string): string | null {
  // Remove colons if present
  const cleanCode = shortcode.replace(/:/g, '')
  const result = emoji.get(cleanCode)
  
  // emoji.get returns the shortcode back if not found
  return result === cleanCode || result === `:${cleanCode}:` ? null : result
}

/**
 * Search for emojis by keyword
 * @param keyword - The search term
 * @returns Array of matching emoji objects with their shortcodes
 * 
 * @example
 * searchEmojis('heart') // Returns: [{emoji: '❤️', key: 'heart'}, {emoji: '💛', key: 'yellow_heart'}, ...]
 */
export function searchEmojis(keyword: string): Array<{emoji: string, key: string}> {
  if (!keyword) return []
  
  const results: Array<{emoji: string, key: string}> = []
  const searchLower = keyword.toLowerCase()
  
  // Search through all emojis
  Object.entries(emoji.emoji).forEach(([key, value]) => {
    if (key.includes(searchLower) || value.includes(searchLower)) {
      results.push({
        emoji: value,
        key: key
      })
    }
  })
  
  return results
}

/**
 * Get a random emoji
 */
export function getRandomEmoji(): string {
  return emoji.random().emoji
}
