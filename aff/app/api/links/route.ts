import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
    }

    const affiliateId = affiliate.affiliateId

    // Get real links from database
    const connection = await getDatabaseConnection()

    try {
      const result = await connection.query(
        `WITH link_stats AS (
           SELECT 
             tl.link_id,
             tl.link_type,
             tl.url,
             tl.created_at,
             COUNT(DISTINCT ac.click_id) as clicks,
             COUNT(DISTINCT ar.referral_id) as conversions
           FROM tracking_links tl
           LEFT JOIN affiliate_clicks ac ON ac.link_id = tl.link_id
           LEFT JOIN affiliate_referrals ar ON ar.click_id = ac.click_id AND ar.status = 'converted'
           WHERE tl.affiliate_id = $1
           GROUP BY tl.link_id, tl.link_type, tl.url, tl.created_at
         ),
         daily_trends AS (
           SELECT 
             ac.link_id,
             date(ac.created_at) as trend_date,
             COUNT(*) as daily_clicks
           FROM affiliate_clicks ac
           JOIN tracking_links tl ON tl.link_id = ac.link_id
           WHERE tl.affiliate_id = $1 
             AND ac.created_at >= CURRENT_DATE - INTERVAL '6 days'
           GROUP BY ac.link_id, date(ac.created_at)
         )
         SELECT 
           ls.*,
           json_agg(json_build_object('date', dt.trend_date, 'clicks', dt.daily_clicks)) FILTER (WHERE dt.trend_date IS NOT NULL) as trend_data
         FROM link_stats ls
         LEFT JOIN daily_trends dt ON ls.link_id = dt.link_id
         GROUP BY ls.link_id, ls.link_type, ls.url, ls.created_at, ls.clicks, ls.conversions
         ORDER BY ls.created_at DESC`,
        [affiliateId]
      )

      const links = result.rows.map(row => {
        // Process trend data to ensure last 7 days are complete (fill missing days with 0)
        const trendMap = new Map(row.trend_data?.map((t: any) => [new Date(t.date).toISOString().split('T')[0], parseInt(t.clicks)]) || [])
        const trend = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0]
          trend.push(trendMap.get(dateStr) || 0)
        }

        return {
          id: row.link_id,
          type: row.link_type || 'checkout',
          url: row.url,
          clicks: parseInt(row.clicks || '0'),
          conversions: parseInt(row.conversions || '0'),
          createdAt: row.created_at,
          trend: trend // Array of 7 integers [0, 5, 2, ...]
        }
      })

      return NextResponse.json({ success: true, data: links })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get links error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
    }

    const affiliateId = affiliate.affiliateId
    const body = await request.json()
    const { type, customRef } = body

    if (!type || (type !== 'landing' && type !== 'checkout')) {
      return NextResponse.json(
        { success: false, error: 'Jenis link harus diisi (landing atau checkout)' },
        { status: 400 }
      )
    }

    // Get affiliate code
    const connection = await getDatabaseConnection()

    try {
      const affiliateCode = affiliate.affiliateCode
      let finalRef = affiliateCode

      if (customRef) {
        // Sanitize customRef: allow only alphanumeric and underscores
        const sanitizedRef = customRef.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase()
        if (sanitizedRef) {
          finalRef = `${affiliateCode}_${sanitizedRef}`
        }
      }

      // Generate URL based on type
      // Generate URL based on type
      const baseUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://adspilot.id'
      const url = type === 'landing'
        ? `${baseUrl}/?ref=${finalRef}`
        : `${baseUrl}/auth/checkout?ref=${finalRef}`

      // Insert tracking link
      const insertResult = await connection.query(
        `INSERT INTO tracking_links (affiliate_id, link_type, url, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING link_id, link_type, url, created_at`,
        [affiliateId, type, url]
      )

      const newLink = insertResult.rows[0]

      return NextResponse.json({
        success: true,
        data: {
          id: newLink.link_id,
          type: newLink.link_type,
          url: newLink.url,
          clicks: 0,
          conversions: 0,
          createdAt: newLink.created_at,
        },
      })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Create link error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { authorized, response, affiliate } = await requireAffiliateAuth(request)

    if (!authorized || !affiliate) {
      return response
    }

    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('id')

    if (!linkId) {
      return NextResponse.json(
        { success: false, error: 'ID link diperlukan' },
        { status: 400 }
      )
    }

    const affiliateId = affiliate.affiliateId
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

      const ownerId = verifyResult.rows[0].affiliate_id
      if (ownerId !== affiliateId) {
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
