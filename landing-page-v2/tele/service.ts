/**
 * Telegram Service
 * 
 * Service untuk mengirim notifikasi dan berinteraksi dengan Telegram API
 */

import { getTelegramApiUrl, TELEGRAM_RETRY_CONFIG, TELEGRAM_API_TIMEOUT } from './config'
import type { NotificationPayload, TelegramSendMessageResponse, RuleNotificationData } from './types'
import { formatRuleNotificationMessage, replaceTemplateVariables, isValidChatId } from './utils'

/**
 * Send message ke Telegram
 * 
 * @param payload - Notification payload
 * @param retryCount - Current retry count (internal)
 * @returns Response dari Telegram API
 */
export async function sendTelegramMessage(
  payload: NotificationPayload,
  retryCount: number = 0
): Promise<TelegramSendMessageResponse> {
  if (!isValidChatId(payload.chatId)) {
    throw new Error(`Invalid chat ID: ${payload.chatId}`)
  }

  const url = getTelegramApiUrl('sendMessage')

  const requestBody = {
    chat_id: payload.chatId,
    text: payload.message,
    parse_mode: payload.parseMode || undefined,
    disable_web_page_preview: payload.disableWebPagePreview ?? true,
    disable_notification: payload.disableNotification ?? false,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_API_TIMEOUT)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data: TelegramSendMessageResponse = await response.json()

    if (!data.ok) {
      console.error(`[Telegram Service] Error sending message to ${payload.chatId}:`, data)
      if (retryCount < TELEGRAM_RETRY_CONFIG.MAX_RETRIES) {
        // Retry dengan exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, TELEGRAM_RETRY_CONFIG.RETRY_DELAY_MS * (retryCount + 1))
        )
        return sendTelegramMessage(payload, retryCount + 1)
      }
    } else {
      console.log(`[Telegram Service] Message sent to ${payload.chatId}, update_id: ${data.result?.message_id}`)
    }

    return data
  } catch (error) {
    if (retryCount < TELEGRAM_RETRY_CONFIG.MAX_RETRIES) {
      await new Promise(resolve =>
        setTimeout(resolve, TELEGRAM_RETRY_CONFIG.RETRY_DELAY_MS * (retryCount + 1))
      )
      return sendTelegramMessage(payload, retryCount + 1)
    }

    throw error
  }
}

/**
 * Send notifikasi untuk rule yang dipicu
 * 
 * @param chatId - Chat ID user
 * @param data - Rule notification data
 * @returns Response dari Telegram API
 */
export async function sendRuleNotification(
  chatId: string | number,
  data: RuleNotificationData
): Promise<TelegramSendMessageResponse> {
  // Jika ada custom message dari action telegram_notification, gunakan itu
  let message: string

  if (data.message) {
    // Replace template variables dalam custom message
    message = replaceTemplateVariables(data.message, {
      ruleName: data.ruleName,
      ruleId: data.ruleId,
      time: data.triggeredAt,
      action: data.actions.join(', '),
    })
  } else {
    // Gunakan format default
    message = formatRuleNotificationMessage({
      ruleName: data.ruleName,
      ruleId: data.ruleId,
      triggeredAt: data.triggeredAt,
      conditions: data.conditions,
      actions: data.actions,
    })
  }

  return sendTelegramMessage({
    chatId,
    message,
    parseMode: 'Markdown',
    disableWebPagePreview: true,
  })
}

/**
 * Send confirmation message setelah setup Telegram
 * 
 * @param chatId - Chat ID user
 * @returns Response dari Telegram API
 */
export async function sendSetupConfirmation(chatId: string | number): Promise<TelegramSendMessageResponse> {
  const { TELEGRAM_MESSAGES } = await import('./config')

  return sendTelegramMessage({
    chatId,
    message: TELEGRAM_MESSAGES.SETUP_SUCCESS,
    disableWebPagePreview: true,
  })
}

/**
 * Batch send messages ke multiple chat IDs
 * 
 * @param chatIds - Array of chat IDs
 * @param message - Message to send
 * @returns Array of results
 */
export async function sendBatchMessages(
  chatIds: (string | number)[],
  message: string
): Promise<Array<{ chatId: string | number; success: boolean; error?: string }>> {
  const results = await Promise.allSettled(
    chatIds.map(chatId =>
      sendTelegramMessage({
        chatId,
        message,
        parseMode: 'Markdown',
      })
    )
  )

  return results.map((result, index) => {
    const chatId = chatIds[index]

    if (result.status === 'fulfilled' && result.value.ok) {
      return { chatId, success: true }
    }

    return {
      chatId,
      success: false,
      error: result.status === 'rejected'
        ? result.reason?.message || 'Unknown error'
        : result.value.description || 'Telegram API error',
    }
  })
}

/**
 * Get bot info dari Telegram API
 * 
 * @returns Bot info
 */
export async function getBotInfo(): Promise<any> {
  const url = getTelegramApiUrl('getMe')

  const response = await fetch(url, {
    method: 'GET',
  })

  const data = await response.json()
  return data
}

/**
 * Set webhook URL untuk bot
 * 
 * @param webhookUrl - Webhook URL
 * @returns Response dari Telegram API
 */
export async function setWebhook(webhookUrl: string): Promise<any> {
  const url = getTelegramApiUrl('setWebhook')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
    }),
  })

  return response.json()
}

/**
 * Delete webhook
 * 
 * @returns Response dari Telegram API
 */
export async function deleteWebhook(): Promise<any> {
  const url = getTelegramApiUrl('deleteWebhook')

  const response = await fetch(url, {
    method: 'POST',
  })

  return response.json()
}

/**
 * Get webhook info
 * 
 * @returns Webhook info
 */
export async function getWebhookInfo(): Promise<any> {
  const url = getTelegramApiUrl('getWebhookInfo')

  const response = await fetch(url, {
    method: 'GET',
  })

  return response.json()
}

/**
 * Send photo ke Telegram
 * 
 * @param chatId - Chat ID untuk mengirim foto
 * @param photoPath - Path ke file foto (absolute path atau URL)
 * @param caption - Caption untuk foto (optional)
 * @param parseMode - Parse mode untuk caption (optional)
 * @returns Response dari Telegram API
 */
export async function sendTelegramPhoto(
  chatId: string | number,
  photoPath: string,
  caption?: string,
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
): Promise<TelegramSendMessageResponse> {
  if (!isValidChatId(chatId)) {
    throw new Error(`Invalid chat ID: ${chatId}`)
  }

  const url = getTelegramApiUrl('sendPhoto')

  // Check if photoPath is a URL or file path
  const isUrl = photoPath.startsWith('http://') || photoPath.startsWith('https://')

  if (isUrl) {
    // If it's a URL, send as JSON
    const requestBody: any = {
      chat_id: chatId,
      photo: photoPath,
    }

    if (caption) {
      requestBody.caption = caption
    }

    if (parseMode) {
      requestBody.parse_mode = parseMode
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    return response.json()
  } else {
    // If it's a file path, convert to URL first
    // Since files are saved to public folder, we can construct the URL
    let photoUrl: string

    if (photoPath.startsWith('/')) {
      // It's already a public URL path like /uploads/payment-proofs/file.jpg or /api/uploads/payment-proofs/file.jpg
      // Convert /uploads/... to /api/uploads/... for better compatibility
      let apiPath = photoPath
      if (photoPath.startsWith('/uploads/payment-proofs/')) {
        // Convert to API route
        apiPath = photoPath.replace('/uploads/payment-proofs/', '/api/uploads/payment-proofs/')
      }

      // Get base URL from environment or construct it
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.adspilot.id')
      photoUrl = `${baseUrl}${apiPath}`
    } else {
      // It's an absolute file path, try to convert to public URL
      const { join, relative, basename } = await import('path')
      const filename = basename(photoPath)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.adspilot.id')
      // Use API route for payment proofs
      photoUrl = `${baseUrl}/api/uploads/payment-proofs/${filename}`
    }

    // Use URL to send photo
    const requestBody: any = {
      chat_id: chatId,
      photo: photoUrl,
    }

    if (caption) {
      requestBody.caption = caption
    }

    if (parseMode) {
      requestBody.parse_mode = parseMode
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    return response.json()
  }
}

