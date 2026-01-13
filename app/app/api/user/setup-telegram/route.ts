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

