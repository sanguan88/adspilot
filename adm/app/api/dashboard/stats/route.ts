import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

// GET - Get dashboard statistics
export async function GET() {
  try {
    const result = await withDatabaseConnection(async (connection) => {
      // Get user statistics
      const usersStats = await connection.query(`
        SELECT 
          COUNT(*)::INT as total_users,
          COUNT(CASE WHEN status_user = 'aktif' THEN 1 END)::INT as active_users,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END)::INT as active_users_30d,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::INT as new_users_30d
        FROM data_user
      `)

      // Get accounts statistics
      const accountsStats = await connection.query(`
        SELECT 
          COUNT(*)::INT as total_accounts,
          COUNT(DISTINCT user_id)::INT as users_with_accounts
        FROM data_toko
      `)

      // Get campaigns statistics
      const campaignsStats = await connection.query(`
        SELECT 
          COUNT(*)::INT as total_campaigns,
          COUNT(DISTINCT id_toko)::INT as accounts_with_campaigns
        FROM data_produk
      `)

      // Get real revenue statistics
      const revenueStats = await connection.query(`
        SELECT 
          COALESCE(SUM(total_amount), 0)::NUMERIC as total_revenue,
          COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN total_amount ELSE 0 END), 0)::NUMERIC as today_revenue,
          COUNT(*)::INT as total_orders,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END)::INT as pending_orders,
          COUNT(CASE WHEN payment_status IN ('paid', 'success', 'settlement') THEN 1 END)::INT as paid_orders
        FROM transactions
      `)

      // Get real subscription statistics
      const subStats = await connection.query(`
        SELECT 
          COUNT(*)::INT as active_subscriptions,
          COALESCE(SUM(total_amount), 0)::NUMERIC as mrr
        FROM subscriptions 
        WHERE status = 'active'
      `)

      // Get real affiliate statistics (checking table existence first)
      let totalAffiliates = 0
      try {
        const affRes = await connection.query('SELECT COUNT(*)::INT FROM affiliates')
        totalAffiliates = affRes.rows[0].count
      } catch (e) {
        // Table might not exist yet
      }

      // Get licenses statistics (checking table existence first)
      let licenseStats = { total: 0, active: 0, expired: 0 }
      try {
        const licRes = await connection.query(`
           SELECT 
             COUNT(*)::INT as total,
             COUNT(CASE WHEN status = 'active' THEN 1 END)::INT as active,
             COUNT(CASE WHEN status = 'expired' THEN 1 END)::INT as expired
           FROM licenses
        `)
        licenseStats = licRes.rows[0]
      } catch (e) {
        // Table might not exist yet
      }

      // Get plans statistics (from subscription_plans table)
      let planStats = { total: 0, active: 0 }
      try {
        const pRes = await connection.query('SELECT COUNT(*)::INT as total, COUNT(CASE WHEN is_active = true THEN 1 END)::INT as active FROM subscription_plans')
        planStats = pRes.rows[0]
      } catch (e) {
        // Fallback to static if table not found
        try {
          const { SUBSCRIPTION_PLANS } = await import('@/app/api/subscriptions/plans/storage')
          planStats.total = SUBSCRIPTION_PLANS.length
          planStats.active = SUBSCRIPTION_PLANS.filter(p => p.isActive).length
        } catch (inner) { }
      }

      const userData = usersStats.rows[0] || {}
      const accountData = accountsStats.rows[0] || {}
      const campaignData = campaignsStats.rows[0] || {}
      const revData = revenueStats.rows[0] || {}
      const sData = subStats.rows[0] || {}

      return {
        totalUsers: userData.total_users,
        activeUsers: userData.active_users,
        activeUsers30d: userData.active_users_30d,
        newUsers30d: userData.new_users_30d,
        activeSubscriptions: sData.active_subscriptions,
        totalAffiliates,
        monthlyRevenue: parseFloat(sData.mrr),
        totalRevenue: parseFloat(revData.total_revenue),
        todayRevenue: parseFloat(revData.today_revenue),
        conversionRate: userData.total_users > 0 ? ((sData.active_subscriptions / userData.total_users) * 100).toFixed(1) : 0,
        totalAccounts: accountData.total_accounts,
        usersWithAccounts: accountData.users_with_accounts,
        totalCampaigns: campaignData.total_campaigns,
        accountsWithCampaigns: campaignData.accounts_with_campaigns,
        totalOrders: revData.total_orders,
        pendingOrders: revData.pending_orders,
        paidOrders: revData.paid_orders,
        totalLicenses: licenseStats.total,
        activeLicenses: licenseStats.active,
        expiredLicenses: licenseStats.expired,
        totalPlans: planStats.total,
        activePlans: planStats.active,
      }
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil dashboard stats' },
      { status: 500 }
    )
  }
}

