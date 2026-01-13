import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

// GET - Get user growth analytics
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
            // Get total users
            const totalUsersResult = await connection.query(`
        SELECT COUNT(*) as total_users
        FROM data_user
        WHERE status_user = 'aktif'
      `)

            // Get new users in period
            const newUsersResult = await connection.query(`
        SELECT COUNT(*) as new_users
        FROM data_user
        WHERE created_at >= NOW() - INTERVAL '${period} days'
      `)

            // Get churned users (deactivated)
            const churnedUsersResult = await connection.query(`
        SELECT COUNT(*) as churned_users
        FROM data_user
        WHERE status_user = 'nonaktif'
          AND update_at >= NOW() - INTERVAL '${period} days'
      `)

            // Get daily user growth
            const dailyGrowthResult = await connection.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM data_user
        WHERE created_at >= NOW() - INTERVAL '${period} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `)

            // Get users by role
            const usersByRoleResult = await connection.query(`
        SELECT 
          role,
          COUNT(*) as count
        FROM data_user
        WHERE status_user = 'aktif'
        GROUP BY role
        ORDER BY count DESC
      `)

            // Calculate growth rate
            const previousPeriodResult = await connection.query(`
        SELECT COUNT(*) as previous_users
        FROM data_user
        WHERE created_at >= NOW() - INTERVAL '${parseInt(period) * 2} days'
          AND created_at < NOW() - INTERVAL '${period} days'
      `)

            const newUsers = parseInt(newUsersResult.rows[0].new_users)
            const previousUsers = parseInt(previousPeriodResult.rows[0].previous_users)
            const growthRate = previousUsers > 0
                ? ((newUsers - previousUsers) / previousUsers) * 100
                : 0

            // Calculate churn rate
            const totalUsers = parseInt(totalUsersResult.rows[0].total_users)
            const churnedUsers = parseInt(churnedUsersResult.rows[0].churned_users)
            const churnRate = totalUsers > 0 ? (churnedUsers / totalUsers) * 100 : 0

            return NextResponse.json({
                success: true,
                data: {
                    totalUsers,
                    newUsers,
                    churnedUsers,
                    growthRate: parseFloat(growthRate.toFixed(2)),
                    churnRate: parseFloat(churnRate.toFixed(2)),
                    retentionRate: parseFloat((100 - churnRate).toFixed(2)),
                    dailyGrowth: dailyGrowthResult.rows.map((row: any) => ({
                        date: row.date,
                        newUsers: parseInt(row.new_users),
                    })),
                    usersByRole: usersByRoleResult.rows.map((row: any) => ({
                        role: row.role,
                        count: parseInt(row.count),
                    })),
                },
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Get user analytics error:', error)

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { success: false, error: 'Failed to fetch user analytics' },
            { status: 500 }
        )
    }
}
