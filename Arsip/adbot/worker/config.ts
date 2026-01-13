/**
 * Worker Configuration
 * 
 * Konfigurasi untuk automation worker
 */

// Worker check interval (dalam milliseconds)
export const WORKER_CHECK_INTERVAL = 60000 // 1 menit

// Rate limiting untuk Shopee API (requests per second)
export const SHOPEE_API_RATE_LIMIT = 50

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // 1 detik
} as const

// Timeout untuk API calls (dalam milliseconds)
export const API_TIMEOUT = 30000 // 30 detik

// Concurrency limit untuk parallel processing
export const MAX_CONCURRENT_CAMPAIGNS = 10

// Missed schedule tolerance (dalam milliseconds)
// Jika jadwal terlewat dalam waktu ini, tetap akan dijalankan
export const MISSED_SCHEDULE_TOLERANCE = 5 * 60 * 1000 // 5 menit

// Logging configuration
export const LOG_CONFIG = {
  // Jangan log data sensitif
  LOG_SENSITIVE_DATA: false,
  // Jangan log full API response
  LOG_FULL_RESPONSE: false,
  // Log level: 'debug' | 'info' | 'warn' | 'error'
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const

