import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'

/**
 * GET - List bank mutations
 */
export async function GET(request: NextRequest) {
    try {
        // Check permission
        await requirePermission(request, 'canManageOrders')

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const status = searchParams.get('status') || ''
        const type = searchParams.get('type') || ''

        const offset = (page - 1) * limit

        const result = await withDatabaseConnection(async (connection) => {
            let query = `
        SELECT 
          id, moota_mutation_id, amount, bank_type, account_number, 
          description, date, type, status, transaction_id, created_at
        FROM bank_mutations
        WHERE 1=1
      `
            const params: any[] = []
            let paramCount = 0

            if (status) {
                paramCount++
                query += ` AND status = $${paramCount}`
                params.push(status)
            }

            if (type) {
                paramCount++
                query += ` AND type = $${paramCount}`
                params.push(type)
            }

            // Get count
            const countQuery = query.replace(/SELECT[\S\S]*?FROM/, 'SELECT COUNT(*) as total FROM')
            const countResult = await connection.query(countQuery, params)
            const total = parseInt(countResult.rows[0]?.total || '0')

            // Add pagination
            paramCount++
            query += ` ORDER BY date DESC LIMIT $${paramCount}`
            params.push(limit)

            paramCount++
            query += ` OFFSET $${paramCount}`
            params.push(offset)

            const mutationsResult = await connection.query(query, params)

            return {
                mutations: mutationsResult.rows,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        })

        return NextResponse.json({
            success: true,
            data: result,
        })
    } catch (error: any) {
        console.error('Get bank mutations error:', error)
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil data mutasi' },
            { status: 500 }
        )
    }
}
