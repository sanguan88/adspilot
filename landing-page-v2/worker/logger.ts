/**
 * Worker Logger
 * 
 * Logger untuk automation worker dengan format yang jelas
 */

import { LOG_CONFIG } from './config'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

class WorkerLogger {
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [WORKER]`
    
    if (data && LOG_CONFIG.LOG_LEVEL === 'debug') {
      // Hanya log data di debug mode, dan filter sensitive data
      const sanitizedData = this.sanitizeData(data)
      return `${prefix} ${message} ${JSON.stringify(sanitizedData)}`
    }
    
    return `${prefix} ${message}`
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data
    }

    const sensitiveKeys = ['cookies', 'token', 'password', 'api_key', 'secret']
    const sanitized: any = Array.isArray(data) ? [] : {}

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '***REDACTED***'
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value)
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(LOG_CONFIG.LOG_LEVEL as LogLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data))
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data))
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data))
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const errorMessage = error instanceof Error 
        ? `${message}: ${error.message}`
        : error 
          ? `${message}: ${JSON.stringify(this.sanitizeData(error))}`
          : message
      console.error(this.formatMessage('error', errorMessage))
    }
  }
}

export const logger = new WorkerLogger()

