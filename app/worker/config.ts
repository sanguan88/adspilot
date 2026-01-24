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

/**
 * Get base API URL
 * Priority:
 * 1. NEXT_PUBLIC_API_URL environment variable
 * 2. API_URL environment variable
 * 3. If running in production, try to detect from environment
 * 4. Fallback to localhost:3000 for development only
 */
export function getApiBaseUrl(): string {
  // Check NEXT_PUBLIC_API_URL first (Next.js convention)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Check API_URL
  if (process.env.API_URL) {
    return process.env.API_URL
  }
  
  // In production, try to detect from environment
  if (process.env.NODE_ENV === 'production') {
    // Try to get from PORT or HOSTNAME
    const port = process.env.PORT || '1002'
    const hostname = process.env.HOSTNAME || '127.0.0.1'
    
    // If hostname is not localhost, use it
    if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
      return `http://${hostname}:${port}`
    }
    
    // Production fallback - use localhost with correct port
    // Should set NEXT_PUBLIC_API_URL in production for better configuration
    console.warn('[Worker Config] NEXT_PUBLIC_API_URL not set in production. Using fallback URL. Please set it in environment variables.')
    return `http://${hostname}:${port}`
  }
  
  // Development fallback - only use localhost:3000 in development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }
  
  // Last resort fallback - use port from env or default to 1002
  const port = process.env.PORT || '1002'
  const hostname = process.env.HOSTNAME || '127.0.0.1'
  return `http://${hostname}:${port}`
}

