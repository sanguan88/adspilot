/**
 * Centralized logging utility with security-aware logging
 * Sanitizes sensitive data before logging
 */

const SENSITIVE_KEYS = [
  'cookie',
  'cookies',
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'authorization',
  'auth',
  'credential',
  'credentials',
]

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const

type LogLevel = keyof typeof LOG_LEVELS

const currentLogLevel: LogLevel = 
  (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG')

/**
 * Recursively sanitize object by removing or redacting sensitive keys
 */
function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 10) return '[Max Depth Reached]' // Prevent infinite recursion
  
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1))
  }

  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    
    // Check if key contains any sensitive keyword
    if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
      sanitized[key] = '[REDACTED]'
      continue
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Format log message with timestamp and level
 */
function formatLogMessage(level: LogLevel, message: string, data?: any): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level}]`
  
  if (data !== undefined) {
    const sanitizedData = sanitizeObject(data)
    return `${prefix} ${message}\n${JSON.stringify(sanitizedData, null, 2)}`
  }
  
  return `${prefix} ${message}`
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel]
}

/**
 * Logger class with security-aware logging
 */
export const logger = {
  debug: (message: string, data?: any) => {
    if (shouldLog('DEBUG')) {
      console.debug(formatLogMessage('DEBUG', message, data))
    }
  },

  info: (message: string, data?: any) => {
    if (shouldLog('INFO')) {
      console.info(formatLogMessage('INFO', message, data))
    }
  },

  warn: (message: string, data?: any) => {
    if (shouldLog('WARN')) {
      console.warn(formatLogMessage('WARN', message, data))
    }
  },

  error: (message: string, error?: any) => {
    if (shouldLog('ERROR')) {
      const errorData = error instanceof Error 
        ? { message: error.message, stack: error.stack, name: error.name }
        : error
      console.error(formatLogMessage('ERROR', message, errorData))
    }
  },
}

/**
 * Safe logger for development only
 * Will not log in production unless LOG_LEVEL=DEBUG
 */
export const devLogger = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'DEBUG') {
      logger.debug(message, data)
    }
  },
}

