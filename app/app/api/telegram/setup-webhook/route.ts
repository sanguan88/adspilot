import { NextRequest, NextResponse } from 'next/server'
import { setWebhook, getWebhookInfo, deleteWebhook } from '@/tele/service'
import { TELEGRAM_WEBHOOK_URL } from '@/tele/config'

/**
 * POST /api/telegram/setup-webhook
 * 
 * Setup Telegram webhook URL
 * 
 * Body (optional):
 * {
 *   "webhookUrl": "https://yourdomain.com/api/telegram/webhook",
 *   "delete": false // Set true to delete webhook instead
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { webhookUrl, delete: shouldDelete } = body

    // If delete flag is set, delete the webhook
    if (shouldDelete) {
      const result = await deleteWebhook()
      return NextResponse.json({
        success: result.ok || false,
        data: result,
        message: result.ok ? 'Webhook berhasil dihapus' : result.description || 'Gagal menghapus webhook',
      })
    }

    // Use webhookUrl from request body, or from environment variable, or construct from request
    let targetWebhookUrl = webhookUrl || TELEGRAM_WEBHOOK_URL

    // If no webhook URL provided, try to construct from request
    if (!targetWebhookUrl) {
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('host') || request.headers.get('x-forwarded-host')
      
      if (host) {
        targetWebhookUrl = `${protocol}://${host}/api/telegram/webhook`
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Webhook URL tidak ditemukan. Silakan berikan webhookUrl dalam request body atau set TELEGRAM_WEBHOOK_URL environment variable.',
          },
          { status: 400 }
        )
      }
    }

    // Validate URL format
    try {
      new URL(targetWebhookUrl)
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: 'Format webhook URL tidak valid',
        },
        { status: 400 }
      )
    }

    // Set webhook
    const result = await setWebhook(targetWebhookUrl)

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.description || 'Gagal setup webhook',
          data: result,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        webhookUrl: targetWebhookUrl,
        result,
      },
      message: 'Webhook berhasil dikonfigurasi',
    })
  } catch (error: any) {
    console.error('Error setting up webhook:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan saat setup webhook',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/telegram/setup-webhook
 * 
 * Get current webhook info
 */
export async function GET(request: NextRequest) {
  try {
    const info = await getWebhookInfo()

    return NextResponse.json({
      success: true,
      data: info,
    })
  } catch (error: any) {
    console.error('Error getting webhook info:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan saat mendapatkan info webhook',
      },
      { status: 500 }
    )
  }
}

