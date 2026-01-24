import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'

/**
 * GET /api/stores/available
 * Get list of all stores (for dropdown selection)
 */
export async function GET(request: NextRequest) {
    let connection: PoolClient | null = null

    try {
        try {
            // Check permission
            await requirePermission(request, 'canManageUsers')

            const { searchParams } = new URL(request.url)
            const search = searchParams.get('search') || ''
            const excludeUserId = searchParams.get('excludeUserId') // Optional: exclude stores already owned by this user

            connection = await getDatabaseConnection()

            let query = `
      SELECT 
        dt.id_toko,
        dt.nama_toko,
        dt.user_id,
        dt.status_toko,
        u.username as assigned_username,
        u.email as assigned_email
      FROM data_toko dt
      LEFT JOIN data_user u ON dt.user_id = u.user_id
      WHERE 1=1
    `
            const params: any[] = []

            // Search filter
            if (search) {
                params.push(`%${search}%`)
                query += ` AND (dt.nama_toko ILIKE $${params.length} OR dt.id_toko ILIKE $${params.length})`
            }

            // Exclude stores already owned by specific user
            if (excludeUserId) {
                params.push(excludeUserId)
                query += ` AND (dt.user_id IS NULL OR dt.user_id != $${params.length})`
            }

            query += ` ORDER BY dt.nama_toko ASC LIMIT 100`

            const result = await connection.query(query, params)

            const stores = result.rows.map((row: any) => ({
                idToko: row.id_toko,
                namaToko: row.nama_toko,
                userId: row.user_id,
                status: row.status_toko,
                isAssigned: !!row.user_id,
                assignedUsername: row.assigned_username,
                assignedEmail: row.assigned_email,
            }))

            return NextResponse.json({
                success: true,
                data: stores,
                total: stores.length,
            })
        } catch (error: any) {
            if (error.message === 'Authentication required') {
                return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
            }
            if (error.message.startsWith('Permission denied')) {
                return NextResponse.json({ success: false, error: error.message }, { status: 403 })
            }

            console.error('Error fetching available stores:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: error.message || 'Gagal mengambil data stores',
                },
                { status: 500 }
            )
        }
    } catch (error: any) {
        console.error('Outer error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    } finally {
        if (connection) {
            connection.release()
        }
    }
}
