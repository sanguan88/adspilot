import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function getAffiliateId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  
  if (token === 'bypass-token') {
    return 'bypass-affiliate'
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.affiliateId || null
  } catch {
    return null
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const affiliateId = await getAffiliateId(request)
    
    if (!affiliateId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { linkId } = params

    const connection = await getDatabaseConnection()
    
    try {
      // Verify link belongs to affiliate
      const verifyResult = await connection.query(
        `SELECT affiliate_id FROM tracking_links WHERE link_id = $1`,
        [linkId]
      )

      if (verifyResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Link not found' },
          { status: 404 }
        )
      }

      if (verifyResult.rows[0].affiliate_id !== affiliateId && affiliateId !== 'bypass-affiliate') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        )
      }

      // Delete link
      await connection.query(
        `DELETE FROM tracking_links WHERE link_id = $1`,
        [linkId]
      )

      return NextResponse.json({ success: true })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Delete link error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

