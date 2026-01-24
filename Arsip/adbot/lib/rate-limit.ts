/**
 * Simple in-memory rate limiter untuk mencegah brute force attacks
 * Untuk production, pertimbangkan menggunakan Redis atau database
 */

interface RateLimitEntry {
  attempts: number
  resetTime: number
  blocked: boolean
}

// In-memory store untuk rate limiting
// Key: IP address atau username
// Value: RateLimitEntry
const rateLimitStore = new Map<string, RateLimitEntry>()

// Konfigurasi rate limiting
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5, // Maksimal 5 percobaan
  windowMs: 15 * 60 * 1000, // 15 menit
  blockDurationMs: 30 * 60 * 1000, // Block selama 30 menit setelah max attempts
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
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry) {
    // First attempt
    rateLimitStore.set(identifier, {
      attempts: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
      blocked: false,
    })
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
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
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
      blocked: false,
    })
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    }
  }

  // Increment attempts
  const newAttempts = entry.attempts + 1
  const isBlocked = newAttempts > RATE_LIMIT_CONFIG.maxAttempts

  rateLimitStore.set(identifier, {
    attempts: newAttempts,
    resetTime: entry.resetTime,
    blocked: isBlocked,
  })

  if (isBlocked) {
    // Block for extended period
    const blockEntry = rateLimitStore.get(identifier)
    if (blockEntry) {
      blockEntry.resetTime = now + RATE_LIMIT_CONFIG.blockDurationMs
      rateLimitStore.set(identifier, blockEntry)
    }
  }

  return {
    allowed: !isBlocked,
    remainingAttempts: Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - newAttempts),
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

