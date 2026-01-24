import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Helper function to clean cookies (remove whitespace, newlines)
function cleanCookies(cookies: string): string {
  return cookies.trim().replace(/\s+/g, ' ').replace(/[\r\n\t]/g, '')
}

// Helper function to fetch live data from timegraph API via Sorobot
async function fetchTimegraphLiveData(
  cookies: string,
  startTimestamp: number,
  endTimestamp: number,
  accountName?: string
): Promise<any[]> {
  try {
    // Clean cookies first
    const cleanedCookies = cleanCookies(cookies)
    
    // Convert timestamps to date strings (YYYY-MM-DD)
    const startDate = new Date(startTimestamp * 1000)
    const endDate = new Date(endTimestamp * 1000)
    
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Encode cookie (Base64 + URL encoding)
    const encryptedCookie = encodeURIComponent(Buffer.from(cleanedCookies).toString('base64'))
    
    // Use Sorobot API proxy
    const apiUrl = 'https://adm.sorobot.id/conn/shopee.php'
    
    const requestPayload = {
      endpoint: 'timegraph',
      start_time: formatDate(startDate),
      end_time: formatDate(endDate)
    }
    
    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 seconds
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Auth-Token': encryptedCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
      cache: 'no-store'
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`⚠️ Timegraph API failed (${accountName || 'unknown'}): HTTP ${response.status} ${response.statusText}`)
      return []
    }

    // Parse JSON
    let data: any
    try {
      const text = await response.text()
      if (!text || text.trim().length === 0) {
        console.error(`⚠️ Timegraph API returned empty response (${accountName || 'unknown'})`)
        return []
      }
      data = JSON.parse(text)
    } catch (parseError: any) {
      console.error(`❌ Timegraph API JSON parse error (${accountName || 'unknown'}):`, parseError.message)
      return []
    }
    
    // Parse response structure
    let timegraphData: any = null
    
    // Structure 1: results.timegraph.response.data (base API format)
    if (data.results?.timegraph?.response?.data) {
      timegraphData = data.results.timegraph.response.data
    }
    // Structure 2: data (direct)
    else if (data.data) {
      timegraphData = data.data
    }
    
    if (!timegraphData) {
      console.error(`⚠️ No timegraph data in response. Response keys:`, Object.keys(data))
      return []
    }
    
    // Check if this is live_stream_homepage data
    if (timegraphData.key === 'live_stream_homepage' && timegraphData.report_by_time && Array.isArray(timegraphData.report_by_time)) {
      return timegraphData.report_by_time.map((item: any) => ({
        timestamp: parseInt(item.key) || 0,
        metrics: item.metrics || {}
      }))
    }
    
    return []

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`❌ Timegraph API timeout (${accountName || 'unknown'})`)
    } else {
      console.error(`❌ Timegraph API error${accountName ? ` (${accountName})` : ''}:`, error.message)
    }
    return []
  }
}

// GET /api/live-data - Get live streaming data from timegraph API
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

    const { searchParams } = new URL(request.url)
    const team = searchParams.get('team') || 'all'
    
    // Check if user is admin or superadmin - if so, skip site filter
    const isAdmin = isAdminOrSuperAdmin(user)
    
    // Get current time and calculate start time (last 24 hours)
    const now = new Date()
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Last 24 hours
    const startTimestamp = Math.floor(startTime.getTime() / 1000)
    const endTimestamp = Math.floor(now.getTime() / 1000)
    
    // Get accounts from database - filter by site only if not admin/superadmin
    let accountsQuery = `
      SELECT 
        da.no,
        da.nama_akun,
        da.username,
        da.cookies,
        da.kode_tim,
        da.nama_tim,
        dt.nama_tim as team_name
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.status_akun = 'aktif'
        AND da.cookies IS NOT NULL
        AND da.cookies != ''
        AND da.cookies LIKE '%SPC_F%'
    `
    
    let queryParams: any[] = []
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
    
    // Add team filter if not 'all'
    if (team !== 'all') {
      accountsQuery += ' AND dt.kode_tim = $' + paramIndex
      queryParams.push(team)
      paramIndex++
    }
    
    accountsQuery += ' ORDER BY da.nama_akun'
    
    const accounts = await db.query(accountsQuery, queryParams)
    
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        changed: false,
        rows: [],
        total_gmv: 0,
        formatted_gmv: 'Rp.0'
      })
    }
    
    // Fetch live data from timegraph API for each account
    const liveRows: any[] = []
    
    for (const account of accounts as any[]) {
      try {
        const timegraphData = await fetchTimegraphLiveData(
          account.cookies,
          startTimestamp,
          endTimestamp,
          account.nama_akun
        )
        
        if (timegraphData.length > 0) {
          // Aggregate metrics for this account
          let totalView = 0
          let totalCheckout = 0
          let totalGMV = 0
          let totalOrder = 0
          let latestTimestamp = 0
          
          timegraphData.forEach((item: any) => {
            const metrics = item.metrics || {}
            totalView += parseInt(String(metrics.view || 0))
            totalCheckout += parseInt(String(metrics.checkout || 0))
            totalGMV += parseInt(String(metrics.broad_gmv || 0))
            totalOrder += parseInt(String(metrics.broad_order || 0))
            if (item.timestamp > latestTimestamp) {
              latestTimestamp = item.timestamp
            }
          })
          
          // Normalize GMV (divide by 100)
          const normalizedGMV = Math.round(totalGMV / 100)
          
          // Format start time
          const startDate = new Date(latestTimestamp * 1000)
          const startTimeFormatted = startDate.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          // Calculate duration (seconds)
          const duration = latestTimestamp > 0 ? Math.floor((endTimestamp - latestTimestamp) / 60) * 60 : 0
          
          // Create session ID (use username + timestamp as unique identifier)
          const sessionId = `${account.username}_${latestTimestamp}`
          
          liveRows.push({
            team: account.team_name || account.nama_tim || 'Unknown',
            username: account.username,
            session_id: sessionId,
            start_time: startTimeFormatted,
            title: `Live ${account.username}`,
            comments: 0, // Not available in timegraph
            carts: totalCheckout, // Using checkout as carts
            duration: duration,
            viewers: totalView,
            orders: totalOrder,
            sales: `Rp.${normalizedGMV.toLocaleString('id-ID')}`,
            sales_raw: normalizedGMV,
            status: latestTimestamp > 0 && (endTimestamp - latestTimestamp) < 3600 ? 'LIVE' : 'Berakhir'
          })
        }
        
        // Add delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error: any) {
        console.error(`Error fetching live data for ${account.nama_akun}:`, error.message)
        // Continue to next account
      }
    }
    
    // Calculate total GMV
    const totalGMV = liveRows.reduce((sum, row) => sum + (row.sales_raw || 0), 0)
    
    return NextResponse.json({
      success: true,
      changed: liveRows.length > 0,
      rows: liveRows,
      total_gmv: totalGMV,
      formatted_gmv: `Rp.${totalGMV.toLocaleString('id-ID')}`
    })

  } catch (error: any) {
    console.error('Error fetching live data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        changed: false,
        rows: [],
        total_gmv: 0,
        formatted_gmv: 'Rp.0'
      },
      { status: 500 }
    )
  }
}

