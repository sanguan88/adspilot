import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get order analytics and conversion funnel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const result = await withDatabaseConnection(async (connection) => {
      // Get user registrations (potential orders)
      const registrationsQuery = `
        SELECT COUNT(*) as total
        FROM data_user
        WHERE created_at >= $1 AND created_at <= $2
      `
      const regParams = [
        startDate || '2024-01-01',
        endDate || new Date().toISOString().split('T')[0],
      ]
      const registrations = await connection.query(registrationsQuery, regParams)
      const totalRegistrations = parseInt(registrations.rows[0]?.total || '0')

      // Get active users (assumed as successful orders for now)
      const activeUsersQuery = `
        SELECT COUNT(*) as total
        FROM data_user
        WHERE status_user = 'aktif' 
        AND created_at >= $1 AND created_at <= $2
      `
      const activeUsers = await connection.query(activeUsersQuery, regParams)
      const totalActiveUsers = parseInt(activeUsers.rows[0]?.total || '0')

      // Calculate conversion rates
      const registrationToOrderRate = totalRegistrations > 0 
        ? ((totalActiveUsers / totalRegistrations) * 100).toFixed(2)
        : '0'

      // Get orders by status (mock for now)
      const ordersByStatus = {
        pending: 0,
        processing: 0,
        paid: totalActiveUsers,
        failed: 0,
        cancelled: 0,
      }

      // Get orders by source (mock for now)
      const ordersBySource = {
        direct: totalActiveUsers * 0.7,
        affiliate: totalActiveUsers * 0.2,
        campaign: totalActiveUsers * 0.1,
      }

      // Get revenue (mock for now)
      const totalRevenue = 0
      const averageOrderValue = 0

      return {
        funnel: {
          registrations: totalRegistrations,
          orders: totalActiveUsers,
          paid: totalActiveUsers,
          activated: totalActiveUsers,
          conversionRates: {
            registrationToOrder: parseFloat(registrationToOrderRate),
            orderToPaid: 100, // Mock
            paidToActivated: 100, // Mock
          },
        },
        ordersByStatus,
        ordersBySource,
        revenue: {
          total: totalRevenue,
          average: averageOrderValue,
        },
        period: {
          startDate,
          endDate,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get order analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil analytics' },
      { status: 500 }
    )
  }
}

