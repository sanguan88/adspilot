/**
 * Telegram Webhook Handler
 * 
 * Handler untuk memproses webhook dari Telegram
 */

import { getDatabaseConnection } from '@/lib/db'
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors'
import { comparePassword } from '@/lib/auth'
import type { TelegramUpdate, TelegramMessage } from './types'
import { parseStartParameter, extractChatId, isStartCommand } from './utils'
import { sendSetupConfirmation, sendTelegramMessage } from './service'
import { randomBytes } from 'crypto'

// Session management untuk menyimpan state percakapan
interface ChatSession {
  command: 'login' | 'reset' | null
  step: 'username' | 'password' | null
  username?: string
  expiresAt: number
}

const chatSessions = new Map<number, ChatSession>()

// Cleanup expired sessions setiap 10 menit
const SESSION_TIMEOUT = 10 * 60 * 1000 // 10 menit
setInterval(() => {
  const now = Date.now()
  for (const [chatId, session] of chatSessions.entries()) {
    if (session.expiresAt < now) {
      chatSessions.delete(chatId)
    }
  }
}, 5 * 60 * 1000) // Check setiap 5 menit

/**
 * Process Telegram webhook update
 * 
 * @param update - Telegram update dari webhook
 * @returns Result object
 */
export async function processWebhookUpdate(update: TelegramUpdate): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  // Handle message
  if (update.message) {
    return await handleMessage(update.message)
  }

  // Handle edited message
  if (update.edited_message) {
    // Untuk sekarang, kita ignore edited messages
    return {
      success: true,
      message: 'Edited message ignored',
    }
  }

  // Handle callback query (untuk inline buttons)
  if (update.callback_query) {
    // TODO: Implement callback query handling jika diperlukan
    return {
      success: true,
      message: 'Callback query received',
    }
  }

  return {
    success: true,
    message: 'Webhook received but no action taken',
  }
}

/**
 * Handle incoming message
 * 
 * @param message - Telegram message
 * @returns Result object
 */
async function handleMessage(message: TelegramMessage): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  // Check jika ini adalah /start command
  if (isStartCommand(message)) {
    return await handleStartCommand(message)
  }

  // Handle other commands
  const text = message.text || ''

  if (text.startsWith('/login_adbot')) {
    return await handleLoginCommand(message)
  }

  if (text.startsWith('/reset_adbot')) {
    return await handleResetCommand(message)
  }

  if (text.startsWith('/status_adbot')) {
    return await handleStatusCommand(message)
  }

  // Handle session-based responses (untuk login dan reset yang sedang berlangsung)
  const chatId = extractChatId(message)
  if (chatId) {
    const session = chatSessions.get(chatId)
    if (session) {
      if (session.command === 'login') {
        return await handleLoginFlow(message, session)
      }
      if (session.command === 'reset') {
        return await handleResetFlow(message, session)
      }
    }
  }

  // Jika tidak ada command yang dikenali, kirim pesan help
  if (chatId && text.trim()) {
    try {
      await sendTelegramMessage({
        chatId,
        message: `❓ Command tidak dikenali: ${text}\n\n` +
          `*Commands yang tersedia:*\n` +
          `• /start - Informasi bot\n` +
          `• /status_adbot - Cek status akun\n` +
          `• /login_adbot - Login via Telegram\n` +
          `• /reset_adbot - Reset password`,
        parseMode: 'Markdown',
      })
    } catch (e) {
      // Ignore
    }
  }

  return {
    success: true,
    message: 'Message received',
  }
}

/**
 * Handle /start command untuk setup Telegram
 * 
 * @param message - Telegram message dengan /start command
 * @returns Result object
 */
async function handleStartCommand(message: TelegramMessage): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  let connection = null

  try {
    const chatId = extractChatId(message)
    if (!chatId) {
      // Send error message to user
      try {
        await sendTelegramMessage({
          chatId: message.chat?.id || 0,
          message: '❌ Error: Chat ID tidak ditemukan. Silakan coba lagi.',
        })
      } catch (e) {
        // Ignore send error if chatId is invalid
      }
      return {
        success: false,
        error: 'Chat ID not found in message',
      }
    }

    // Parse start parameter
    const startParam = parseStartParameter(message.text || '')

    // Jika tidak ada start parameter, kirim pesan help
    if (!startParam) {
      await sendTelegramMessage({
        chatId,
        message: `👋 Selamat datang di AdsPilot Bot!\n\n` +
          `Untuk menggunakan bot ini, Anda perlu setup melalui aplikasi web terlebih dahulu:\n\n` +
          `1. Login ke aplikasi: https://app.adspilot.id\n` +
          `2. Pergi ke halaman Settings/Telegram\n` +
          `3. Klik tombol "Setup Telegram"\n` +
          `4. Gunakan link yang diberikan untuk menghubungkan bot\n\n` +
          `Commands yang tersedia:\n` +
          `• /status_adbot - Cek status akun\n` +
          `• /login_adbot - Login via Telegram\n` +
          `• /reset_adbot - Reset password via Telegram`,
        // parseMode: 'Markdown', // Disable markdown for safety
      })

      return {
        success: true,
        message: 'Help message sent',
      }
    }

    const { userId } = startParam

    // Update chatid_tele di database
    connection = await getDatabaseConnection()

    // Handle both string (user_id) and number (no) formats
    let updateResult
    if (typeof userId === 'string') {
      // New format: user_id (VARCHAR) as string
      updateResult = await connection.query(
        `UPDATE data_user SET chatid_tele = $1 WHERE user_id = $2`,
        [chatId.toString(), userId]
      )
    } else {
      // Old format: no (INTEGER) - backward compatibility
      updateResult = await connection.query(
        `UPDATE data_user SET chatid_tele = $1 WHERE no = $2`,
        [chatId.toString(), userId]
      )
    }

    // Log update result for debugging
    const timestamp = new Date().toISOString()
    if (updateResult.rowCount === 0) {
      console.warn(`[${timestamp}] [Telegram Webhook] No rows updated for userId: ${userId}, chatId: ${chatId}`)
    } else {
      console.log(`[${timestamp}] [Telegram Webhook] Updated chatid_tele for userId: ${userId} (${typeof userId}), chatId: ${chatId}, rows affected: ${updateResult.rowCount}`)
    }

    // Send confirmation message
    await sendSetupConfirmation(chatId)

    connection.release()

    return {
      success: true,
      message: 'Telegram setup completed',
    }
  } catch (error) {
    if (connection) {
      connection.release()
    }

    const chatId = extractChatId(message)
    if (chatId) {
      // Send error message to user
      try {
        await sendTelegramMessage({
          chatId,
          message: '❌ Terjadi kesalahan saat memproses command. Silakan coba lagi atau hubungi admin.',
        })
      } catch (e) {
        // Ignore send error
      }
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
    console.error(`[${timestamp}] Error processing start command: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

    return {
      success: false,
      error: 'Failed to process start command',
    }
  }
}

/**
 * Handle /login_adbot command
 */
async function handleLoginCommand(message: TelegramMessage): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const chatId = extractChatId(message)
  if (!chatId) {
    try {
      await sendTelegramMessage({
        chatId: message.chat?.id || 0,
        message: '❌ Error: Chat ID tidak ditemukan. Silakan coba lagi.',
      })
    } catch (e) {
      // Ignore
    }
    return {
      success: false,
      error: 'Chat ID not found',
    }
  }

  try {
    // Initialize session
    chatSessions.set(chatId, {
      command: 'login',
      step: 'username',
      expiresAt: Date.now() + SESSION_TIMEOUT,
    })

    await sendTelegramMessage({
      chatId,
      message: '🔐 *Login via Telegram*\n\nMasukkan username atau email Anda:',
      parseMode: 'Markdown',
    })

    return {
      success: true,
      message: 'Login command received',
    }
  } catch (error) {
    try {
      await sendTelegramMessage({
        chatId,
        message: '❌ Terjadi kesalahan. Silakan coba lagi.',
      })
    } catch (e) {
      // Ignore
    }
    return {
      success: false,
      error: 'Failed to process login command',
    }
  }
}

/**
 * Handle login flow (username dan password)
 */
async function handleLoginFlow(message: TelegramMessage, session: ChatSession): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const chatId = extractChatId(message)
  if (!chatId) {
    return {
      success: false,
      error: 'Chat ID not found',
    }
  }

  const text = message.text || ''

  if (session.step === 'username') {
    // Simpan username dan minta password
    session.username = text.trim()
    session.step = 'password'

    await sendTelegramMessage({
      chatId,
      message: 'Masukkan password Anda:',
    })

    return {
      success: true,
      message: 'Username received, waiting for password',
    }
  }

  if (session.step === 'password') {
    // Lakukan login
    const password = text.trim()
    const username = session.username || ''

    let connection = null
    try {
      connection = await getDatabaseConnection()

      // Cari user berdasarkan username atau email
      const result = await connection.query(
        `SELECT no, user_id, username, password, email, nama_lengkap, role, status_user
         FROM data_user 
         WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)) AND status_user = 'aktif'`,
        [username]
      )

      if (result.rows.length === 0) {
        chatSessions.delete(chatId)
        connection.release()
        await sendTelegramMessage({
          chatId,
          message: '❌ Username/Email atau password salah.',
        })
        return {
          success: true,
          message: 'Login failed - user not found',
        }
      }

      const user = result.rows[0]

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password)

      if (!isPasswordValid) {
        chatSessions.delete(chatId)
        connection.release()
        await sendTelegramMessage({
          chatId,
          message: '❌ Username/Email atau password salah.',
        })
        return {
          success: true,
          message: 'Login failed - invalid password',
        }
      }

      // Update chatid_tele di database
      await connection.query(
        `UPDATE data_user SET chatid_tele = $1 WHERE no = $2`,
        [chatId.toString(), user.no]
      )

      connection.release()
      chatSessions.delete(chatId)

      await sendTelegramMessage({
        chatId,
        message: `✅ *Login Berhasil!*\n\n` +
          `Selamat datang, ${user.nama_lengkap || user.username}!\n\n` +
          `Telegram Anda telah terhubung dengan akun ini.`,
        parseMode: 'Markdown',
      })

      return {
        success: true,
        message: 'Login successful',
      }
    } catch (error) {
      if (connection) {
        connection.release()
      }
      chatSessions.delete(chatId)

      if (isDatabaseConnectionError(error)) {
        const sanitized = sanitizeErrorForLogging(error)
        const timestamp = new Date().toISOString()
        console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

        await sendTelegramMessage({
          chatId,
          message: '❌ Terjadi kesalahan pada sistem. Silakan coba lagi nanti.',
        })

        return {
          success: false,
          error: getGenericDatabaseErrorMessage(),
        }
      }

      const sanitized = sanitizeErrorForLogging(error)
      const timestamp = new Date().toISOString()
      console.error(`[${timestamp}] Error processing login: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

      await sendTelegramMessage({
        chatId,
        message: '❌ Terjadi kesalahan saat login. Silakan coba lagi.',
      })

      return {
        success: false,
        error: 'Failed to process login',
      }
    }
  }

  return {
    success: true,
    message: 'Login flow processed',
  }
}

/**
 * Handle /reset_adbot command
 */
async function handleResetCommand(message: TelegramMessage): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const chatId = extractChatId(message)
  if (!chatId) {
    return {
      success: false,
      error: 'Chat ID not found',
    }
  }

  // Initialize session
  chatSessions.set(chatId, {
    command: 'reset',
    step: 'username',
    expiresAt: Date.now() + SESSION_TIMEOUT,
  })

  await sendTelegramMessage({
    chatId,
    message: '🔐 *Reset Password via Telegram*\n\nMasukkan username atau email Anda:',
    parseMode: 'Markdown',
  })

  return {
    success: true,
    message: 'Reset command received',
  }
}

/**
 * Handle reset flow (username dan generate reset link)
 */
async function handleResetFlow(message: TelegramMessage, session: ChatSession): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const chatId = extractChatId(message)
  if (!chatId) {
    return {
      success: false,
      error: 'Chat ID not found',
    }
  }

  const text = message.text || ''
  const username = text.trim()

  let connection = null
  try {
    connection = await getDatabaseConnection()

    // Cek apakah user ada
    const result = await connection.query(
      `SELECT no, username, email, nama_lengkap, chatid_tele
       FROM data_user 
       WHERE (LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)) AND status_user = 'aktif'`,
      [username]
    )

    chatSessions.delete(chatId)

    if (result.rows.length === 0) {
      connection.release()
      // Untuk keamanan, tetap return success
      await sendTelegramMessage({
        chatId,
        message: '✅ Jika username/email terdaftar, link reset password akan dikirim ke Telegram Anda.',
      })
      return {
        success: true,
        message: 'Reset requested (user not found)',
      }
    }

    const user = result.rows[0]

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Token berlaku 1 jam

    // Simpan reset token ke database
    try {
      await connection.query(
        `UPDATE data_user 
         SET password_reset_token = $1, password_reset_expires = $2 
         WHERE no = $3`,
        [resetToken, expiresAt, user.no]
      )
    } catch (updateError: any) {
      if (updateError.code === '42703') { // column does not exist
        connection.release()
        await sendTelegramMessage({
          chatId,
          message: '❌ Fitur reset password belum dikonfigurasi dengan benar.',
        })
        return {
          success: false,
          error: 'Database configuration error',
        }
      }
      throw updateError
    }

    // Dapatkan base URL (gunakan environment variable atau default)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.adspilot.id'
    const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`

    // Kirim link reset password ke Telegram user
    const telegramMessage = `🔐 *Reset Password*\n\n` +
      `Halo ${user.nama_lengkap || user.username},\n\n` +
      `Anda telah meminta reset password untuk akun Anda.\n\n` +
      `Klik link berikut untuk reset password Anda:\n` +
      `${resetLink}\n\n` +
      `⚠️ *Penting:*\n` +
      `• Link ini hanya berlaku selama 1 jam\n` +
      `• Jika Anda tidak meminta reset password, abaikan pesan ini\n` +
      `• Jangan bagikan link ini kepada siapapun`

    // Kirim ke chatId yang meminta (bisa berbeda dengan chatid_tele user)
    await sendTelegramMessage({
      chatId,
      message: telegramMessage,
      parseMode: 'Markdown',
      disableWebPagePreview: false,
    })

    // Jika user sudah punya chatid_tele yang berbeda, kirim juga ke sana
    if (user.chatid_tele && user.chatid_tele !== chatId.toString()) {
      try {
        await sendTelegramMessage({
          chatId: user.chatid_tele,
          message: telegramMessage,
          parseMode: 'Markdown',
          disableWebPagePreview: false,
        })
      } catch (err) {
        // Ignore error jika tidak bisa kirim ke chatid_tele lama
      }
    }

    connection.release()

    return {
      success: true,
      message: 'Reset link sent',
    }
  } catch (error) {
    if (connection) {
      connection.release()
    }

    if (isDatabaseConnectionError(error)) {
      const sanitized = sanitizeErrorForLogging(error)
      const timestamp = new Date().toISOString()
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

      await sendTelegramMessage({
        chatId,
        message: '❌ Terjadi kesalahan pada sistem. Silakan coba lagi nanti.',
      })

      return {
        success: false,
        error: getGenericDatabaseErrorMessage(),
      }
    }

    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error processing reset: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

    await sendTelegramMessage({
      chatId,
      message: '❌ Terjadi kesalahan saat memproses reset password. Silakan coba lagi.',
    })

    return {
      success: false,
      error: 'Failed to process reset',
    }
  }
}

/**
 * Handle /status_adbot command
 */
async function handleStatusCommand(message: TelegramMessage): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  const chatId = extractChatId(message)
  if (!chatId) {
    try {
      await sendTelegramMessage({
        chatId: message.chat?.id || 0,
        message: '❌ Error: Chat ID tidak ditemukan. Silakan coba lagi.',
      })
    } catch (e) {
      // Ignore
    }
    return {
      success: false,
      error: 'Chat ID not found',
    }
  }

  let connection = null
  try {
    connection = await getDatabaseConnection()

    // Cari user berdasarkan chatid_tele
    const result = await connection.query(
      `SELECT no, user_id, username, email, nama_lengkap, role, status_user, 
              created_at, last_login, chatid_tele
       FROM data_user 
       WHERE chatid_tele = $1 AND status_user = 'aktif'`,
      [chatId.toString()]
    )

    connection.release()

    if (result.rows.length === 0) {
      await sendTelegramMessage({
        chatId,
        message: '❌ Akun tidak ditemukan atau belum terhubung dengan Telegram.\n\n' +
          'Gunakan /login_adbot untuk menghubungkan akun Anda.',
      })
      return {
        success: true,
        message: 'User not found',
      }
    }

    const user = result.rows[0]

    // Format tanggal
    const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : 'N/A'
    const lastLogin = user.last_login ? new Date(user.last_login).toLocaleDateString('id-ID') : 'Belum pernah login'

    const statusMessage = `📊 *Informasi Akun*\n\n` +
      `*Username:* ${user.username}\n` +
      `*Email:* ${user.email}\n` +
      `*Nama Lengkap:* ${user.nama_lengkap || 'N/A'}\n` +
      `*Role:* ${user.role}\n` +
      `*Status:* ${user.status_user}\n` +
      `*User ID:* \`${user.user_id}\`\n` +
      `*Tanggal Daftar:* ${createdDate}\n` +
      `*Login Terakhir:* ${lastLogin}\n` +
      `*Chat ID Telegram:* \`${chatId}\``

    await sendTelegramMessage({
      chatId,
      message: statusMessage,
      parseMode: 'Markdown',
    })

    return {
      success: true,
      message: 'Status sent',
    }
  } catch (error) {
    if (connection) {
      connection.release()
    }

    if (isDatabaseConnectionError(error)) {
      const sanitized = sanitizeErrorForLogging(error)
      const timestamp = new Date().toISOString()
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

      await sendTelegramMessage({
        chatId,
        message: '❌ Terjadi kesalahan pada sistem. Silakan coba lagi nanti.',
      })

      return {
        success: false,
        error: getGenericDatabaseErrorMessage(),
      }
    }

    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error processing status: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

    await sendTelegramMessage({
      chatId,
      message: '❌ Terjadi kesalahan saat memproses status. Silakan coba lagi.',
    })

    return {
      success: false,
      error: 'Failed to process status',
    }
  }
}

