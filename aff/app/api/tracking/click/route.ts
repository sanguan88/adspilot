import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { affiliateCode, type = 'cta' } = body

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

      // Get landing page link ID
      const linkResult = await connection.query(
        `SELECT link_id FROM tracking_links 
         WHERE affiliate_id = $1 AND link_type = 'landing' 
         ORDER BY created_at DESC LIMIT 1`,
        [affiliateId]
      )

      const linkId = linkResult.rows.length > 0 ? linkResult.rows[0].link_id : null

      // Track click
      await connection.query(
        `INSERT INTO affiliate_clicks (affiliate_id, link_id, click_type, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          affiliateId,
          linkId,
          type,
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          request.headers.get('user-agent') || 'unknown',
        ]
      )

      return NextResponse.json({ success: true })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Track click error:', error)
    // Don't break the page if tracking fails
    return NextResponse.json({ success: true })
  }
}

