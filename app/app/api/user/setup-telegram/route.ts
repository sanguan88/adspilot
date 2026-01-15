import { NextRequest, NextResponse } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { generateSetupLink } from '@/tele/setup'

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveStatus(request)

    const result = generateSetupLink(user.userId)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate telegram setup link',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate telegram setup link',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireActiveStatus(request)

    // Import helper dynamically
    const { withDatabaseConnection } = await import('@/lib/db')

    await withDatabaseConnection(async (client) => {
      const query = `
        UPDATE data_user 
        SET chatid_tele = NULL 
        WHERE user_id = $1
      `
      await client.query(query, [user.userId])
    })

    return NextResponse.json({
      success: true,
      message: 'Telegram disconnected successfully'
    })
  } catch (error) {
    console.error('[API] Error disconnecting telegram:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disconnect telegram',
      },
      { status: 500 }
    )
  }
}

