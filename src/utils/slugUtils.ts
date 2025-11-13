/**
 * Convert a folder name to a URL-friendly slug
 */
export function nameToSlug(name: string): string {
  // Remove emojis and convert to lowercase
  // Remove emoji characters (Unicode ranges for emojis)
  const withoutEmojis = name
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Miscellaneous Symbols and Pictographs
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map Symbols
    .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
    .trim()

  // Convert to lowercase and replace spaces/special chars with hyphens
  return withoutEmojis
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Find a folder by matching its slug
 */
export function findFolderBySlug(folders: Array<{ id: string; name: string }>, slug: string): { id: string; name: string } | null {
  return folders.find(folder => nameToSlug(folder.name) === slug) || null
}

