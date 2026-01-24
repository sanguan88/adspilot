import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get recent activity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const result = await withDatabaseConnection(async (connection) => {
      // Get recent user registrations
      const recentUsers = await connection.query(`
        SELECT 
          username,
          email,
          nama_lengkap,
          role,
          created_at,
          'user_registered' as activity_type
        FROM data_user
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit])

      // Get recent accounts (if available)
      const recentAccounts = await connection.query(`
        SELECT 
          dt.nama_toko,
          dt.email_toko,
          dt.created_at,
          'account_created' as activity_type
        FROM data_toko dt
        ORDER BY dt.created_at DESC
        LIMIT $1
      `, [limit])

      // Combine and sort by date
      const activities = [
        ...recentUsers.rows.map((row: any) => ({
          type: 'user_registered',
          title: `User ${row.username} registered`,
          description: `${row.nama_lengkap} (${row.email})`,
          timestamp: row.created_at,
          metadata: {
            username: row.username,
            role: row.role,
          },
        })),
        ...recentAccounts.rows.map((row: any) => ({
          type: 'account_created',
          title: `Account ${row.nama_toko} created`,
          description: row.email_toko || 'No email',
          timestamp: row.created_at,
          metadata: {
            nama_toko: row.nama_toko,
          },
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

      return activities
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil activity' },
      { status: 500 }
    )
  }
}

