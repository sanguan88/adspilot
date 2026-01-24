import { NextRequest, NextResponse } from 'next/server'
import { processWebhookUpdate } from '@/tele/webhook'
import type { TelegramUpdate } from '@/tele/types'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()

  try {
    // Get raw body first for debugging
    const rawBody = await request.text()
    console.log(`[${timestamp}] [Telegram Webhook] Raw body length: ${rawBody.length}`)

    // Parse JSON manually
    let body: TelegramUpdate
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error(`[${timestamp}] [Telegram Webhook] JSON parse error:`, parseError)
      console.error(`[${timestamp}] [Telegram Webhook] Raw body (first 200 chars): ${rawBody.substring(0, 200)}`)
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    // Log incoming webhook (sanitized)
    const updateId = body.update_id
    const messageText = body.message?.text || body.edited_message?.text || ''
    console.log(`[${timestamp}] [Telegram Webhook] Update ID: ${updateId}, Text: ${messageText.substring(0, 50)}`)

    const result = await processWebhookUpdate(body)

    if (!result.success) {
      console.error(`[${timestamp}] [Telegram Webhook] Error: ${result.error}`)
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to process webhook',
        },
        { status: result.error?.includes('Database') ? 503 : 500 }
      )
    }

    console.log(`[${timestamp}] [Telegram Webhook] Success: ${result.message}`)
    return NextResponse.json({
      success: true,
      message: result.message || 'Webhook received',
    })
  } catch (error) {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [Telegram Webhook] Error processing webhook:`, error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
      },
      { status: 500 }
    )
  }
}

// GET endpoint untuk verify webhook (Telegram requirement)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Telegram webhook endpoint'
  })
}

