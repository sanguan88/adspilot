import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getUserFromToken, isAdminOrSuperAdmin } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST /api/accounts/performance - Get account performance data (GMV, komisi, etc.)
// Sekarang mengambil data langsung dari database, tidak perlu dari localStorage
export const POST = async (request: NextRequest) => {
  try {
    // Get user from JWT token (for kode_site filtering)
    let user
    try {
      user = getUserFromToken(request)
    } catch (authError: any) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized',
          accounts: [],
          total_komisi: 0
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { teamFilter } = body

    // Check if user is admin or superadmin - if so, skip site filter
    const isAdmin = isAdminOrSuperAdmin(user)

    // Ambil semua akun aktif dengan cookies valid - filter by site only if not admin/superadmin
    let accountsQuery = `
      SELECT DISTINCT ON (da.username)
        da.no,
        da.username,
        da.cookies,
        da.kode_tim,
        dt.nama_tim,
        dt.logo_tim
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
        accounts: [],
        total_komisi: 0
      })
    }
    
    // Filter by team name if specified
    if (teamFilter && teamFilter !== 'all') {
      accountsQuery += ' AND dt.nama_tim = $' + paramIndex
      queryParams.push(teamFilter)
      paramIndex++
    }
    
    // Order by username and no DESC untuk DISTINCT ON (ambil yang terbaru)
    accountsQuery += ' ORDER BY da.username, da.no DESC'
    
    const dbAccounts = await db.query(accountsQuery, queryParams) as any[]
    
    // Transform ke format yang diharapkan
    const accounts = dbAccounts.map((acc: any) => {
      // Convert bytea logo_tim to base64 if exists
      let logoBase64 = null
      if (acc.logo_tim) {
        try {
          // PostgreSQL bytea is already a Buffer in Node.js
          if (Buffer.isBuffer(acc.logo_tim)) {
            logoBase64 = `data:image/png;base64,${acc.logo_tim.toString('base64')}`
          } else if (typeof acc.logo_tim === 'string') {
            // If it's already a string, check if it's base64 or hex
            if (acc.logo_tim.startsWith('\\x')) {
              // PostgreSQL hex format
              const hexString = acc.logo_tim.substring(2)
              const buffer = Buffer.from(hexString, 'hex')
              logoBase64 = `data:image/png;base64,${buffer.toString('base64')}`
            } else {
              logoBase64 = acc.logo_tim
            }
          }
        } catch (error) {
          console.error('Error converting logo_tim:', error)
          logoBase64 = null
        }
      }
      
      return {
        username: acc.username,
        cookies: acc.cookies,
        nama_tim: acc.nama_tim || 'N/A',
        team: acc.nama_tim || 'N/A',
        kode_tim: acc.kode_tim,
        team_logo: logoBase64
      }
    })

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        accounts: [],
        total_komisi: 0
      })
    }

    // Fetch performance data from Shopee API for each account
    const dashboardData: any[] = []
    
    // Calculate timestamps (start of month to today or yesterday)
    const now = new Date()
    const wibOffset = 7 * 60 * 60 * 1000 // WIB is UTC+7
    const nowWIB = new Date(now.getTime() + wibOffset)
    const startOfMonth = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), 1, 0, 0, 0, 0)
    const startTimestamp = Math.floor(startOfMonth.getTime() / 1000)
    
    // Helper function to get end timestamp (try yesterday first, then today)
    const getEndTimestamp = (daysAgo: number) => {
      const targetDate = new Date(nowWIB)
      targetDate.setDate(targetDate.getDate() - daysAgo)
      targetDate.setHours(23, 59, 59, 999)
      return Math.floor(targetDate.getTime() / 1000)
    }
    
    // Helper function to safely parse integer
    const safeInt = (value: any): number => {
      if (value === null || value === undefined) return 0
      const parsed = parseInt(String(value))
      return isNaN(parsed) ? 0 : parsed
    }
    
    // Helper function to determine account quality based on commission
    const getKualitas = (komisi: number, hariIni: number): string => {
      const tier: { [key: string]: number } = {
        "Warrior": 25000 * hariIni,
        "Elite": 50000 * hariIni,
        "Master": 100000 * hariIni,
        "Grand Master": 150000 * hariIni,
        "Epic": 200000 * hariIni,
        "Legend": 250000 * hariIni,
        "Mythic": 300000 * hariIni,
      }
      
      if (komisi < tier["Warrior"]) return "Stadium Akut"
      if (komisi < tier["Elite"]) return "Patah Hati"
      if (komisi < tier["Master"]) return "Butuh Kasih Sayang"
      if (komisi < tier["Grand Master"]) return "Bucin"
      if (komisi < tier["Epic"]) return "Sehati"
      if (komisi < tier["Legend"]) return "Fall In Love"
      if (komisi < tier["Mythic"]) return "Sakinah"
      return "Sakinah Mawahdah Warohmah"
    }
    
    console.log(`📊 /api/accounts/performance: Processing ${accounts.length} accounts`)
    
    for (const account of accounts) {
      const cookies = typeof account.cookies === 'string' ? account.cookies : ''
      const username = account.username || ''
      const team = account.nama_tim || account.team || 'N/A'
      let data: any = null
      let endTimestamp = 0
      
      // Try to fetch data from yesterday first, then today
      for (const attemptDay of [1, 2]) {
        endTimestamp = getEndTimestamp(attemptDay)
        const urlAffiliate = `https://affiliate.shopee.co.id/api/v3/dashboard/detail?start_time=${startTimestamp}&end_time=${endTimestamp}`
        
        try {
          // Call Shopee API directly (server-side, no CORS issues)
          const headers = {
            "Cookie": cookies,
            "User-Agent": "ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1"
          }
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 seconds timeout
          
          const apiResponse = await fetch(urlAffiliate, {
            method: 'GET',
            headers: headers,
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (apiResponse.ok) {
            const responseJson = await apiResponse.json()
            console.log(`🔍 [${username}] Raw API response structure (day ${attemptDay}):`, JSON.stringify(responseJson).substring(0, 1000))
            
            // Check if response has code field (Shopee API format)
            if (responseJson && typeof responseJson === 'object') {
              // Check for error code
              if (responseJson.code !== undefined && responseJson.code !== 0) {
                console.warn(`⚠️ [${username}] API returned error code ${responseJson.code}: ${responseJson.msg || 'Unknown error'}`)
                continue // Try next day
              }
              
              // Get data from response
              const responseData = responseJson.data
              
              if (!responseData) {
                console.warn(`⚠️ [${username}] API response has no data field. Response keys:`, Object.keys(responseJson))
                continue // Try next day
              }
              
              // Check if data has direct fields (clicks_sum, etc.) or if it's in a list
              if (responseData.list && Array.isArray(responseData.list)) {
                // Data is in list format, need to aggregate
                console.log(`📋 [${username}] Data is in list format with ${responseData.list.length} items`)
                let totalClicks = 0
                let totalOrders = 0
                let totalCommission = 0
                let totalItemsSold = 0
                let totalGmv = 0
                
                for (const item of responseData.list) {
                  totalClicks += safeInt(item.clicks_sum || item.clicks || 0)
                  totalOrders += safeInt(item.cv_by_order_sum || item.cv_by_order || 0)
                  totalCommission += safeInt(item.est_commission_sum || item.est_commission || 0)
                  totalItemsSold += safeInt(item.item_sold_sum || item.item_sold || 0)
                  totalGmv += safeInt(item.order_amount_sum || item.order_amount || 0)
                }
                
                // Create aggregated data object
                data = {
                  clicks_sum: totalClicks,
                  cv_by_order_sum: totalOrders,
                  est_commission_sum: totalCommission,
                  item_sold_sum: totalItemsSold,
                  order_amount_sum: totalGmv
                }
                
                console.log(`✅ [${username}] Successfully aggregated data from list:`, {
                  clicks_sum: data.clicks_sum,
                  cv_by_order_sum: data.cv_by_order_sum,
                  est_commission_sum: data.est_commission_sum,
                  item_sold_sum: data.item_sold_sum,
                  order_amount_sum: data.order_amount_sum
                })
              } else if (responseData.clicks_sum !== undefined || responseData.cv_by_order_sum !== undefined) {
                // Data has direct fields
                data = responseData
                console.log(`✅ [${username}] Successfully fetched data from Shopee API (day ${attemptDay})`)
                console.log(`📊 [${username}] Data sample:`, {
                  clicks_sum: data.clicks_sum,
                  cv_by_order_sum: data.cv_by_order_sum,
                  est_commission_sum: data.est_commission_sum,
                  item_sold_sum: data.item_sold_sum,
                  order_amount_sum: data.order_amount_sum
                })
              } else {
                console.warn(`⚠️ [${username}] Data structure not recognized. Available keys:`, Object.keys(responseData))
                // Try to use responseData as-is anyway
                data = responseData
              }
              
              if (data && (data.clicks_sum !== undefined || data.cv_by_order_sum !== undefined || (data.list && data.list.length > 0))) {
                break
              } else {
                console.warn(`⚠️ [${username}] Data object exists but has no valid fields. Data keys:`, data ? Object.keys(data) : 'null')
              }
            } else {
              console.warn(`⚠️ [${username}] API response structure not recognized (day ${attemptDay}). Response keys:`, Object.keys(responseJson))
            }
          } else {
            const errorText = await apiResponse.text()
            console.warn(`⚠️ [${username}] API returned status ${apiResponse.status} (day ${attemptDay}):`, errorText.substring(0, 500))
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.error(`⏱️ [${username}] Timeout fetching data ${attemptDay} day(s) ago`)
          } else {
            console.error(`❌ [${username}] Error fetching data ${attemptDay} day(s) ago:`, error.message)
          }
        }
      }
      
      // Log if no data was fetched
      if (!data) {
        console.warn(`⚠️ [${username}] No data fetched from Shopee API, using default values (0)`)
      }
      
      // Extract performance data
      const klik = data ? safeInt(data.clicks_sum) : 0
      const pesanan = data ? safeInt(data.cv_by_order_sum) : 0
      const estCommissionRaw = data ? safeInt(data.est_commission_sum) : 0
      const komisi = estCommissionRaw / 100000
      const terjual = data ? safeInt(data.item_sold_sum) : 0
      const gmvRaw = data ? safeInt(data.order_amount_sum) : 0
      const gmv = gmvRaw / 100000
      const persentasi = gmv > 0 ? (komisi / gmv * 100) : 0
      
      // Calculate ROAS
      const avgGmv = pesanan > 0 ? gmv / pesanan : 0
      const avgKomisi = (persentasi / 100) * avgGmv
      const modal = 500000
      const komisiBersihSim = avgKomisi - (avgKomisi * 0.30)
      
      const generateRoas = (multiplier: number): number => {
        if (multiplier === 0) {
          return avgKomisi > 0 ? avgGmv / avgKomisi : 0
        } else if (multiplier === 1) {
          return komisiBersihSim > 0 ? avgGmv / komisiBersihSim : 0
        } else if (multiplier === 2) {
          return komisiBersihSim > 0 ? (avgGmv / komisiBersihSim) * 1.7 : 0
        }
        return 0
      }
      
      const normalRoas = generateRoas(1)
      const targetRoas = generateRoas(2)
      
      // Get account quality
      const hariIni = nowWIB.getDate()
      const kualitas = data ? getKualitas(komisi, hariIni) : "Stadium Akut"
      
      // Get team logo from account data
      const teamLogo = account.team_logo || null
      
      dashboardData.push({
        team: team,
        username: username,
        kualitas: kualitas,
        klik: klik,
        pesanan: pesanan,
        komisi: `Rp.${Math.round(komisi).toLocaleString('id-ID')}`,
        komisi_raw: komisi,
        terjual: terjual,
        gmv: `Rp.${Math.round(gmv).toLocaleString('id-ID')}`,
        gmv_raw: gmv,
        persen: `${persentasi.toFixed(2)}%`,
        normal_roas: Math.round(normalRoas * 100) / 100,
        target_roas: Math.round(targetRoas * 100) / 100,
        team_logo: teamLogo,
        nama_tim: team
      })
    }

    // Sort by komisi_raw descending
    dashboardData.sort((a, b) => (b.komisi_raw || 0) - (a.komisi_raw || 0))
    
    const totalKomisi = dashboardData.reduce((sum, acc) => sum + (acc.komisi_raw || 0), 0)
    
    // Log summary
    const accountsWithData = dashboardData.filter(acc => (acc.komisi_raw || 0) > 0 || (acc.gmv_raw || 0) > 0)
    console.log(`📊 /api/accounts/performance: Summary - Total: ${dashboardData.length}, With data: ${accountsWithData.length}, Total komisi: ${totalKomisi}`)

    return NextResponse.json({
      success: true,
      accounts: dashboardData,
      total_komisi: totalKomisi
    })

  } catch (error: any) {
    console.error('Error in /api/accounts/performance:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        accounts: [],
        total_komisi: 0
      },
      { status: 500 }
    )
  }
}

