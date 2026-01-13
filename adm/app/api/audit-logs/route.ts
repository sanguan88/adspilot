import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

// GET - Get audit logs with filters
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

        // Get filter parameters
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const action = searchParams.get('action') || ''
        const resourceType = searchParams.get('resourceType') || ''
        const userId = searchParams.get('userId') || ''
        const search = searchParams.get('search') || ''
        const dateFrom = searchParams.get('dateFrom') || ''
        const dateTo = searchParams.get('dateTo') || ''

        const offset = (page - 1) * limit

        const connection = await getDatabaseConnection()

        try {
            // Build WHERE clause
            const conditions: string[] = []
            const params: any[] = []
            let paramCount = 0

            if (action) {
                paramCount++
                conditions.push(`action = $${paramCount}`)
                params.push(action)
            }

            if (resourceType) {
                paramCount++
                conditions.push(`resource_type = $${paramCount}`)
                params.push(resourceType)
            }

            if (userId) {
                paramCount++
                conditions.push(`user_id = $${paramCount}`)
                params.push(userId)
            }

            if (search) {
                paramCount++
                conditions.push(`(
          description ILIKE $${paramCount} OR 
          resource_name ILIKE $${paramCount} OR 
          user_email ILIKE $${paramCount}
        )`)
                params.push(`%${search}%`)
            }

            if (dateFrom) {
                paramCount++
                conditions.push(`created_at >= $${paramCount}`)
                params.push(dateFrom)
            }

            if (dateTo) {
                paramCount++
                conditions.push(`created_at <= $${paramCount}`)
                params.push(dateTo)
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`
            const countResult = await connection.query(countQuery, params)
            const total = parseInt(countResult.rows[0].total)

            // Get logs
            paramCount++
            params.push(limit)
            paramCount++
            params.push(offset)

            const logsQuery = `
        SELECT 
          id,
          user_id,
          user_email,
          user_role,
          action,
          resource_type,
          resource_id,
          resource_name,
          description,
          old_values,
          new_values,
          ip_address,
          user_agent,
          status,
          error_message,
          created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount - 1} OFFSET $${paramCount}
      `

            const logsResult = await connection.query(logsQuery, params)

            const logs = logsResult.rows.map((row: any) => ({
                id: row.id,
                userId: row.user_id,
                userEmail: row.user_email,
                userRole: row.user_role,
                action: row.action,
                resourceType: row.resource_type,
                resourceId: row.resource_id,
                resourceName: row.resource_name,
                description: row.description,
                oldValues: row.old_values,
                newValues: row.new_values,
                ipAddress: row.ip_address,
                userAgent: row.user_agent,
                status: row.status,
                errorMessage: row.error_message,
                createdAt: row.created_at,
            }))

            return NextResponse.json({
                success: true,
                data: {
                    logs,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages: Math.ceil(total / limit),
                    },
                },
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Get audit logs error:', error)

        // If auth error, return 401/403
        if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: error.message?.includes('Unauthorized') ? 401 : 403 }
            )
        }

        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil audit logs' },
            { status: 500 }
        )
    }
}
