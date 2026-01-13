import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

// GET - Get revenue analytics
export async function GET(request: NextRequest) {
    try {
        // Check admin authentication
        const adminUser = await getAdminUser(request)

        if (!adminUser) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || '30' // days

        const connection = await getDatabaseConnection()

        try {
            // Get total revenue
            const totalRevenueResult = await connection.query(`
        SELECT 
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as total_revenue,
          COUNT(*) as total_transactions
        FROM transactions
        WHERE (payment_status = 'paid' OR payment_status = 'success' OR payment_status = 'settlement')
          AND created_at >= NOW() - INTERVAL '${period} days'
      `)

            // Get revenue by plan
            const revenueByPlanResult = await connection.query(`
        SELECT 
          sp.name as plan_name,
          COALESCE(SUM(CAST(t.total_amount AS DECIMAL)), 0) as revenue,
          COUNT(t.transaction_id) as transactions
        FROM transactions t
        JOIN subscription_plans sp ON t.plan_id = sp.plan_id
        WHERE (t.payment_status = 'paid' OR t.payment_status = 'success' OR t.payment_status = 'settlement')
          AND t.created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY sp.name
        ORDER BY revenue DESC
      `)

            // Get daily revenue trend
            const dailyTrendResult = await connection.query(`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as revenue,
          COUNT(*) as transactions
        FROM transactions
        WHERE (payment_status = 'paid' OR payment_status = 'success' OR payment_status = 'settlement')
          AND created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `)

            // Calculate growth rate (compare with previous period)
            const previousPeriodResult = await connection.query(`
        SELECT 
          COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as previous_revenue
        FROM transactions
        WHERE (payment_status = 'paid' OR payment_status = 'success' OR payment_status = 'settlement')
          AND created_at >= NOW() - INTERVAL '${parseInt(period) * 2} days'
          AND created_at < NOW() - INTERVAL '${period} days'
      `)

            const currentRevenue = parseFloat(totalRevenueResult.rows[0].total_revenue)
            const previousRevenue = parseFloat(previousPeriodResult.rows[0].previous_revenue)
            const growthRate = previousRevenue > 0
                ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
                : 0

            // Calculate MRR (Monthly Recurring Revenue)
            const mrrResult = await connection.query(`
        SELECT 
          COALESCE(SUM(CAST(sp.price AS DECIMAL)), 0) as mrr
        FROM subscriptions s
        JOIN subscription_plans sp ON s.plan_id = sp.plan_id
        WHERE s.status = 'active'
          AND sp.billing_cycle = 'monthly'
      `)

            return NextResponse.json({
                success: true,
                data: {
                    totalRevenue: currentRevenue,
                    totalTransactions: parseInt(totalRevenueResult.rows[0].total_transactions),
                    growthRate: parseFloat(growthRate.toFixed(2)),
                    mrr: parseFloat(mrrResult.rows[0].mrr),
                    arr: parseFloat(mrrResult.rows[0].mrr) * 12,
                    revenueByPlan: revenueByPlanResult.rows.map((row: any) => ({
                        planName: row.plan_name,
                        revenue: parseFloat(row.revenue),
                        transactions: parseInt(row.transactions),
                    })),
                    dailyTrend: dailyTrendResult.rows.map((row: any) => ({
                        date: row.date,
                        revenue: parseFloat(row.revenue),
                        transactions: parseInt(row.transactions),
                    })),
                },
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Get revenue analytics error:', error)

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { success: false, error: 'Failed to fetch revenue analytics' },
            { status: 500 }
        )
    }
}
