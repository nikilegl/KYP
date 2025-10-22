/**
 * Emoji converter utility
 * Converts emoji shortcodes like :smile: to actual Unicode emojis 😊
 */

// Common emoji shortcodes mapped to Unicode characters
const emojiMap: Record<string, string> = {
  // Smileys & Emotion
  ':smile:': '😊',
  ':grin:': '😁',
  ':joy:': '😂',
  ':laughing:': '😆',
  ':wink:': '😉',
  ':blush:': '😊',
  ':heart_eyes:': '😍',
  ':kissing_heart:': '😘',
  ':relaxed:': '☺️',
  ':satisfied:': '😆',
  ':grinning:': '😀',
  ':innocent:': '😇',
  ':smiling_face_with_3_hearts:': '🥰',
  ':star_struck:': '🤩',
  ':partying_face:': '🥳',
  ':thinking:': '🤔',
  ':neutral_face:': '😐',
  ':expressionless:': '😑',
  ':no_mouth:': '😶',
  ':confused:': '😕',
  ':worried:': '😟',
  ':slightly_frowning_face:': '🙁',
  ':frowning:': '☹️',
  ':persevere:': '😣',
  ':disappointed:': '😞',
  ':sweat:': '😓',
  ':weary:': '😩',
  ':tired_face:': '😫',
  ':cry:': '😢',
  ':sob:': '😭',
  ':triumph:': '😤',
  ':angry:': '😠',
  ':rage:': '😡',
  ':exploding_head:': '🤯',
  ':flushed:': '😳',
  ':disappointed_relieved:': '😥',
  ':fearful:': '😨',
  ':cold_sweat:': '😰',
  ':scream:': '😱',
  ':astonished:': '😲',
  ':pleading_face:': '🥺',
  
  // Hand gestures
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':+1:': '👍',
  ':-1:': '👎',
  ':clap:': '👏',
  ':pray:': '🙏',
  ':handshake:': '🤝',
  ':muscle:': '💪',
  ':point_right:': '👉',
  ':point_left:': '👈',
  ':point_up:': '☝️',
  ':point_down:': '👇',
  ':raised_hand:': '✋',
  ':ok_hand:': '👌',
  ':wave:': '👋',
  ':call_me_hand:': '🤙',
  ':raised_hands:': '🙌',
  ':palms_up_together:': '🤲',
  
  // Money & Business
  ':moneybag:': '💰',
  ':money_bag:': '💰',
  ':dollar:': '💵',
  ':pound:': '💷',
  ':euro:': '💶',
  ':yen:': '💴',
  ':credit_card:': '💳',
  ':chart_with_upwards_trend:': '📈',
  ':chart_with_downwards_trend:': '📉',
  ':briefcase:': '💼',
  ':bank:': '🏦',
  ':gem:': '💎',
  ':receipt:': '🧾',
  
  // Hearts & Symbols
  ':heart:': '❤️',
  ':orange_heart:': '🧡',
  ':yellow_heart:': '💛',
  ':green_heart:': '💚',
  ':blue_heart:': '💙',
  ':purple_heart:': '💜',
  ':brown_heart:': '🤎',
  ':black_heart:': '🖤',
  ':white_heart:': '🤍',
  ':broken_heart:': '💔',
  ':two_hearts:': '💕',
  ':sparkling_heart:': '💖',
  ':heartbeat:': '💓',
  ':cupid:': '💘',
  ':gift_heart:': '💝',
  ':revolving_hearts:': '💞',
  ':heart_decoration:': '💟',
  
  // Symbols & Marks
  ':star:': '⭐',
  ':star2:': '🌟',
  ':sparkles:': '✨',
  ':boom:': '💥',
  ':fire:': '🔥',
  ':rocket:': '🚀',
  ':check:': '✅',
  ':checkmark:': '✅',
  ':x:': '❌',
  ':cross_mark:': '❌',
  ':warning:': '⚠️',
  ':exclamation:': '❗',
  ':question:': '❓',
  ':bangbang:': '‼️',
  ':interrobang:': '⁉️',
  ':bulb:': '💡',
  ':bell:': '🔔',
  ':no_bell:': '🔕',
  ':loudspeaker:': '📢',
  ':mega:': '📣',
  ':lock:': '🔒',
  ':unlock:': '🔓',
  ':key:': '🔑',
  
  // Office & Tools
  ':pencil:': '✏️',
  ':pencil2:': '✏️',
  ':pen:': '🖊️',
  ':memo:': '📝',
  ':clipboard:': '📋',
  ':pushpin:': '📌',
  ':paperclip:': '📎',
  ':link:': '🔗',
  ':scissors:': '✂️',
  ':inbox_tray:': '📥',
  ':outbox_tray:': '📤',
  ':package:': '📦',
  ':mailbox:': '📫',
  ':email:': '📧',
  ':envelope:': '✉️',
  ':calendar:': '📅',
  ':date:': '📅',
  ':clock:': '🕐',
  ':hourglass:': '⌛',
  ':alarm_clock:': '⏰',
  
  // Tech & Devices
  ':computer:': '💻',
  ':laptop:': '💻',
  ':desktop_computer:': '🖥️',
  ':keyboard:': '⌨️',
  ':mouse:': '🖱️',
  ':trackball:': '🖲️',
  ':printer:': '🖨️',
  ':phone:': '☎️',
  ':telephone:': '☎️',
  ':mobile_phone:': '📱',
  ':iphone:': '📱',
  ':calling:': '📲',
  ':fax:': '📠',
  ':pager:': '📟',
  ':battery:': '🔋',
  ':electric_plug:': '🔌',
  
  // Documents & Files
  ':file_folder:': '📁',
  ':open_file_folder:': '📂',
  ':card_index_dividers:': '🗂️',
  ':page_facing_up:': '📄',
  ':page_with_curl:': '📃',
  ':bookmark:': '🔖',
  ':label:': '🏷️',
  ':bar_chart:': '📊',
  ':chart_with_increasing:': '📈',
  ':chart_with_decreasing:': '📉',
  ':scroll:': '📜',
  ':newspaper:': '📰',
  ':books:': '📚',
  ':book:': '📖',
  ':notebook:': '📓',
  ':ledger:': '📒',
  
  // Travel & Places
  ':house:': '🏠',
  ':building:': '🏢',
  ':office:': '🏢',
  ':hospital:': '🏥',
  ':school:': '🏫',
  ':hotel:': '🏨',
  ':bank:': '🏦',
  ':department_store:': '🏬',
  ':factory:': '🏭',
  ':airplane:': '✈️',
  ':car:': '🚗',
  ':taxi:': '🚕',
  ':bus:': '🚌',
  ':train:': '🚆',
  ':bike:': '🚲',
  ':ship:': '🚢',
  
  // Food & Drink
  ':coffee:': '☕',
  ':tea:': '🍵',
  ':beer:': '🍺',
  ':wine_glass:': '🍷',
  ':cocktail:': '🍸',
  ':cake:': '🍰',
  ':pizza:': '🍕',
  ':hamburger:': '🍔',
  ':fries:': '🍟',
  ':apple:': '🍎',
  ':bread:': '🍞',
  ':popcorn:': '🍿',
  
  // Nature
  ':sunny:': '☀️',
  ':sun:': '☀️',
  ':cloud:': '☁️',
  ':umbrella:': '☂️',
  ':snowflake:': '❄️',
  ':zap:': '⚡',
  ':lightning:': '⚡',
  ':droplet:': '💧',
  ':ocean:': '🌊',
  ':rainbow:': '🌈',
  ':seedling:': '🌱',
  ':herb:': '🌿',
  ':four_leaf_clover:': '🍀',
  ':leaves:': '🍃',
  ':tree:': '🌳',
  ':evergreen_tree:': '🌲',
  ':deciduous_tree:': '🌳',
  
  // Animals
  ':dog:': '🐶',
  ':cat:': '🐱',
  ':mouse:': '🐭',
  ':rabbit:': '🐰',
  ':fox:': '🦊',
  ':bear:': '🐻',
  ':panda:': '🐼',
  ':koala:': '🐨',
  ':tiger:': '🐯',
  ':lion:': '🦁',
  ':cow:': '🐮',
  ':pig:': '🐷',
  ':frog:': '🐸',
  ':monkey:': '🐵',
  ':chicken:': '🐔',
  ':penguin:': '🐧',
  ':bird:': '🐦',
  ':fish:': '🐟',
  ':whale:': '🐳',
  ':dolphin:': '🐬',
  ':octopus:': '🐙',
  ':bug:': '🐛',
  ':butterfly:': '🦋',
  ':bee:': '🐝',
  ':turtle:': '🐢',
  ':unicorn:': '🦄',
  
  // Activities & Sports
  ':soccer:': '⚽',
  ':basketball:': '🏀',
  ':football:': '🏈',
  ':baseball:': '⚾',
  ':tennis:': '🎾',
  ':trophy:': '🏆',
  ':medal:': '🏅',
  ':1st_place_medal:': '🥇',
  ':2nd_place_medal:': '🥈',
  ':3rd_place_medal:': '🥉',
  ':dart:': '🎯',
  ':goal_net:': '🥅',
  
  // Music & Entertainment
  ':musical_note:': '🎵',
  ':notes:': '🎶',
  ':microphone:': '🎤',
  ':headphones:': '🎧',
  ':radio:': '📻',
  ':saxophone:': '🎷',
  ':guitar:': '🎸',
  ':musical_keyboard:': '🎹',
  ':trumpet:': '🎺',
  ':violin:': '🎻',
  ':drum:': '🥁',
  ':clapper:': '🎬',
  ':movie_camera:': '🎥',
  ':camera:': '📷',
  ':video_camera:': '📹',
  ':tv:': '📺',
  ':art:': '🎨',
  ':paintbrush:': '🖌️',
  ':game_die:': '🎲',
  ':puzzle_piece:': '🧩',
  
  // Flags & Countries
  ':checkered_flag:': '🏁',
  ':triangular_flag_on_post:': '🚩',
  ':rainbow_flag:': '🏳️‍🌈',
  ':pirate_flag:': '🏴‍☠️',
  ':us:': '🇺🇸',
  ':uk:': '🇬🇧',
  ':gb:': '🇬🇧',
  ':eu:': '🇪🇺',
  ':fr:': '🇫🇷',
  ':de:': '🇩🇪',
  ':it:': '🇮🇹',
  ':es:': '🇪🇸',
  ':jp:': '🇯🇵',
  ':cn:': '🇨🇳',
  ':kr:': '🇰🇷',
  ':in:': '🇮🇳',
  ':au:': '🇦🇺',
  ':ca:': '🇨🇦',
  ':br:': '🇧🇷',
  ':mx:': '🇲🇽',
  
  // Miscellaneous
  ':100:': '💯',
  ':zzz:': '💤',
  ':boom:': '💥',
  ':collision:': '💥',
  ':speech_balloon:': '💬',
  ':thought_balloon:': '💭',
  ':sos:': '🆘',
  ':new:': '🆕',
  ':free:': '🆓',
  ':cool:': '🆒',
  ':ng:': '🆖',
  ':ok:': '🆗',
  ':up:': '🆙',
  ':vs:': '🆚',
  ':recycle:': '♻️',
  ':peace:': '☮️',
  ':atom:': '⚛️',
  ':wheel_of_dharma:': '☸️',
  ':yin_yang:': '☯️',
}

/**
 * Converts emoji shortcodes in text to actual Unicode emojis
 * @param text - Text containing emoji shortcodes like :smile: or :heart:
 * @returns Text with shortcodes replaced by actual emojis
 * 
 * @example
 * convertEmojis("Hello :smile: world :heart:")
 * // Returns: "Hello 😊 world ❤️"
 */
export function convertEmojis(text: string | null | undefined): string {
  if (!text) return ''
  
  // Replace all emoji shortcodes with their Unicode equivalents
  let converted = text
  
  // Use regex to find all :something: patterns
  const regex = /(:[a-zA-Z0-9_+-]+:)/g
  converted = converted.replace(regex, (match) => {
    return emojiMap[match] || match // Return emoji if found, otherwise keep original
  })
  
  return converted
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

