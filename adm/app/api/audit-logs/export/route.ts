import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

export async function GET(request: NextRequest) {
    try {
        const adminUser = await getAdminUser(request)
        if (!adminUser) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const formatParam = searchParams.get('format') || 'csv'
        const action = searchParams.get('action') || ''
        const resourceType = searchParams.get('resourceType') || ''
        const userId = searchParams.get('userId') || ''
        const search = searchParams.get('search') || ''
        const dateFrom = searchParams.get('dateFrom') || ''
        const dateTo = searchParams.get('dateTo') || ''

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

            const logsQuery = `
          SELECT 
            created_at,
            user_email,
            user_role,
            action,
            resource_type,
            resource_name,
            description,
            status,
            ip_address,
            user_agent
          FROM audit_logs
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT 5000
        `

            const logsResult = await connection.query(logsQuery, params)
            const logs = logsResult.rows

            if (formatParam === 'json') {
                return NextResponse.json({
                    success: true,
                    data: logs
                })
            }

            // Default to CSV
            const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource Type', 'Resource Name', 'Description', 'Status', 'IP', 'User Agent']
            const csvRows = [
                headers.join(','),
                ...logs.map((row: any) => {
                    return [
                        `"${new Date(row.created_at).toISOString()}"`,
                        `"${row.user_email || 'System'}"`,
                        `"${row.user_role || '-'}"`,
                        `"${row.action}"`,
                        `"${row.resource_type}"`,
                        `"${row.resource_name || '-'}"`,
                        `"${(row.description || '').replace(/"/g, '""')}"`,
                        `"${row.status}"`,
                        `"${row.ip_address || '-'}"`,
                        `"${(row.user_agent || '-').replace(/"/g, '""')}"`
                    ].join(',')
                })
            ]

            const csvContent = csvRows.join('\n')

            return new NextResponse(csvContent, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
                }
            })

        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Export audit logs error:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to export audit logs' },
            { status: 500 }
        )
    }
}
