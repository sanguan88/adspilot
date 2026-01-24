import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Export report as CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'revenue'
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    if (format === 'csv') {
      return exportCSV(type, startDate, endDate)
    } else if (format === 'json') {
      return exportJSON(type, startDate, endDate)
    } else {
      return NextResponse.json(
        { success: false, error: 'Format tidak didukung. Gunakan csv atau json' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Export report error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat export report' },
      { status: 500 }
    )
  }
}

async function exportCSV(type: string, startDate: string, endDate: string) {
  const result = await withDatabaseConnection(async (connection) => {
    if (type === 'users') {
      const userGrowth = await connection.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users,
          COUNT(CASE WHEN status_user = 'aktif' THEN 1 END) as active_users
        FROM data_user
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]])

      // Convert to CSV
      const headers = ['Date', 'New Users', 'Active Users']
      const rows = userGrowth.rows.map((row: any) => [
        row.date,
        row.new_users,
        row.active_users,
      ])

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => row.join(',')),
      ].join('\n')

      return {
        content: csv,
        filename: `user-growth-report-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      }
    } else if (type === 'usage') {
      // Usage report CSV
      const csv = [
        'Metric,Value',
        'Total Users,0',
        'Total Accounts,0',
        'Total Campaigns,0',
      ].join('\n')

      return {
        content: csv,
        filename: `usage-report-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      }
    } else {
      // Revenue report CSV
      const csv = [
        'Metric,Value',
        'Total Revenue,0',
        'Monthly Recurring Revenue,0',
        'New Subscriptions,0',
        'Cancelled Subscriptions,0',
      ].join('\n')

      return {
        content: csv,
        filename: `revenue-report-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      }
    }
  })

  return new NextResponse(result.content, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  })
}

async function exportJSON(type: string, startDate: string, endDate: string) {
  const result = await withDatabaseConnection(async (connection) => {
    if (type === 'users') {
      const userGrowth = await connection.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users,
          COUNT(CASE WHEN status_user = 'aktif' THEN 1 END) as active_users
        FROM data_user
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]])

      return {
        content: JSON.stringify(userGrowth.rows, null, 2),
        filename: `user-growth-report-${new Date().toISOString().split('T')[0]}.json`,
        contentType: 'application/json',
      }
    } else {
      return {
        content: JSON.stringify({ message: 'Report data' }, null, 2),
        filename: `report-${new Date().toISOString().split('T')[0]}.json`,
        contentType: 'application/json',
      }
    }
  })

  return new NextResponse(result.content, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  })
}

