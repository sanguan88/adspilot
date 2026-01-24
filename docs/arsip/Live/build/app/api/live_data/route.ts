import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/live_data - Get live stream data from Shopee API
export const GET = async (request: NextRequest) => {
  try {
    // Get user from JWT token (for kode_site filtering)
    let user
    try {
      user = getUserFromToken(request)
    } catch (authError: any) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized'
        },
        { status: 401 }
      )
    }

    // Support multiple teams - get all team parameters
    const selectedTeams = request.nextUrl.searchParams.getAll('team')
    const allData: any[] = []
    let totalGmv = 0

    // Check if user is admin or superadmin - if so, skip site filter
    const isAdmin = isAdminOrSuperAdmin(user)

    // Build query - filter by site only if not admin/superadmin
    let accountsQuery = `
      SELECT DISTINCT ON (da.username)
        da.username,
        da.cookies,
        da.kode_tim,
        dt.nama_tim
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.cookies IS NOT NULL 
        AND da.cookies != ''
        AND da.cookies LIKE '%SPC_F%'
        AND da.cookies LIKE '%SPC_T%'
        AND da.status_akun = 'aktif'
    `
    
    const queryParams: any[] = []
    let paramIndex = 1
    
    // Filter by site only if not admin/superadmin
    if (!isAdmin && user.kode_site) {
      accountsQuery += ' AND dt.kode_site = $' + paramIndex
      queryParams.push(user.kode_site)
      paramIndex++
    } else if (!isAdmin && !user.kode_site) {
      // Non-admin without kode_site - return empty
      return NextResponse.json({
        success: true,
        changed: false,
        rows: [],
        total_gmv: 0,
        formatted_gmv: 'Rp.0'
      })
    }
    
    // Filter by team names if specified (support multiple teams)
    if (selectedTeams && selectedTeams.length > 0 && !selectedTeams.includes('all')) {
      // Use IN clause for multiple teams
      const placeholders = selectedTeams.map((_, index) => `$${paramIndex + index}`).join(', ')
      accountsQuery += ` AND dt.nama_tim IN (${placeholders})`
      queryParams.push(...selectedTeams)
      paramIndex += selectedTeams.length
    }
    
    // Order by username and no DESC untuk DISTINCT ON (ambil yang terbaru)
    accountsQuery += ' ORDER BY da.username, da.no DESC'
    
    let accounts: any[] = []
    try {
      accounts = await db.query(accountsQuery, queryParams) as any[]
    } catch (dbError: any) {
      console.error('Database query error:', dbError.message || dbError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database query failed: ' + (dbError.message || 'Unknown error'),
          rows: [],
          total_gmv: 0,
          formatted_gmv: 'Rp.0'
        },
        { status: 500 }
      )
    }

    // Jika tidak ada akun yang ditemukan, return empty response
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        changed: false,
        rows: [],
        total_gmv: 0,
        formatted_gmv: 'Rp.0'
      })
    }

    // Process each account
    for (const account of accounts) {
      const teamName = account.nama_tim || 'N/A'

      // Parse cookies - bisa string atau JSON
      let cookiesStr = ''
      if (typeof account.cookies === 'string') {
        cookiesStr = account.cookies
      } else if (Array.isArray(account.cookies)) {
        cookiesStr = account.cookies.map((c: any) => `${c.name || c.name}=${c.value || c.value}`).join('; ')
      } else if (account.cookies && typeof account.cookies === 'object') {
        // Try to parse as JSON string first
        try {
          const parsed = typeof account.cookies === 'string' ? JSON.parse(account.cookies) : account.cookies
          if (Array.isArray(parsed)) {
            cookiesStr = parsed.map((c: any) => `${c.name || c.name}=${c.value || c.value}`).join('; ')
          }
        } catch {
          // If parsing fails, use as is
          cookiesStr = String(account.cookies)
        }
      }

      if (!cookiesStr || cookiesStr.trim() === '') {
        continue
      }

      try {
        // Validate cookies format - harus ada SPC_F dan SPC_T untuk Shopee
        if (!cookiesStr.includes('SPC_F') && !cookiesStr.includes('SPC_T')) {
          console.log(`[${account.username}] Cookies tidak valid (missing SPC_F/SPC_T), skip`)
          continue
        }

        // Call Shopee Creator API untuk mendapatkan session list
        const headers = {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': cookiesStr,
          'Accept': 'application/json',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
        }

        const url = 'https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/sessionList?page=1&pageSize=100'
        const response = await fetch(url, { 
          headers,
          next: { revalidate: 0 }, // Disable caching
          cache: 'no-store'
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          console.error(`[${account.username}] Failed to fetch session list: ${response.status} ${response.statusText}`, errorText.substring(0, 200))
          continue
        }

        const data = await response.json()
        
        // Check if response is valid
        if (data.code !== undefined && data.code !== 0) {
          // Only log API errors in development mode to reduce log spam
          if (process.env.NODE_ENV === 'development') {
            console.log(`[${account.username}] Shopee API error: ${data.msg || 'Unknown error'} (code: ${data.code})`)
          }
          continue
        }

        const liveSessions = data?.data?.list || []

        // Don't log missing sessions - this is normal when accounts are not live
        if (!liveSessions || liveSessions.length === 0) {
          continue
        }

        // Ambil session terbaru (index 0)
        const session = liveSessions[0]
        const avgViewDuration = Math.floor((session.avgViewsDuration || 0) / 1000)
        const placedSales = parseInt(session.placedSales || 0)
        const status = String(session.status) === '1' ? 'LIVE' : 'Berakhir'
        
        // Format start time
        const startTime = session.startTime 
          ? new Date(session.startTime).toLocaleString('id-ID', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          : 'N/A'

        allData.push({
          team: teamName,
          username: account.username,
          session_id: String(session.sessionId || 0),
          start_time: startTime,
          title: session.title || 'No Title',
          comments: session.comments || 0,
          carts: session.atc || 0,
          duration: avgViewDuration,
          viewers: session.viewers || 0,
          orders: session.placedOrders || 0,
          sales: `Rp.${placedSales.toLocaleString('id-ID')}`,
          sales_raw: placedSales,
          status: status
        })

        totalGmv += placedSales

      } catch (error: any) {
        // Only log critical errors in production, all errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`[${account.username}] Error fetching live data:`, error.message)
        } else {
          // In production, only log network/API errors, not missing sessions
          if (error.message && !error.message.includes('No live sessions') && !error.message.includes('fetch')) {
            console.error(`[${account.username}] Error:`, error.message)
          }
        }
        continue
      }
    }

    // Remove duplicates based on username + session_id combination
    const uniqueDataMap = new Map<string, any>()
    for (const item of allData) {
      const uniqueKey = `${item.username}-${item.session_id}`
      // Keep the one with higher sales_raw if duplicate exists
      if (!uniqueDataMap.has(uniqueKey) || (item.sales_raw || 0) > (uniqueDataMap.get(uniqueKey)?.sales_raw || 0)) {
        uniqueDataMap.set(uniqueKey, item)
      }
    }
    
    // Convert map back to array and sort by sales_raw descending
    const uniqueData = Array.from(uniqueDataMap.values())
    uniqueData.sort((a, b) => (b.sales_raw || 0) - (a.sales_raw || 0))
    
    // Recalculate total GMV from unique data
    const uniqueTotalGmv = uniqueData.reduce((sum, item) => sum + (item.sales_raw || 0), 0)

    return NextResponse.json({
      success: true,
      changed: true, // Always return true for now (can implement signature checking later)
      rows: uniqueData,
      total_gmv: uniqueTotalGmv,
      formatted_gmv: `Rp.${uniqueTotalGmv.toLocaleString('id-ID')}`
    })

  } catch (error: any) {
    console.error('Error in /api/live_data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        rows: [],
        total_gmv: 0,
        formatted_gmv: 'Rp.0'
      },
      { status: 500 }
    )
  }
}

