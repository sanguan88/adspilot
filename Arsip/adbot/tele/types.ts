/**
 * Telegram Types and Interfaces
 * 
 * Type definitions untuk Telegram API dan internal types
 */

/**
 * Telegram Update dari webhook
 */
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

/**
 * Telegram Message
 */
export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  entities?: TelegramMessageEntity[]
}

/**
 * Telegram User
 */
export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

/**
 * Telegram Chat
 */
export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

/**
 * Telegram Message Entity
 */
export interface TelegramMessageEntity {
  type: string
  offset: number
  length: number
  url?: string
  user?: TelegramUser
}

/**
 * Telegram Callback Query
 */
export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

/**
 * Response dari Telegram API SendMessage
 */
export interface TelegramSendMessageResponse {
  ok: boolean
  result?: TelegramMessage
  error_code?: number
  description?: string
}

/**
 * Start Parameter untuk tracking user
 */
export interface StartParameter {
  userId: number
  timestamp: number
  raw: string
}

/**
 * Telegram Status dari database
 */
export interface TelegramStatus {
  hasTelegram: boolean
  chatid_tele: string | null
}

/**
 * Setup Telegram Response
 */
export interface SetupTelegramResponse {
  success: boolean
  data?: {
    botUrl: string
    startParam: string
    message: string
  }
  error?: string
}

/**
 * Notification Payload untuk mengirim notifikasi
 */
export interface NotificationPayload {
  chatId: string | number
  message: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableWebPagePreview?: boolean
  disableNotification?: boolean
}

/**
 * Rule Notification Data
 */
export interface RuleNotificationData {
  ruleName: string
  ruleId: string
  triggeredAt: Date
  conditions: string[]
  actions: string[]
  message?: string // Custom message dari action telegram_notification
}

