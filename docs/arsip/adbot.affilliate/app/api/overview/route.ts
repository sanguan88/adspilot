import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    // Authenticate user
    const user = requireAuth(request);
    
    // Get allowed usernames based on role
    const allowedUsernames = await getAllowedUsernames(user);
    
    const { searchParams } = new URL(request.url)
    
    // Parse date range
    const period = searchParams.get('period') || '1d'
    const selectedAccount = searchParams.get('account') || 'all' // Ambil parameter account
    
    const today = new Date()
    
    let startDate: Date
    switch(period) {
      case '1d':
        startDate = new Date(today)
        break
      case '7d':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
    
    const startTime = startDate.toISOString().split('T')[0]
    const endTime = today.toISOString().split('T')[0]

    // Get database connection
    connection = await getDatabaseConnection()

    // 1. Ambil semua username unik dari tabel campaigns untuk dropdown (filtered by role)
    let usernameQuery = `SELECT DISTINCT c.username 
       FROM campaigns c 
       WHERE c.username IS NOT NULL AND c.username != ''`
    let usernameParams: any[] = []
    let paramIndex = 1
    
    // Filter berdasarkan allowed usernames
    if (user.role !== 'superadmin' && allowedUsernames.length > 0) {
      const placeholders = allowedUsernames.map(() => `$${paramIndex++}`).join(',')
      usernameQuery += ` AND c.username IN (${placeholders})`
      usernameParams.push(...allowedUsernames)
    } else if (user.role !== 'superadmin' && allowedUsernames.length === 0) {
      // No allowed usernames, return empty result
      connection.release();
      return NextResponse.json({
        success: true,
        data: {
          accounts: [],
          usernames: [],
          totals: {},
          averages: {},
          recentActivities: []
        }
      });
    }
    
    usernameQuery += ` ORDER BY c.username ASC`
    
    const usernameResult = await connection.query(usernameQuery, usernameParams)
    const usernameRows = usernameResult.rows

    const usernames = (usernameRows || []).map((row: any) => row.username)

    // 2. Hitung total per username (untuk Account Status)
    // Data sudah actual dari database, tidak perlu konversi
    // Hanya menghitung campaign dengan status 'ongoing'
    // Filter berdasarkan selectedAccount jika bukan "all" dan role
    let query = `SELECT 
        c.username,
        COUNT(DISTINCT CASE WHEN c.status = 'ongoing' THEN c.campaign_id END) as campaign_count,
        SUM(CASE WHEN c.status = 'ongoing' THEN c.total_spend ELSE 0 END) as total_spend,
        SUM(CASE WHEN c.status = 'ongoing' THEN c.daily_budget ELSE 0 END) as total_budget,
        SUM(CASE WHEN c.status = 'ongoing' THEN c.impression ELSE 0 END) as total_impressions,
        SUM(CASE WHEN c.status = 'ongoing' THEN c.view ELSE 0 END) as total_clicks,
        SUM(CASE WHEN c.status = 'ongoing' THEN c.broad_order ELSE 0 END) as total_pesanan,
        SUM(CASE WHEN c.status = 'ongoing' THEN c.broad_gmv ELSE 0 END) as total_gmv
       FROM campaigns c
       WHERE c.username IS NOT NULL AND c.username != ''`
    
    const queryParams: any[] = []
    paramIndex = 1
    
    // Filter berdasarkan allowed usernames
    if (user.role !== 'superadmin' && allowedUsernames.length > 0) {
      const placeholders = allowedUsernames.map(() => `$${paramIndex++}`).join(',')
      query += ` AND c.username IN (${placeholders})`
      queryParams.push(...allowedUsernames)
    } else if (user.role !== 'superadmin' && allowedUsernames.length === 0) {
      // No allowed usernames, return empty result
      connection.release();
      return NextResponse.json({
        success: true,
        data: {
          accounts: [],
          usernames: [],
          totals: {},
          averages: {},
          recentActivities: []
        }
      });
    }
    
    // Tambahkan filter username jika account dipilih (bukan "all")
    if (selectedAccount && selectedAccount !== 'all') {
      query += ` AND c.username = $${paramIndex++}`
      queryParams.push(selectedAccount)
    }
    
    query += ` GROUP BY c.username`
    
    const campaignResult = await connection.query(query, queryParams)
    const campaignRows = campaignResult.rows

    // 3a. Jika akun dipilih (bukan "all"), ambil data campaign active untuk ditampilkan di Account Status
    let activeCampaigns: any[] = []
    if (selectedAccount && selectedAccount !== 'all') {
      // Validate that selectedAccount is in allowed usernames
      if (user.role !== 'superadmin' && !allowedUsernames.includes(selectedAccount)) {
        connection.release();
        return NextResponse.json({
          success: false,
          error: 'Access denied to this account'
        }, { status: 403 });
      }
      
      const campaignDetailResult = await connection.query(
        `SELECT 
          c.campaign_id,
          c.title as campaign_name,
          c.status,
          c.total_spend,
          c.daily_budget,
          c.impression,
          c.view,
          c.broad_order,
          c.broad_gmv
         FROM campaigns c
         WHERE c.username = $1 AND c.status = 'ongoing'
         ORDER BY c.campaign_id DESC`,
        [selectedAccount]
      )
      const campaignDetailRows = campaignDetailResult.rows

      activeCampaigns = (campaignDetailRows || []).map((row: any) => {
        const spend = Number(row.total_spend) || 0
        const gmv = Number(row.broad_gmv) || 0
        const roas = spend > 0 && gmv > 0 ? gmv / spend : 0

        return {
          accountName: row.campaign_name || `Campaign ${row.campaign_id}`,
          status: row.status === 'ongoing' ? 'active' : 'paused',
          spend,
          budget: Number(row.daily_budget) || 0,
          impressions: Number(row.impression) || 0,
          clicks: Number(row.view) || 0,
          pesanan: Number(row.broad_order) || 0,
          conversions: gmv,
          roas: Number(roas.toFixed(1)),
          activeCampaigns: 1,
          activeRules: 0
        }
      })
    }

    // 3b. Build account metrics (per username) untuk "All Accounts"
    const accountMetrics = campaignRows.map((row: any) => {
      const spend = Number(row.total_spend) || 0
      const budget = Number(row.total_budget) || 0
      const impressions = Number(row.total_impressions) || 0
      const clicks = Number(row.total_clicks) || 0
      const pesanan = Number(row.total_pesanan) || 0
      const gmv = Number(row.total_gmv) || 0 // Conversions akan menggunakan broad_gmv

      // Calculate ROAS: (GMV / Spend) atau jika tidak ada GMV, gunakan formula alternatif
      const roas = spend > 0 && gmv > 0 ? gmv / spend : 0

      // Status: default active untuk semua account dari campaigns table
      const status: "active" | "paused" | "error" = "active"

      return {
        accountName: row.username,
        status,
        spend,
        budget,
        impressions,
        clicks,
        pesanan, // Menggantikan ctr dengan pesanan (broad_order)
        conversions: gmv, // Conversions menggunakan broad_gmv
        roas: Number(roas.toFixed(1)),
        activeCampaigns: Number(row.campaign_count) || 0,
        activeRules: 0 // Akan diisi jika ada data dari automation_rules
      }
    })

    // 4. Hitung totals untuk summary cards
    const totalMetrics = accountMetrics.reduce(
      (acc, account) => ({
        spend: acc.spend + account.spend,
        budget: acc.budget + account.budget,
        impressions: acc.impressions + account.impressions,
        clicks: acc.clicks + account.clicks,
        pesanan: acc.pesanan + account.pesanan,
        conversions: acc.conversions + account.conversions, // conversions menggunakan broad_gmv
        campaigns: acc.campaigns + account.activeCampaigns,
        rules: 0
      }),
      { spend: 0, budget: 0, impressions: 0, clicks: 0, pesanan: 0, conversions: 0, campaigns: 0, rules: 0 }
    )

    // 5. Hitung untuk Performance Overview
    // Pesanan = total pesanan dari seluruh username (bukan average)
    const totalPesanan = totalMetrics.pesanan

    // Average ROAS = rata-rata ROAS dari semua username
    const avgROAS = accountMetrics.length > 0
      ? accountMetrics.reduce((sum, acc) => sum + acc.roas, 0) / accountMetrics.length
      : 0

    // Active Campaigns = total campaign dari seluruh username (bukan average)
    const totalActiveCampaigns = totalMetrics.campaigns

    // Fetch automation rules count dari tabel automation_rules dengan status = 'active'
    const ruleResult = await connection.query(
      `SELECT COUNT(DISTINCT ar.rule_id) as rule_count
       FROM automation_rules ar
       WHERE ar.status = 'active'`
    )
    const ruleRows = ruleResult.rows

    const totalActiveRules = Number(ruleRows[0]?.rule_count) || 0

    // 6. Calculate Total Spend with PPN 11%
    // Formula: total_spend + (total_spend * 11%)
    const totalSpendWithPPN = totalMetrics.spend + (totalMetrics.spend * 0.11)

    // 7. Fetch Recent Automation Activity dari automation_rules (limit 3 terbaru)
    const activityResult = await connection.query(
      `SELECT 
        ar.rule_id,
        ar.name as rule_name,
        ar.last_run,
        ar.last_check,
        ar.status,
        ar.triggers,
        ar.success_rate,
        ar.error_count,
        ar.actions
       FROM automation_rules ar
       WHERE ar.status = 'active' AND ar.last_run IS NOT NULL
       ORDER BY ar.last_run DESC
       LIMIT 3`
    )
    const activityRows = activityResult.rows

    // Format recent activities
    const recentActivities = (activityRows || []).map((row: any) => {
      const lastRun = row.last_run ? new Date(row.last_run) : null
      const now = new Date()
      
      // Calculate time ago
      let timeAgo = ''
      if (lastRun) {
        const diffMs = now.getTime() - lastRun.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)
        
        if (diffMins < 60) {
          timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
        } else if (diffHours < 24) {
          timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
        } else {
          timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
        }
      }

      // Parse actions untuk mendapatkan action type
      let actionText = 'Rule executed'
      let campaignText = row.rule_name || 'Automation Rule'
      
      try {
        if (row.actions) {
          const actions = JSON.parse(row.actions)
          if (Array.isArray(actions) && actions.length > 0) {
            const firstAction = actions[0]
            if (firstAction.type) {
              switch (firstAction.type) {
                case 'pause_campaign':
                  actionText = 'Campaign paused'
                  break
                case 'increase_budget':
                  actionText = `Budget increased by ${firstAction.value || ''}%`
                  break
                case 'decrease_budget':
                  actionText = `Budget decreased by ${firstAction.value || ''}%`
                  break
                case 'duplicate_campaign':
                  actionText = 'Campaign duplicated'
                  break
                case 'send_notification':
                  actionText = 'Notification sent'
                  break
                default:
                  actionText = 'Rule executed'
              }
            }
          }
        }
      } catch (e) {
        // Jika parsing gagal, gunakan default
      }

      // Determine status based on error_count and success_rate
      let status = 'success'
      if (row.error_count > 0) {
        status = 'warning'
      } else if (row.success_rate < 50) {
        status = 'warning'
      }

      return {
        time: timeAgo || 'Recently',
        action: actionText,
        campaign: campaignText,
        status: status
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: selectedAccount && selectedAccount !== 'all' ? activeCampaigns : accountMetrics,
        usernames, // Untuk dropdown
        isAccountSelected: selectedAccount && selectedAccount !== 'all', // Flag untuk frontend
        totals: {
          spend: totalMetrics.spend,
          spendWithPPN: totalSpendWithPPN,
          budget: totalMetrics.budget,
          impressions: totalMetrics.impressions,
          clicks: totalMetrics.clicks,
          conversions: totalMetrics.conversions, // Conversions menggunakan broad_gmv (total dari semua username)
          pesanan: totalMetrics.pesanan, // Field untuk pesanan (broad_order)
          campaigns: totalMetrics.campaigns,
          rules: totalActiveRules
        },
        averages: {
          pesanan: totalPesanan, // Total pesanan dari seluruh username (bukan average)
          roas: avgROAS,
          activeCampaigns: totalActiveCampaigns // Total campaign dari seluruh username (bukan average)
        },
        recentActivities: recentActivities, // Recent automation activities
        period: {
          startTime,
          endTime
        }
      }
    })

  } catch (error) {
    console.error('Error fetching overview data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch overview data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}
