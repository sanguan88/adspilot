import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
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

      const affiliateId = affiliate.affiliateId
      if (verifyResult.rows[0].affiliate_id !== affiliateId) {
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

