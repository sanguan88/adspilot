import { NextRequest, NextResponse } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getTelegramStatus } from '@/tele/status'

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveStatus(request)
    
    const result = await getTelegramStatus(user.userId)
    
    if (!result.success) {
      // Log error for debugging
      console.error('[Telegram Status API] Error:', result.error, 'User ID:', user.userId)
      
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to check telegram status',
        },
        { status: result.error?.includes('not found') ? 404 : result.error?.includes('Database') ? 503 : 500 }
      )
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    // Log error for debugging
    console.error('[Telegram Status API] Exception:', error?.message || error, 'Stack:', error?.stack)
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to check telegram status',
      },
      { status: 500 }
    )
  }
}

