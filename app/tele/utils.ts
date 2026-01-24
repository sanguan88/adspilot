/**
 * Telegram Utility Functions
 * 
 * Helper functions untuk parsing, validation, dan utility lainnya
 */

import type { StartParameter, TelegramMessage } from './types'

/**
 * Parse start parameter dari command /start
 * Format: /start user_123_1234567890 (number) or user_string_1234567890 (string user_id)
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

  // Find last underscore to split userId and timestamp
  const lastUnderscoreIndex = startParam.lastIndexOf('_')
  if (lastUnderscoreIndex === -1 || lastUnderscoreIndex === 4) { // 4 is length of "user"
    return null
  }

  const userIdPart = startParam.substring(5, lastUnderscoreIndex) // Skip "user_"
  const timestampStr = startParam.substring(lastUnderscoreIndex + 1)

  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) {
    return null
  }

  // Try to parse userId as number first (backward compatibility)
  // If it fails or if it contains non-numeric chars, treat as string (user_id)
  const userIdAsNumber = parseInt(userIdPart, 10)
  const userId = (!isNaN(userIdAsNumber) && userIdPart === userIdAsNumber.toString())
    ? userIdAsNumber
    : userIdPart

  return {
    userId,
    timestamp,
    raw: startParam,
  }
}

/**
 * Generate start parameter untuk user
 * 
 * @param userId - User ID (string user_id or number no)
 * @returns Start parameter string
 */
export function generateStartParameter(userId: string | number): string {
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
    return chatId > 0 || chatId < 0 // Support negative chat IDs for groups
  }
  if (typeof chatId === 'string') {
    const num = parseInt(chatId, 10)
    return !isNaN(num) && num !== 0
  }
  return false
}

/**
 * Escape Markdown special characters for Telegram (Markdown V1)
 * Hanya escape _ * [ ` karena sistem menggunakan parseMode: 'Markdown'
 * Karakter - . ! tidak perlu di-escape di V1 dan sering bikin typo \-
 * 
 * @param text - Text untuk di-escape
 * @returns Escaped text
 */
export function escapeMarkdown(text: string): string {
  if (!text) return ''
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/`/g, '\\`')
}

/**
 * Peta label Bahasa Indonesia untuk Metrik
 */
const METRIC_LABELS: Record<string, string> = {
  impression: 'Impression (Dilihat)',
  click: 'Klik',
  ctr: 'CTR',
  cost: 'Biaya',
  cpc: 'CPC',
  view: 'Dilihat',
  roas: 'ROAS',
  gmv: 'Penjualan (GMV)',
  order: 'Pesanan',
  roi: 'ROI',
  daily_budget: 'Budget Harian',
  saldo: 'Saldo',
}

/**
 * Peta label Bahasa Indonesia untuk Operator
 */
const OPERATOR_LABELS: Record<string, string> = {
  greater_than: 'lebih dari',
  less_than: 'kurang dari',
  equal: 'sama dengan',
  greater_than_equal: 'lebih dari atau sama dengan',
  less_than_equal: 'kurang dari atau sama dengan',
}

/**
 * Format satu kondisi teknis ke Bahasa Indonesia
 * Contoh: "impression less_than 1" -> "Impression (Dilihat) kurang dari 1"
 */
export function formatConditionToIndonesian(condition: string): string {
  // Jika condition mengandung AND/OR, biarkan atau handle manual
  // Tapi biasanya dikirim satu per satu dalam array
  const parts = condition.split(' ')
  if (parts.length < 3) return condition

  const metric = parts[0]
  const operator = parts[1]
  const value = parts.slice(2).join(' ')

  const metricLabel = METRIC_LABELS[metric] || metric
  const operatorLabel = OPERATOR_LABELS[operator] || operator

  return `${metricLabel} ${operatorLabel} ${value}`
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
  tokoName?: string
  campaignNames?: string[]
}): string {
  const lines: string[] = []

  lines.push('🔔 *Notifikasi Automation Rule*')
  lines.push('')
  lines.push(`*Rule:* ${escapeMarkdown(data.ruleName)}`)
  if (data.tokoName) {
    lines.push(`*Toko:* ${escapeMarkdown(data.tokoName)}`)
  }
  lines.push(`*Waktu:* ${data.triggeredAt.toLocaleString('id-ID')}`)

  if (data.conditions && data.conditions.length > 0) {
    lines.push('')
    lines.push('*Kondisi yang dipicu:*')
    data.conditions.forEach((condition, index) => {
      const friendlyCondition = formatConditionToIndonesian(condition)
      lines.push(`${index + 1}. ${escapeMarkdown(friendlyCondition)}`)
    })
  }

  if (data.campaignNames && data.campaignNames.length > 0) {
    lines.push('')
    lines.push(`*Iklan yang dipicu:* ${data.campaignNames.length} Campaign`)
    if (data.campaignNames.length === 1) {
      lines.push(`*Nama Iklan:* ${escapeMarkdown(data.campaignNames[0])}`)
    }
  }

  if (data.actions && data.actions.length > 0) {
    lines.push('')
    lines.push('*Aksi yang dieksekusi:*')
    data.actions.forEach((action, index) => {
      lines.push(`${index + 1}. ${escapeMarkdown(action)}`)
    })
  }

  if (data.customMessage) {
    lines.push('')
    lines.push('*Pesan Custom:*')
    lines.push(escapeMarkdown(data.customMessage))
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

