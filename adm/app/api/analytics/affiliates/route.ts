import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

// GET - Get affiliate analytics
export async function GET(request: NextRequest) {
    try {
        const adminUser = await getAdminUser(request)
        if (!adminUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const connection = await getDatabaseConnection()

        try {
            // 1. Total Commissions Stats
            const commissionStats = await connection.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_commissions,
          COUNT(*) as total_records,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_commissions,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_commissions
        FROM affiliate_commissions
      `)

            // 2. Top Affiliates by Earning
            const topAffiliates = await connection.query(`
        SELECT 
          a.name,
          a.affiliate_code,
          COALESCE(SUM(c.amount), 0) as total_earned,
          COUNT(c.commission_id) as conversions
        FROM affiliates a
        LEFT JOIN affiliate_commissions c ON a.affiliate_id = c.affiliate_id
        GROUP BY a.affiliate_id, a.name, a.affiliate_code
        ORDER BY total_earned DESC
        LIMIT 5
      `)

            // 3. Daily Commission Trend
            const dailyTrend = await connection.query(`
        SELECT 
          DATE(created_at) as date,
          SUM(amount) as amount
        FROM affiliate_commissions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `)

            return NextResponse.json({
                success: true,
                data: {
                    stats: {
                        total: parseFloat(commissionStats.rows[0].total_commissions),
                        pending: parseFloat(commissionStats.rows[0].pending_commissions),
                        paid: parseFloat(commissionStats.rows[0].paid_commissions),
                        count: parseInt(commissionStats.rows[0].total_records)
                    },
                    topPerformers: topAffiliates.rows.map(row => ({
                        name: row.name,
                        code: row.affiliate_code,
                        earned: parseFloat(row.total_earned),
                        conversions: parseInt(row.conversions)
                    })),
                    trend: dailyTrend.rows.map(row => ({
                        date: row.date,
                        amount: parseFloat(row.amount)
                    }))
                }
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Get affiliate analytics error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
