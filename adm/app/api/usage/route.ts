import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Get usage analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const result = await withDatabaseConnection(async (connection) => {
      // Get user statistics
      const usersStats = await connection.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status_user = 'aktif' THEN 1 END) as active_users,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_30d
        FROM data_user
      `)

      // Get accounts statistics
      const accountsStats = await connection.query(`
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(DISTINCT user_id) as users_with_accounts
        FROM data_toko
      `)

      // Get campaigns statistics
      const campaignsStats = await connection.query(`
        SELECT 
          COUNT(*) as total_campaigns,
          COUNT(DISTINCT id_toko) as accounts_with_campaigns
        FROM data_produk
      `)

      // Get automation rules statistics
      const rulesStats = await connection.query(`
        SELECT 
          COUNT(*) as total_rules,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rules
        FROM data_rules
      `)

      // Get API calls (mock for now)
      const apiCalls = {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      }

      // Get database size (approximate)
      const dbSize = await connection.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size
      `)

      return {
        users: {
          total: parseInt(usersStats.rows[0]?.total_users || '0'),
          active: parseInt(usersStats.rows[0]?.active_users || '0'),
          active30d: parseInt(usersStats.rows[0]?.active_30d || '0'),
        },
        accounts: {
          total: parseInt(accountsStats.rows[0]?.total_accounts || '0'),
          usersWithAccounts: parseInt(accountsStats.rows[0]?.users_with_accounts || '0'),
        },
        campaigns: {
          total: parseInt(campaignsStats.rows[0]?.total_campaigns || '0'),
          accountsWithCampaigns: parseInt(campaignsStats.rows[0]?.accounts_with_campaigns || '0'),
        },
        rules: {
          total: parseInt(rulesStats.rows[0]?.total_rules || '0'),
          active: parseInt(rulesStats.rows[0]?.active_rules || '0'),
        },
        apiCalls,
        database: {
          size: dbSize.rows[0]?.size || '0 MB',
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get usage error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data usage' },
      { status: 500 }
    )
  }
}

