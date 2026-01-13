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

    if (!data.ok && retryCount < TELEGRAM_RETRY_CONFIG.MAX_RETRIES) {
      // Retry dengan exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, TELEGRAM_RETRY_CONFIG.RETRY_DELAY_MS * (retryCount + 1))
      )
      return sendTelegramMessage(payload, retryCount + 1)
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

