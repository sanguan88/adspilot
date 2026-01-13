import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Generate reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'revenue'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const result = await withDatabaseConnection(async (connection) => {
      if (type === 'revenue') {
        // Revenue report
        // TODO: Calculate from subscriptions/invoices when available
        return {
          type: 'revenue',
          period: { startDate, endDate },
          totalRevenue: 0,
          monthlyRecurringRevenue: 0,
          newSubscriptions: 0,
          cancelledSubscriptions: 0,
          data: [],
        }
      } else if (type === 'users') {
        // User growth report
        const userGrowth = await connection.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as new_users
          FROM data_user
          WHERE created_at >= $1 AND created_at <= $2
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `, [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]])

        return {
          type: 'users',
          period: { startDate, endDate },
          totalUsers: 0,
          newUsers: 0,
          activeUsers: 0,
          churnedUsers: 0,
          data: userGrowth.rows,
        }
      } else if (type === 'usage') {
        // Usage report
        return {
          type: 'usage',
          period: { startDate, endDate },
          totalApiCalls: 0,
          totalAccounts: 0,
          totalCampaigns: 0,
          data: [],
        }
      }

      return null
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get report error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat generate report' },
      { status: 500 }
    )
  }
}

