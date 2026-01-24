/**
 * Telegram Bot Configuration
 * 
 * Konfigurasi untuk Telegram Bot termasuk token, URL, dan settings
 */

// Bot Token - harus di-set di environment variable (.env.local atau .env)
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error(
    'TELEGRAM_BOT_TOKEN is required. Please set it in your .env.local or .env file.\n' +
    'Example: TELEGRAM_BOT_TOKEN=your_bot_token_here'
  )
}

// Bot Username
export const TELEGRAM_BOT_USERNAME = 'adspilotid_bot'

// Telegram API Base URL
export const TELEGRAM_API_BASE_URL = 'https://api.telegram.org'

// Bot URL untuk setup
export const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}`

// Webhook URL (akan di-set saat deployment)
export const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || ''

// Konfigurasi pesan
export const TELEGRAM_MESSAGES = {
  SETUP_SUCCESS: '✅ Setup Telegram berhasil! Notifikasi akan dikirim ke chat ini.',
  SETUP_INSTRUCTION: 'Silakan klik link untuk membuka bot Telegram dan kirim /start',
  NOTIFICATION_PREFIX: '🔔 Notifikasi Automation Rule',
  RULE_TRIGGERED: 'Rule telah dipicu',
  ACTION_EXECUTED: 'Aksi telah dieksekusi',
} as const

// Konfigurasi retry untuk mengirim pesan
export const TELEGRAM_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // 1 detik
} as const

// Timeout untuk API calls (dalam milliseconds)
export const TELEGRAM_API_TIMEOUT = 10000 // 10 detik

/**
 * Get Telegram API URL untuk endpoint tertentu
 */
export function getTelegramApiUrl(endpoint: string): string {
  return `${TELEGRAM_API_BASE_URL}/bot${TELEGRAM_BOT_TOKEN}/${endpoint}`
}

/**
 * Get Bot URL dengan start parameter
 */
export function getBotUrlWithStartParam(startParam: string): string {
  return `${TELEGRAM_BOT_URL}?start=${startParam}`
}

