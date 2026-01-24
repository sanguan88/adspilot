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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overall'

    // Get real leaderboard from database
    const connection = await getDatabaseConnection()

    try {
      let query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ac.amount), 0) DESC) as rank,
          a.affiliate_id as affiliateId,
          a.name as affiliateName,
          a.affiliate_code as affiliateCode,
          COALESCE(SUM(ac.amount), 0) as totalCommission,
          COUNT(DISTINCT ar.referral_id) as totalReferrals,
          CASE 
            WHEN COUNT(DISTINCT ac2.click_id) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN ar.status = 'converted' THEN ar.referral_id END)::numeric / COUNT(DISTINCT ac2.click_id)::numeric) * 100, 1)
            ELSE 0 
          END as conversionRate,
          CASE WHEN a.affiliate_id = $1 THEN true ELSE false END as isCurrentUser
        FROM affiliates a
        LEFT JOIN affiliate_commissions ac ON ac.affiliate_id = a.affiliate_id
        LEFT JOIN affiliate_referrals ar ON ar.affiliate_id = a.affiliate_id
        LEFT JOIN affiliate_clicks ac2 ON ac2.affiliate_id = a.affiliate_id
        WHERE a.status = 'active'
      `

      const params: any[] = [affiliateId]

      if (type === 'monthly') {
        query += ` AND EXTRACT(MONTH FROM ac.created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
                   AND EXTRACT(YEAR FROM ac.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`
      }

      query += `
        GROUP BY a.affiliate_id, a.name, a.affiliate_code
        HAVING COUNT(DISTINCT CASE WHEN ar.status = 'converted' THEN ar.referral_id END) >= 1
        ORDER BY totalCommission DESC
        LIMIT 100
      `

      const result = await connection.query(query, params)

      const leaderboard = result.rows.map(row => ({
        rank: parseInt(row.rank),
        affiliateId: row.affiliateid,
        affiliateName: row.affiliatename,
        affiliateCode: row.affiliatecode,
        totalCommission: parseFloat(row.totalcommission || '0'),
        totalReferrals: parseInt(row.totalreferrals || '0'),
        conversionRate: parseFloat(row.conversionrate || '0'),
        isCurrentUser: row.iscurrentuser,
      }))

      return NextResponse.json({ success: true, data: leaderboard })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get leaderboard error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
