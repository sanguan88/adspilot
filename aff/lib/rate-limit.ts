/**
 * Database-driven rate limiter untuk mencegah brute force attacks
 * Konfigurasi dapat diatur oleh admin melalui database
 */

import { getDatabaseConnection } from './db'

interface RateLimitEntry {
  attempts: number
  resetTime: number
  blocked: boolean
}

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
  isEnabled: boolean
}

// In-memory store untuk rate limiting
// Key: IP address atau username
// Value: RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cache untuk konfigurasi rate limiting dari database
let cachedConfig: RateLimitConfig | null = null
let configLastFetched: number = 0
const CONFIG_CACHE_DURATION = 60 * 1000 // Cache selama 1 menit

// Default fallback config jika database tidak tersedia
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 menit
  blockDurationMs: 30 * 60 * 1000, // 30 menit
  isEnabled: true,
}

/**
 * Fetch rate limit configuration from database
 */
async function fetchRateLimitConfig(): Promise<RateLimitConfig> {
  // Return cached config if still valid
  const now = Date.now()
  if (cachedConfig && (now - configLastFetched) < CONFIG_CACHE_DURATION) {
    return cachedConfig
  }

  try {
    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `SELECT setting_key, setting_value, setting_type 
         FROM system_settings 
         WHERE setting_key IN (
           'security.maxLoginAttempts',
           'security.loginWindowMinutes', 
           'security.loginBlockDurationMinutes',
           'security.rateLimitEnabled'
         )`
      )

      if (result.rows.length > 0) {
        const settings: Record<string, any> = {}

        result.rows.forEach((row: any) => {
          const key = row.setting_key.split('.')[1] // Remove 'security.' prefix
          let value = row.setting_value

          // Parse value based on type
          if (row.setting_type === 'number') {
            value = parseInt(value) || 0
          } else if (row.setting_type === 'boolean') {
            value = value === 'true' || value === '1'
          }

          settings[key] = value
        })

        cachedConfig = {
          maxAttempts: settings.maxLoginAttempts || 5,
          windowMs: (settings.loginWindowMinutes || 15) * 60 * 1000,
          blockDurationMs: (settings.loginBlockDurationMinutes || 30) * 60 * 1000,
          isEnabled: settings.rateLimitEnabled !== undefined ? settings.rateLimitEnabled : true,
        }
        configLastFetched = now
        return cachedConfig
      }
    } finally {
      connection.release()
    }
  } catch (error) {
    // Log error but use default config
    if (process.env.NODE_ENV === 'development') {
      console.error('[Rate Limit] Error fetching config from database:', error)
    }
  }

  // Return default config if database fetch failed
  return DEFAULT_RATE_LIMIT_CONFIG
}

/**
 * Get current rate limit configuration (sync version with cached value)
 */
function getRateLimitConfigSync(): RateLimitConfig {
  return cachedConfig || DEFAULT_RATE_LIMIT_CONFIG
}

/**
 * Cleanup old entries setiap 5 menit
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check rate limit untuk IP atau username
 * @param identifier IP address atau username
 * @returns { allowed: boolean, remainingAttempts: number, resetTime: number }
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  remainingAttempts: number
  resetTime: number
} {
  const config = getRateLimitConfigSync()

  // If rate limiting is disabled, always allow
  if (!config.isEnabled) {
    return {
      allowed: true,
      remainingAttempts: 999,
      resetTime: Date.now() + config.windowMs,
    }
  }

  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry) {
    // First attempt
    rateLimitStore.set(identifier, {
      attempts: 1,
      resetTime: now + config.windowMs,
      blocked: false,
    })
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
      resetTime: now + config.windowMs,
    }
  }

  // Check if blocked
  if (entry.blocked) {
    if (now < entry.resetTime) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: entry.resetTime,
      }
    } else {
      // Block period expired, reset
      rateLimitStore.delete(identifier)
      return checkRateLimit(identifier)
    }
  }

  // Check if window expired
  if (now >= entry.resetTime) {
    // Reset window
    rateLimitStore.set(identifier, {
      attempts: 1,
      resetTime: now + config.windowMs,
      blocked: false,
    })
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts - 1,
      resetTime: now + config.windowMs,
    }
  }

  // Increment attempts
  const newAttempts = entry.attempts + 1
  const isBlocked = newAttempts > config.maxAttempts

  rateLimitStore.set(identifier, {
    attempts: newAttempts,
    resetTime: entry.resetTime,
    blocked: isBlocked,
  })

  if (isBlocked) {
    // Block for extended period
    const blockEntry = rateLimitStore.get(identifier)
    if (blockEntry) {
      blockEntry.resetTime = now + config.blockDurationMs
      rateLimitStore.set(identifier, blockEntry)
    }
  }

  return {
    allowed: !isBlocked,
    remainingAttempts: Math.max(0, config.maxAttempts - newAttempts),
    resetTime: entry.resetTime,
  }
}

/**
 * Reset rate limit untuk identifier tertentu (untuk testing atau manual reset)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Initialize rate limit config from database
 * Call this on application startup to preload config
 */
export async function initializeRateLimitConfig(): Promise<void> {
  try {
    await fetchRateLimitConfig()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Rate Limit] Error initializing config:', error)
    }
  }
}

/**
 * Get current rate limit configuration (async version)
 * Use this to get fresh config from database
 */
export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  return await fetchRateLimitConfig()
}

/**
 * Clear config cache to force refresh on next request
 */
export function clearRateLimitConfigCache(): void {
  cachedConfig = null
  configLastFetched = 0
}

/**
 * Get client IP dari request (NextRequest atau Request)
 */
export function getClientIP(request: any): string {
  // NextRequest memiliki headers dengan method get()
  if (request && typeof request.headers === 'object' && typeof request.headers.get === 'function') {
    // Try to get IP from various headers (for proxies/load balancers)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    // Try ip property (NextRequest might have this)
    if (request.ip) {
      return request.ip;
    }
  }

  // Fallback
  return 'unknown';
}

