/**
 * Telegram Setup Functions
 * 
 * Functions untuk setup dan konfigurasi Telegram
 */

import { getBotUrlWithStartParam } from './config'
import { generateStartParameter } from './utils'
import type { SetupTelegramResponse } from './types'

/**
 * Generate setup link untuk user
 * 
 * @param userId - User ID
 * @returns Setup response dengan bot URL
 */
export function generateSetupLink(userId: number): SetupTelegramResponse {
  try {
    const startParam = generateStartParameter(userId)
    const botUrl = getBotUrlWithStartParam(startParam)

    return {
      success: true,
      data: {
        botUrl,
        startParam,
        message: 'Silakan klik link untuk membuka bot Telegram dan kirim /start',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to generate telegram setup link',
    }
  }
}

