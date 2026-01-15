import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'

/**
 * Get user's addon history
 * GET /api/addons/list?status=active
 */
export async function GET(request: NextRequest) {
    let connection = null

    try {
        // 1. Auth check
        const user = await requireActiveStatus(request)
        const userId = user.userId || (user as any).user_id

        // 2. Get query params
        const searchParams = request.nextUrl.searchParams
        const statusFilter = searchParams.get('status') // active, expired, cancelled, pending, all

        connection = await getDatabaseConnection()

        // 3. Build query based on filter
        let query = `
      SELECT 
        id, addon_type, quantity,
        price_per_unit, total_price,
        start_date, end_date, remaining_days,
        status, transaction_id,
        created_at, updated_at,
        expired_at, cancelled_at, cancelled_by, cancellation_reason
      FROM account_addons
      WHERE user_id = $1
    `

        const params: any[] = [userId]

        if (statusFilter && statusFilter !== 'all') {
            query += ` AND status = $2`
            params.push(statusFilter)
        }

        query += ` ORDER BY created_at DESC`

        // 4. Execute query
        const result = await connection.query(query, params)

        // 5. Format response
        const addons = result.rows.map((row: any) => ({
            id: row.id,
            type: row.addon_type,
            quantity: row.quantity,
            pricing: {
                pricePerUnit: parseFloat(row.price_per_unit),
                totalPrice: parseFloat(row.total_price),
            },
            period: {
                startDate: row.start_date,
                endDate: row.end_date,
                remainingDays: row.remaining_days,
            },
            status: row.status,
            transactionId: row.transaction_id,
            timestamps: {
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                expiredAt: row.expired_at,
                cancelledAt: row.cancelled_at,
            },
            cancellation: row.cancelled_by ? {
                by: row.cancelled_by,
                reason: row.cancellation_reason,
            } : null,
        }))

        // 6. Get summary stats
        const statsResult = await connection.query(
            `SELECT 
        status,
        COUNT(*) as count,
        SUM(total_price) as total_spent
       FROM account_addons
       WHERE user_id = $1
       GROUP BY status`,
            [userId]
        )

        const stats = statsResult.rows.reduce((acc: any, row: any) => {
            acc[row.status] = {
                count: parseInt(row.count),
                totalSpent: parseFloat(row.total_spent),
            }
            return acc
        }, {})

        connection.release()

        return NextResponse.json({
            success: true,
            data: {
                addons,
                stats,
                total: addons.length,
            },
        })
    } catch (error: any) {
        if (connection) {
            connection.release()
        }
        console.error('List addons error:', error)
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil data addon' },
            { status: 500 }
        )
    }
}
