/**
 * Telegram Status Functions
 * 
 * Functions untuk mengecek status Telegram user
 */

import { getDatabaseConnection } from '@/lib/db'
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors'
import type { TelegramStatus } from './types'

/**
 * Get Telegram status untuk user
 * 
 * @param userId - User ID (can be string user_id or number no)
 * @returns Telegram status
 */
export async function getTelegramStatus(userId: string | number): Promise<{
  success: boolean
  data?: TelegramStatus
  error?: string
}> {
  let connection = null

  try {
    connection = await getDatabaseConnection()

    // Handle both old token format (number/no) and new format (string/user_id)
    let result
    if (typeof userId === 'string') {
      // New format: user_id (VARCHAR) as string
      result = await connection.query(
        `SELECT chatid_tele FROM data_user WHERE user_id = $1`,
        [userId]
      )
    } else if (typeof userId === 'number') {
      // Old format: no (INTEGER) - need to query by no
      result = await connection.query(
        `SELECT chatid_tele FROM data_user WHERE no = $1`,
        [userId]
      )
    } else {
      connection.release()
      return {
        success: false,
        error: 'Invalid user ID format',
      }
    }

    if (result.rows.length === 0) {
      connection.release()
      return {
        success: false,
        error: 'User not found',
      }
    }

    const chatidTele = result.rows[0].chatid_tele

    connection.release()

    // Check if chatid_tele is valid (not null, not empty, not just whitespace)
    // Handle both string and number types
    const chatidTeleStr = chatidTele?.toString().trim() || ''
    const hasTelegram = chatidTeleStr !== '' && chatidTeleStr !== 'null' && chatidTeleStr !== 'undefined'

    return {
      success: true,
      data: {
        hasTelegram,
        chatid_tele: chatidTele,
      },
    }
  } catch (error) {
    if (connection) {
      connection.release()
    }

    if (isDatabaseConnectionError(error)) {
      const sanitized = sanitizeErrorForLogging(error)
      const timestamp = new Date().toISOString()
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

      return {
        success: false,
        error: getGenericDatabaseErrorMessage(),
      }
    }

    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error checking telegram status: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

    return {
      success: false,
      error: 'Failed to check telegram status',
    }
  }
}

