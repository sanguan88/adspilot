import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

// GET - Get subscription analytics
export async function GET(request: NextRequest) {
    try {
        const adminUser = await getAdminUser(request)
        if (!adminUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const connection = await getDatabaseConnection()

        try {
            // 1. Distribution by Plan
            const distributionResult = await connection.query(`
        SELECT 
          sp.name as plan_name,
          sp.plan_id,
          COUNT(s.id) as count
        FROM subscription_plans sp
        LEFT JOIN subscriptions s ON s.plan_id = sp.plan_id AND s.status = 'active'
        GROUP BY sp.plan_id, sp.name
        ORDER BY count DESC
      `)

            // 2. Status Summary
            const statusResult = await connection.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM subscriptions
        GROUP BY status
      `)

            // 3. New vs Expired (Current Month)
            const currentMonthResult = await connection.query(`
        SELECT 
          (SELECT COUNT(*) FROM subscriptions WHERE created_at >= date_trunc('month', now())) as new_subs,
          (SELECT COUNT(*) FROM subscriptions WHERE end_date < now() AND status = 'active') as expiring_soon
      `)

            return NextResponse.json({
                success: true,
                data: {
                    distribution: distributionResult.rows.map(row => ({
                        name: row.plan_name,
                        value: parseInt(row.count),
                        color: '#3b82f6' // Default color since it might be missing in DB
                    })),
                    summary: statusResult.rows.map(row => ({
                        status: row.status,
                        count: parseInt(row.count)
                    })),
                    metrics: {
                        newThisMonth: parseInt(currentMonthResult.rows[0].new_subs),
                        expiringSoon: parseInt(currentMonthResult.rows[0].expiring_soon)
                    }
                }
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Get subscription analytics error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
