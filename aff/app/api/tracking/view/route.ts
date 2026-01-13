import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { affiliateCode } = body

    if (!affiliateCode) {
      return NextResponse.json(
        { success: false, error: 'Affiliate code is required' },
        { status: 400 }
      )
    }

    // Get affiliate ID from code
    const connection = await getDatabaseConnection()
    
    try {
      const affiliateResult = await connection.query(
        `SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1`,
        [affiliateCode]
      )

      if (affiliateResult.rows.length === 0) {
        // If affiliate not found, still return success (don't break the page)
        return NextResponse.json({ success: true })
      }

      const affiliateId = affiliateResult.rows[0].affiliate_id

      // Track page view
      await connection.query(
        `INSERT INTO affiliate_clicks (affiliate_id, link_id, click_type, ip_address, user_agent, created_at)
        VALUES ($1, NULL, 'view', $2, $3, NOW())`,
        [
          affiliateId,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
        ]
      )

      return NextResponse.json({ success: true })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Track view error:', error)
    // Don't break the page if tracking fails
    return NextResponse.json({ success: true })
  }
}

