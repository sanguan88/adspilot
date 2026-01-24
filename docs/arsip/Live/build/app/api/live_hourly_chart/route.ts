import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/live_hourly_chart - Get hourly chart data for a specific session
export const GET = async (request: NextRequest) => {
  try {
    // Get user from JWT token (for kode_site filtering)
    let user
    try {
      user = getUserFromToken(request)
    } catch (authError: any) {
      return NextResponse.json(
        {
          error: authError.message || 'Unauthorized',
          realtime: []
        },
        { status: 401 }
      )
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId') || ''
    const username = request.nextUrl.searchParams.get('username') || ''

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId wajib diisi', realtime: [] },
        { status: 400 }
      )
    }

    // Check if user is admin or superadmin - if so, skip site filter
    const isAdmin = isAdminOrSuperAdmin(user)

    // Get cookies from database for this username - filter by site only if not admin/superadmin
    let accountQuery = `
      SELECT da.cookies
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.username = $1
        AND da.cookies IS NOT NULL 
        AND da.cookies != ''
        AND da.status_akun = 'aktif'
    `
    
    const queryParams: any[] = [username]
    
    // Filter by site only if not admin/superadmin
    if (!isAdmin && user.kode_site) {
      accountQuery += ' AND dt.kode_site = $2'
      queryParams.push(user.kode_site)
    }

    accountQuery += ' LIMIT 1'

    const accounts = await db.query(accountQuery, queryParams) as any[]
    
    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada cookies Shopee valid untuk akun ini', realtime: [] },
        { status: 400 }
      )
    }

    const account = accounts[0]
    
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
      return NextResponse.json(
        { error: 'Cookies tidak valid', realtime: [] },
        { status: 400 }
      )
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookiesStr
    }

    // Ambil data session untuk mendapatkan start_time
    const sessionUrl = 'https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/sessionList?page=1&pageSize=100'
    const sessionRes = await fetch(sessionUrl, { 
      headers,
      next: { revalidate: 0 }
    })

    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: 'Gagal mengambil data session', realtime: [] },
        { status: 400 }
      )
    }

    const sessionData = await sessionRes.json()
    const sessions = sessionData?.data?.list || []

    let startTime: number | null = null
    for (const session of sessions) {
      if (String(session.sessionId) === sessionId) {
        startTime = Math.floor((session.startTime || 0) / 1000) // Convert to seconds
        break
      }
    }

    if (!startTime) {
      return NextResponse.json(
        { error: 'Session tidak ditemukan', realtime: [] },
        { status: 400 }
      )
    }

    // End time adalah timestamp saat ini
    const endTime = Math.floor(Date.now() / 1000)

    // Fetch real-time data dari Shopee API (per menit)
    const trendsUrl = `https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/dashboard/trends?startTime=${startTime * 1000}&endTime=${endTime * 1000}&sessionId=${sessionId}&metricTrend=ccu&metricTrend=engagedCcu&metricTrend=entering&metricTrend=addToCart&metricTrend=order&metricTrend=gmv&metricTrend=confirmedGmv&metricTrend=confirmedOrder`
    
    const trendsRes = await fetch(trendsUrl, { 
      headers,
      next: { revalidate: 0 }
    })

    if (!trendsRes.ok) {
      return NextResponse.json(
        { error: 'Gagal fetch Shopee API trends', realtime: [] },
        { status: 400 }
      )
    }

    const trendsData = await trendsRes.json()

    if (trendsData.code !== 0) {
      return NextResponse.json(
        { error: trendsData.msg || 'Gagal fetch Shopee API', realtime: [] },
        { status: 400 }
      )
    }

    const trends = trendsData?.data?.trends || {}
    const engaged = trends.engagedCcu || []
    const addToCart = trends.addToCart || []
    const confirmedOrder = trends.confirmedOrder || []

    // Mapping ke format real-time per menit
    const realtimeData: any[] = []

    // Gabungkan data berdasarkan timestamp
    const allTimestamps = new Set<number>()
    engaged.forEach((item: any) => {
      if (item.time) allTimestamps.add(Math.floor(item.time / 1000))
    })
    addToCart.forEach((item: any) => {
      if (item.time) allTimestamps.add(Math.floor(item.time / 1000))
    })
    confirmedOrder.forEach((item: any) => {
      if (item.time) allTimestamps.add(Math.floor(item.time / 1000))
    })

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

    for (const timestamp of sortedTimestamps) {
      const dt = new Date(timestamp * 1000)
      const minute = dt.getMinutes()
      const hour = dt.getHours()

      // Cari data engagedCcu untuk timestamp ini
      let engagedValue = 0
      for (const item of engaged) {
        if (item.time && Math.floor(item.time / 1000) === timestamp) {
          engagedValue = item.value || 0
          break
        }
      }

      // Cari data addToCart untuk timestamp ini
      let atcValue = 0
      for (const item of addToCart) {
        if (item.time && Math.floor(item.time / 1000) === timestamp) {
          atcValue = item.value || 0
          break
        }
      }

      // Cari data confirmedOrder untuk timestamp ini
      let orderValue = 0
      for (const item of confirmedOrder) {
        if (item.time && Math.floor(item.time / 1000) === timestamp) {
          orderValue = item.value || 0
          break
        }
      }

      realtimeData.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        timestamp: timestamp,
        engagedCcu: engagedValue,
        addToCart: atcValue,
        confirmedOrder: orderValue
      })
    }

    return NextResponse.json({
      sessionId: sessionId,
      startTime: startTime,
      endTime: endTime,
      realtime: realtimeData
    })

  } catch (error: any) {
    console.error('Error in /api/live_hourly_chart:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', realtime: [] },
      { status: 500 }
    )
  }
}

