/**
 * Telegram Utility Functions
 * 
 * Helper functions untuk parsing, validation, dan utility lainnya
 */

import type { StartParameter, TelegramMessage } from './types'

/**
 * Parse start parameter dari command /start
 * Format: /start user_123_1234567890
 * 
 * @param text - Text dari message
 * @returns StartParameter atau null jika tidak valid
 */
export function parseStartParameter(text: string): StartParameter | null {
  if (!text || !text.startsWith('/start')) {
    return null
  }

  const parts = text.split(' ')
  if (parts.length < 2) {
    return null
  }

  const startParam = parts[1]
  if (!startParam.startsWith('user_')) {
    return null
  }

  const paramParts = startParam.split('_')
  if (paramParts.length < 3) {
    return null
  }

  const userId = parseInt(paramParts[1], 10)
  const timestamp = parseInt(paramParts[2], 10)

  if (isNaN(userId) || isNaN(timestamp)) {
    return null
  }

  return {
    userId,
    timestamp,
    raw: startParam,
  }
}

/**
 * Generate start parameter untuk user
 * 
 * @param userId - User ID
 * @returns Start parameter string
 */
export function generateStartParameter(userId: number): string {
  return `user_${userId}_${Date.now()}`
}

/**
 * Extract user ID dari start parameter
 * 
 * @param startParam - Start parameter string
 * @returns User ID atau null
 */
export function extractUserIdFromStartParam(startParam: string): number | null {
  if (!startParam.startsWith('user_')) {
    return null
  }

  const parts = startParam.split('_')
  if (parts.length < 2) {
    return null
  }

  const userId = parseInt(parts[1], 10)
  return isNaN(userId) ? null : userId
}

/**
 * Validate chat ID
 * 
 * @param chatId - Chat ID untuk divalidasi
 * @returns true jika valid
 */
export function isValidChatId(chatId: any): chatId is string | number {
  if (typeof chatId === 'number') {
    return chatId > 0
  }
  if (typeof chatId === 'string') {
    return /^\d+$/.test(chatId) && parseInt(chatId, 10) > 0
  }
  return false
}

/**
 * Format message untuk notifikasi rule
 * 
 * @param data - Data notifikasi
 * @returns Formatted message string
 */
export function formatRuleNotificationMessage(data: {
  ruleName: string
  ruleId: string
  triggeredAt: Date
  conditions?: string[]
  actions?: string[]
  customMessage?: string
}): string {
  const lines: string[] = []
  
  lines.push('🔔 *Notifikasi Automation Rule*')
  lines.push('')
  lines.push(`*Rule:* ${data.ruleName}`)
  lines.push(`*ID:* \`${data.ruleId}\``)
  lines.push(`*Waktu:* ${data.triggeredAt.toLocaleString('id-ID')}`)
  
  if (data.conditions && data.conditions.length > 0) {
    lines.push('')
    lines.push('*Kondisi yang dipicu:*')
    data.conditions.forEach((condition, index) => {
      lines.push(`${index + 1}. ${condition}`)
    })
  }
  
  if (data.actions && data.actions.length > 0) {
    lines.push('')
    lines.push('*Aksi yang dieksekusi:*')
    data.actions.forEach((action, index) => {
      lines.push(`${index + 1}. ${action}`)
    })
  }
  
  if (data.customMessage) {
    lines.push('')
    lines.push('*Pesan Custom:*')
    lines.push(data.customMessage)
  }
  
  return lines.join('\n')
}

/**
 * Replace template variables dalam message
 * 
 * @param message - Message template
 * @param variables - Variables untuk replace
 * @returns Message dengan variables yang sudah di-replace
 */
export function replaceTemplateVariables(
  message: string,
  variables: Record<string, string | number | Date>
): string {
  let result = message
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    let stringValue: string
    
    if (value instanceof Date) {
      stringValue = value.toLocaleString('id-ID')
    } else {
      stringValue = String(value)
    }
    
    result = result.replace(regex, stringValue)
  })
  
  return result
}

/**
 * Extract chat ID dari Telegram message
 * 
 * @param message - Telegram message
 * @returns Chat ID atau null
 */
export function extractChatId(message: TelegramMessage): number | null {
  return message.chat?.id || null
}

/**
 * Check apakah message adalah command /start
 * 
 * @param message - Telegram message
 * @returns true jika adalah /start command
 */
export function isStartCommand(message: TelegramMessage): boolean {
  return message.text?.startsWith('/start') || false
}

