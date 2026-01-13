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

    // Get real stats from database
    const connection = await getDatabaseConnection()

    try {
      // Total commission (all time)
      const totalCommissionResult = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total
        FROM affiliate_commissions
        WHERE affiliate_id = $1`,
        [affiliateId]
      )
      const totalCommission = parseFloat(totalCommissionResult.rows[0]?.total || '0')

      // Pending commission
      const pendingCommissionResult = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total
        FROM affiliate_commissions
        WHERE affiliate_id = $1 AND status = 'pending'`,
        [affiliateId]
      )
      const pendingCommission = parseFloat(pendingCommissionResult.rows[0]?.total || '0')

      // Paid commission
      const paidCommissionResult = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total
        FROM affiliate_commissions
        WHERE affiliate_id = $1 AND status = 'paid'`,
        [affiliateId]
      )
      const paidCommission = parseFloat(paidCommissionResult.rows[0]?.total || '0')

      // Total referrals
      const totalReferralsResult = await connection.query(
        `SELECT COUNT(*) as count
        FROM affiliate_referrals
        WHERE affiliate_id = $1`,
        [affiliateId]
      )
      const totalReferrals = parseInt(totalReferralsResult.rows[0]?.count || '0')

      // Converted referrals
      const convertedReferralsResult = await connection.query(
        `SELECT COUNT(*) as count
        FROM affiliate_referrals
        WHERE affiliate_id = $1 AND status = 'converted'`,
        [affiliateId]
      )
      const convertedReferrals = parseInt(convertedReferralsResult.rows[0]?.count || '0')

      // Conversion rate
      const conversionRate = totalReferrals > 0
        ? Math.round((convertedReferrals / totalReferrals) * 100)
        : 0

      // Total clicks
      const totalClicksResult = await connection.query(
        `SELECT COUNT(*) as count
        FROM affiliate_clicks
        WHERE affiliate_id = $1`,
        [affiliateId]
      )
      const totalClicks = parseInt(totalClicksResult.rows[0]?.count || '0')

      // This month commission
      const thisMonthResult = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) as total
        FROM affiliate_commissions
        WHERE affiliate_id = $1 
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [affiliateId]
      )
      const thisMonthCommission = parseFloat(thisMonthResult.rows[0]?.total || '0')

      // Daily Trend Data (Last 7 Days)
      const trendResult = await connection.query(
        `WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            '1 day'::interval
          )::date AS date
        )
        SELECT 
          to_char(d.date, 'Day') as day_name,
          to_char(d.date, 'Dy') as short_day,
          COALESCE(clicks.count, 0) as clicks,
          COALESCE(conversions.count, 0) as conversions
        FROM dates d
        LEFT JOIN (
          SELECT date(created_at) as date, COUNT(*) as count
          FROM affiliate_clicks
          WHERE affiliate_id = $1
          GROUP BY date(created_at)
        ) clicks ON d.date = clicks.date
        LEFT JOIN (
          SELECT date(first_payment_date) as date, COUNT(*) as count
          FROM affiliate_referrals
          WHERE affiliate_id = $1 AND status = 'converted'
          GROUP BY date(first_payment_date)
        ) conversions ON d.date = conversions.date
        ORDER BY d.date ASC`,
        [affiliateId]
      )

      const trendData = trendResult.rows.map(row => ({
        name: row.short_day.trim(), // Mon, Tue, etc.
        clicks: parseInt(row.clicks),
        conversions: parseInt(row.conversions)
      }))

      return NextResponse.json({
        success: true,
        data: {
          totalCommission,
          pendingCommission,
          paidCommission,
          totalReferrals,
          convertedReferrals,
          conversionRate,
          totalClicks,
          thisMonthCommission,
          trendData, // Real data
        },
      })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}
