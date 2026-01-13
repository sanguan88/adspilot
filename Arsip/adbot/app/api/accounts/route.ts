import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getRoleBasedFilter, getRoleBasedFilterForOptions } from '@/lib/role-filter'
import { validateTokoOwnership } from '@/lib/ownership-validator'
import { sanitizeErrorForLogging, isDatabaseConnectionError, getGenericDatabaseErrorMessage } from '@/lib/db-errors'
import { validateAccountLimit } from '@/lib/subscription-limits'

// Functions removed - shopee_accounts table no longer exists
// Account performance data is now calculated on-the-fly from API responses

// Fungsi untuk mengecek status cookies - langsung ke API Shopee seperti Python
// Helper function untuk menentukan cookie status berdasarkan performa data
function getCookieStatusFromPerforma(performaData: any, hasCookies: boolean): string {
  if (!hasCookies) {
    return 'no_cookies'
  }
  
  // Jika performa data berhasil diambil, berarti connected
  if (performaData && (performaData.total_gmv > 0 || performaData.total_biaya_iklan > 0)) {
    return 'connected'
  }
  
  return 'disconnected'
}

// Fungsi untuk mengambil data dari tabel report_aggregate berdasarkan range tanggal
async function getPerformaDataFromDatabase(userId: string, idToko: string, startTime: string, endTime: string, connection: PoolClient): Promise<any> {
  try {
    const query = `
      SELECT 
        COALESCE(SUM(broad_gmv), 0) as total_gmv,
        COALESCE(SUM(cost), 0) as total_biaya_iklan,
        COALESCE(SUM(click), 0) as total_clicks,
        COALESCE(SUM(broad_order), 0)::INTEGER as total_orders,
        COALESCE(SUM(impression), 0) as impression,
        COALESCE(SUM(view), 0) as view,
        -- Additional report_aggregate fields for detail view
        COALESCE(SUM(broad_cir), 0) as broad_cir,
        COALESCE(SUM(broad_order_amount), 0) as broad_order_amount,
        COALESCE(AVG(broad_roi), 0) as broad_roi,
        COALESCE(SUM(checkout), 0)::INTEGER as checkout,
        COALESCE(AVG(checkout_rate), 0) as checkout_rate,
        COALESCE(AVG(cpc), 0) as cpc,
        COALESCE(AVG(cpdc), 0) as cpdc,
        COALESCE(AVG(cr), 0) as cr,
        COALESCE(AVG(ctr), 0) as ctr,
        COALESCE(AVG(direct_cr), 0) as direct_cr,
        COALESCE(SUM(direct_cir), 0) as direct_cir,
        COALESCE(SUM(direct_gmv), 0) as direct_gmv,
        COALESCE(SUM(direct_order), 0)::INTEGER as direct_order,
        COALESCE(SUM(direct_order_amount), 0) as direct_order_amount,
        COALESCE(AVG(direct_roi), 0) as direct_roi,
        COALESCE(AVG(avg_rank), 0) as avg_rank,
        COALESCE(SUM(product_click), 0)::INTEGER as product_click,
        COALESCE(SUM(product_impression), 0)::INTEGER as product_impression,
        COALESCE(AVG(product_ctr), 0) as product_ctr,
        COALESCE(SUM(reach), 0)::INTEGER as reach,
        COALESCE(SUM(page_views), 0)::INTEGER as page_views,
        COALESCE(SUM(unique_visitors), 0)::INTEGER as unique_visitors,
        COALESCE(AVG(cpm), 0) as cpm,
        COALESCE(SUM(unique_click_user), 0)::INTEGER as unique_click_user
      FROM report_aggregate
      WHERE user_id = $1 
        AND id_toko = $2 
        AND tanggal >= $3 
        AND tanggal <= $4
    `
    
    const result = await connection.query(query, [userId, idToko, startTime, endTime])
    
    if (result.rows.length === 0) {
      return {
        total_gmv: 0,
        total_biaya_iklan: 0,
        rasio_iklan: 0,
        target_roas_low: 0,
        target_roas_high: 0,
        roas: 0,
        total_sold: 0,
        total_clicks: 0,
        total_orders: 0,
        impression: 0,
        view: 0,
        persentasi: 0,
        avg_gmv: 0,
        avg_komisi: 0,
        // Report aggregate detail fields
        broad_cir: 0,
        broad_order_amount: 0,
        broad_roi: 0,
        checkout: 0,
        checkout_rate: 0,
        cpc: 0,
        cpdc: 0,
        cr: 0,
        ctr: 0,
        direct_cr: 0,
        direct_cir: 0,
        direct_gmv: 0,
        direct_order: 0,
        direct_order_amount: 0,
        direct_roi: 0,
        avg_rank: 0,
        product_click: 0,
        product_impression: 0,
        product_ctr: 0,
        reach: 0,
        page_views: 0,
        unique_visitors: 0,
        cpm: 0,
        unique_click_user: 0
      }
    }
    
    const row = result.rows[0]
    const totalGmv = parseFloat(row.total_gmv) || 0
    const totalBiayaIklan = parseFloat(row.total_biaya_iklan) || 0
    const totalClicks = parseInt(row.total_clicks) || 0
    const totalOrders = parseInt(row.total_orders) || 0
    const impression = parseInt(row.impression) || 0
    const view = parseInt(row.view) || 0
    
    // Hitung ROAS = total gmv / total biaya iklan
    const roas = totalBiayaIklan > 0 ? (totalGmv / totalBiayaIklan) : 0
    
    // Hitung rasio iklan
    const rasioIklan = totalGmv > 0 ? (totalBiayaIklan / totalGmv) * 100 : 0
    
    // Hitung Target ROAS
    const aov = totalOrders > 0 ? (totalGmv / totalOrders) : 0
    const targetRoasLow = 0
    const targetRoasHigh = 0
    
    return {
      total_gmv: totalGmv,
      total_biaya_iklan: totalBiayaIklan,
      rasio_iklan: Math.round(rasioIklan),
      target_roas_low: targetRoasLow,
      target_roas_high: targetRoasHigh,
      roas: Math.round(roas * 10) / 10,
      total_sold: 0,
      total_clicks: totalClicks,
      total_orders: totalOrders,
      impression: impression,
      view: view,
      persentasi: 0,
      avg_gmv: aov,
      avg_komisi: 0,
      // Report aggregate detail fields
      broad_cir: parseFloat(row.broad_cir) || 0,
      broad_order_amount: parseFloat(row.broad_order_amount) || 0,
      broad_roi: parseFloat(row.broad_roi) || 0,
      checkout: parseInt(row.checkout) || 0,
      checkout_rate: parseFloat(row.checkout_rate) || 0,
      cpc: parseFloat(row.cpc) || 0,
      cpdc: parseFloat(row.cpdc) || 0,
      cr: parseFloat(row.cr) || 0,
      ctr: parseFloat(row.ctr) || 0,
      direct_cr: parseFloat(row.direct_cr) || 0,
      direct_cir: parseFloat(row.direct_cir) || 0,
      direct_gmv: parseFloat(row.direct_gmv) || 0,
      direct_order: parseInt(row.direct_order) || 0,
      direct_order_amount: parseFloat(row.direct_order_amount) || 0,
      direct_roi: parseFloat(row.direct_roi) || 0,
      avg_rank: parseFloat(row.avg_rank) || 0,
      product_click: parseInt(row.product_click) || 0,
      product_impression: parseInt(row.product_impression) || 0,
      product_ctr: parseFloat(row.product_ctr) || 0,
      reach: parseInt(row.reach) || 0,
      page_views: parseInt(row.page_views) || 0,
      unique_visitors: parseInt(row.unique_visitors) || 0,
      cpm: parseFloat(row.cpm) || 0,
      unique_click_user: parseInt(row.unique_click_user) || 0
    }
  } catch (error) {
    return {
      total_gmv: 0,
      total_biaya_iklan: 0,
      rasio_iklan: 0,
      target_roas_low: 0,
      target_roas_high: 0,
      roas: 0,
      total_sold: 0,
      total_clicks: 0,
      total_orders: 0,
      impression: 0,
      view: 0,
      persentasi: 0,
      avg_gmv: 0,
      avg_komisi: 0,
      // Report aggregate detail fields
      broad_cir: 0,
      broad_order_amount: 0,
      broad_roi: 0,
      checkout: 0,
      checkout_rate: 0,
      cpc: 0,
      cpdc: 0,
      cr: 0,
      ctr: 0,
      direct_cr: 0,
      direct_cir: 0,
      direct_gmv: 0,
      direct_order: 0,
      direct_order_amount: 0,
      direct_roi: 0,
      avg_rank: 0,
      product_click: 0,
      product_impression: 0,
      product_ctr: 0,
      reach: 0,
      page_views: 0,
      unique_visitors: 0,
      cpm: 0,
      unique_click_user: 0
    }
  }
}

// Fungsi untuk check missing dates dalam range
async function getMissingDates(userId: string, idToko: string, startTime: string, endTime: string, connection: PoolClient): Promise<string[]> {
  try {
    // Generate array of dates in range
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    const allDates: string[] = []
    
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      allDates.push(`${year}-${month}-${day}`)
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Query existing dates from database
    const query = `
      SELECT tanggal::text as tanggal
      FROM report_aggregate
      WHERE user_id = $1 
        AND id_toko = $2 
        AND tanggal >= $3 
        AND tanggal <= $4
    `
    
    const result = await connection.query(query, [userId, idToko, startTime, endTime])
    const existingDates = result.rows.map(row => row.tanggal)
    
    // Find missing dates
    const missingDates = allDates.filter(date => !existingDates.includes(date))
    
    return missingDates
  } catch (error) {
    return []
  }
}

// Fungsi untuk mengambil data dari API homepage query (fallback jika database kosong)
async function getPerformaData(cookies: string, startTime?: string, endTime?: string): Promise<any> {
  if (!cookies || cookies.trim() === '') {
    return {
      total_gmv: 0,
      total_biaya_iklan: 0,
      rasio_iklan: 0,
      target_roas_low: 0,
      target_roas_high: 0,
      roas: 0,
      total_sold: 0,
      total_clicks: 0,
      total_orders: 0,
      impression: 0,
      view: 0
    }
  }
  
  // Helper function untuk menghitung start_date dinamis
  const getDynamicStartDate = (): string => {
    const today = new Date()
    const todayDay = today.getDate()
    
    let startDate: Date
    
    if (todayDay === 1) {
      // Jika hari ini tanggal 1, maka start_date = tanggal 1 bulan kemarin
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      startDate = lastMonth
    } else {
      // Jika hari ini bukan tanggal 1, maka start_date = tanggal 1 bulan ini
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    }
    
    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const day = String(startDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function untuk menghitung end_date (kemarin)
  const getDynamicEndDate = (): string => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const year = yesterday.getFullYear()
    const month = String(yesterday.getMonth() + 1).padStart(2, '0')
    const day = String(yesterday.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function untuk validasi dan normalisasi tanggal
  const normalizeDates = (start: string, end: string): { start: string, end: string } => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    // Jika end_date kurang dari start_date, set keduanya ke tanggal yang sama (1 hari)
    if (endDate < startDate) {
      const singleDate = endDate
      const year = singleDate.getFullYear()
      const month = String(singleDate.getMonth() + 1).padStart(2, '0')
      const day = String(singleDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      return { start: dateStr, end: dateStr }
    }
    
    return { start, end }
  }
  
  // Gunakan tanggal yang dipilih user atau default
  const defaultStartDate = getDynamicStartDate()
  const defaultEndDate = getDynamicEndDate()
  let startDate = startTime || defaultStartDate
  let endDate = endTime || defaultEndDate
  
  // Normalisasi tanggal untuk memastikan end_date >= start_date
  const normalized = normalizeDates(startDate, endDate)
  startDate = normalized.start
  endDate = normalized.end
  
  // Clean cookies
  const cleanCookies = cookies.trim().replace(/\s+/g, ' ').replace(/[\r\n\t]/g, '')
  
  // Helper function untuk convert date string ke timestamp
  const convertDateToTimestamp = (dateStr: string, isStart: boolean = true): number => {
    const date = new Date(dateStr)
    if (isStart) {
      date.setHours(0, 0, 0, 0)
    } else {
      date.setHours(23, 59, 59, 999)
    }
    return Math.floor(date.getTime() / 1000)
  }
  
  // Request ke get_time_graph API untuk mendapatkan report_aggregate
  try {
      const startTimestamp = convertDateToTimestamp(startDate, true)
      const endTimestamp = convertDateToTimestamp(endDate, false)
      
    let totalBiayaIklan = 0
    let totalGmv = 0
    let totalClicks = 0
    let totalOrders = 0
    let impression = 0
    let view = 0
    
    // Try to get data from get_time_graph API (report_aggregate)
    try {
      const timeGraphUrl = 'https://seller.shopee.co.id/api/pas/v1/report/get_time_graph/'
      const timeGraphHeaders = {
        'Cookie': cleanCookies,
        'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
        'X-Region': 'id',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'id-ID,id;q=0.9',
        'Origin': 'https://seller.shopee.co.id',
        'Referer': 'https://seller.shopee.co.id/'
      }
      const timeGraphPayload = {
        agg_interval: 4,
        campaign_type: "new_cpc_homepage",
        start_time: startTimestamp,
        end_time: endTimestamp,
        need_roi_target_setting: false
      }
      
      const timeGraphResponse = await fetch(timeGraphUrl, {
        method: 'POST',
        headers: timeGraphHeaders,
        body: JSON.stringify(timeGraphPayload)
      })
      
      if (timeGraphResponse.ok) {
        const timeGraphData = await timeGraphResponse.json()
        const reportAggregate = timeGraphData?.data?.report_aggregate
        
        if (reportAggregate) {
          // Use data from report_aggregate
          if (reportAggregate.cost) {
            totalBiayaIklan = reportAggregate.cost / 100000
          }
          if (reportAggregate.broad_gmv) {
            totalGmv = reportAggregate.broad_gmv / 100000
          }
          if (reportAggregate.click) {
            totalClicks = reportAggregate.click
          }
          if (reportAggregate.broad_order_amount) {
            totalOrders = reportAggregate.broad_order_amount
          }
          if (reportAggregate.impression) {
            impression = reportAggregate.impression
          }
          if (reportAggregate.view) {
            view = reportAggregate.view
          }
        } else {
          // Fallback: aggregate from report_by_time if report_aggregate not available
          const reportByTime = timeGraphData?.data?.report_by_time
          if (reportByTime && Array.isArray(reportByTime) && reportByTime.length > 0) {
            for (const timeEntry of reportByTime) {
              const metrics = timeEntry.metrics
              if (metrics) {
                if (metrics.cost) totalBiayaIklan += metrics.cost
                if (metrics.broad_gmv) totalGmv += metrics.broad_gmv
                if (metrics.click) totalClicks += metrics.click
                if (metrics.broad_order_amount) totalOrders += metrics.broad_order_amount
                if (metrics.impression) impression += metrics.impression
                if (metrics.view) view += metrics.view
              }
            }
            totalBiayaIklan = totalBiayaIklan / 100000
            totalGmv = totalGmv / 100000
          }
        }
      }
    } catch (timeGraphError) {
      // If get_time_graph fails, fallback to homepage_query
    }
    
    // Fallback to homepage_query if get_time_graph didn't provide data
    if (totalBiayaIklan === 0 && totalGmv === 0) {
        const campaignUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
        const campaignHeaders = {
          'Cookie': cleanCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          'Content-Type': 'application/json'
        }
        const campaignPayload = {
          start_time: startTimestamp,
          end_time: endTimestamp,
          filter_list: [{
            "campaign_type": "product_homepage",
            "state": "all",
            "search_term": "",
            "product_placement_list": ["all", "search_product", "targeting"],
            "npa_filter": "exclude_npa",
            "is_valid_rebate_only": false
          }],
          offset: 0,
          limit: 1000
        }
        
        const campaignResponse = await fetch(campaignUrl, {
          method: 'POST',
          headers: campaignHeaders,
          body: JSON.stringify(campaignPayload)
        })
        
      if (campaignResponse.ok) {
          const responseData = await campaignResponse.json()
        if (responseData?.data?.entry_list && Array.isArray(responseData.data.entry_list)) {
          const entryList = responseData.data.entry_list
      entryList.forEach((campaign: any) => {
            if (campaign?.report?.cost) {
          totalBiayaIklan += parseInt(campaign.report.cost.toString())
        }
        if (campaign?.report?.broad_gmv) {
          totalGmv += parseInt(campaign.report.broad_gmv.toString())
        }
        if (campaign?.report?.broad_order) {
          totalOrders += parseInt(campaign.report.broad_order.toString())
        }
        if (campaign?.report?.click) {
          totalClicks += parseInt(campaign.report.click.toString())
        }
            if (campaign?.report?.impression) {
              impression += parseInt(campaign.report.impression.toString())
            }
            if (campaign?.report?.view) {
              view += parseInt(campaign.report.view.toString())
            }
          })
      
      totalBiayaIklan = totalBiayaIklan / 100000
      totalGmv = totalGmv / 100000
        }
      }
    }
    
    // Hitung ROAS = total gmv / total biaya iklan
    const roas = totalBiayaIklan > 0 ? (totalGmv / totalBiayaIklan) : 0
    
    // Hitung rasio iklan
    const rasioIklan = totalGmv > 0 ? (totalBiayaIklan / totalGmv) * 100 : 0
    
    // Hitung Target ROAS
    const aov = totalOrders > 0 ? (totalGmv / totalOrders) : 0
    const targetRoasLow = 0
    const targetRoasHigh = 0
        
        return {
          total_gmv: totalGmv,
          total_biaya_iklan: totalBiayaIklan,
      rasio_iklan: Math.round(rasioIklan),
          target_roas_low: targetRoasLow,
          target_roas_high: targetRoasHigh,
      roas: Math.round(roas * 10) / 10,
      total_sold: 0, // Not available from report_aggregate
          total_clicks: totalClicks,
          total_orders: totalOrders,
          impression: impression,
          view: view,
      persentasi: 0,
      avg_gmv: aov,
      avg_komisi: 0
    }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    
    // Get role-based filter
    const roleFilter = getRoleBasedFilter(user);
    const roleFilterOptions = getRoleBasedFilterForOptions(user);
    
    // Helper function untuk menghitung start_date dinamis
    const getDynamicStartDate = (): string => {
      const today = new Date()
      const todayDay = today.getDate()
      
      let startDate: Date
      
      if (todayDay === 1) {
        // Jika hari ini tanggal 1, maka start_date = tanggal 1 bulan kemarin
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        startDate = lastMonth
      } else {
        // Jika hari ini bukan tanggal 1, maka start_date = tanggal 1 bulan ini
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      }
      
      const year = startDate.getFullYear()
      const month = String(startDate.getMonth() + 1).padStart(2, '0')
      const day = String(startDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Helper function untuk menghitung end_date (kemarin)
    const getDynamicEndDate = (): string => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const year = yesterday.getFullYear()
      const month = String(yesterday.getMonth() + 1).padStart(2, '0')
      const day = String(yesterday.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Helper function untuk validasi dan normalisasi tanggal
    const normalizeDates = (start: string, end: string): { start: string, end: string } => {
      const startDate = new Date(start)
      const endDate = new Date(end)
      
      // Jika end_date kurang dari start_date, set keduanya ke tanggal yang sama (1 hari)
      if (endDate < startDate) {
        const singleDate = endDate
        const year = singleDate.getFullYear()
        const month = String(singleDate.getMonth() + 1).padStart(2, '0')
        const day = String(singleDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        return { start: dateStr, end: dateStr }
      }
      
      return { start, end }
    }
    
    let startDate = searchParams.get('start_date') || getDynamicStartDate()
    let endDate = searchParams.get('end_date') || getDynamicEndDate()
    
    // Normalisasi tanggal untuk memastikan end_date >= start_date
    const normalized = normalizeDates(startDate, endDate)
    startDate = normalized.start
    endDate = normalized.end
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const connection = await getDatabaseConnection()
    
    // Build WHERE conditions
    const whereConditions = []
    const params = []
    
    // Apply role-based filter first
    let paramIndex = 1
    if (roleFilter.whereClause) {
      // Remove 'AND' prefix if exists and add to whereConditions
      let roleFilterClause = roleFilter.whereClause.startsWith('AND ') 
        ? roleFilter.whereClause.substring(4) 
        : roleFilter.whereClause;
      
      // Replace ? with $1, $2, etc. for PostgreSQL
      const roleParams = roleFilter.params
      roleParams.forEach((_, index) => {
        roleFilterClause = roleFilterClause.replace('?', `$${paramIndex++}`)
      })
      
      whereConditions.push(roleFilterClause);
      params.push(...roleParams);
    }
    
    if (search) {
      whereConditions.push(`(dt.id_toko LIKE $${paramIndex} OR dt.nama_toko LIKE $${paramIndex + 1} OR dt.email_toko LIKE $${paramIndex + 1})`)
      params.push(`%${search}%`, `%${search}%`)
      paramIndex += 2
    }
    
    // User isolation: roleFilter already applied above
    // Admin/Superadmin: no filter (see all)
    // User/Manager/Staff: filter by user_id (see only own)
    
    // Exclude toko yang sudah dihapus (status_toko = 'deleted')
    // KECUALI untuk superadmin, yang perlu melihat toko yang sudah di-delete untuk hard delete
    if (user.role !== 'superadmin') {
      whereConditions.push("dt.status_toko <> 'deleted'")
    }
    
    // Build WHERE clause - handle empty conditions
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''
    
    // Query untuk mengambil data toko dengan pagination (include user_id)
    const offset = (page - 1) * limit
    const query = `SELECT dt.id_toko, dt.id_toko as username, dt.nama_toko, dt.email_toko, dt.profile_toko, dt.cookies, dt.status_toko, dt.user_id, dt.created_at, dt.update_at
                  FROM data_toko dt${whereClause ? ' ' + whereClause : ''} 
                  ORDER BY dt.created_at DESC
                  LIMIT ${limit} OFFSET ${offset}`
    
    // Query untuk menghitung total records
    const countQuery = `SELECT COUNT(*) as total
                       FROM data_toko dt${whereClause ? ' ' + whereClause : ''}`
    
    const rowsResult = await connection.query(query, params)
    const countResult = await connection.query(countQuery, params)
    const dataAkun = rowsResult.rows
    const totalRecords = countResult.rows[0].total
    const totalPages = Math.ceil(totalRecords / limit)
    
    // Note: Team and PIC filters removed (data_tim removed)
    const timData: any[] = []
    const picData: any[] = []
    
    connection.release()
    
    // PHASE 1: INSTANT response - ambil data dari data_toko
    const quickConnection = await getDatabaseConnection()
    
    // Ambil data dari data_toko dengan filter dan pagination yang sama
    const tokoOffset = (page - 1) * limit
    
    // Convert whereClause placeholders from ? to $1, $2, etc.
    let tokoQuery = `
      SELECT 
        dt.id_toko,
        dt.id_toko as username,
        dt.nama_toko,
        dt.email_toko,
        dt.profile_toko,
        dt.cookies,
        dt.status_toko,
        dt.user_id,
        dt.created_at,
        dt.update_at
      FROM data_toko dt${whereClause ? ' ' + whereClause : ''}
      ORDER BY dt.created_at DESC
      LIMIT ${limit} OFFSET ${tokoOffset}
    `
    
    // Replace ? with $1, $2, etc. in whereClause
    let tokoParamIndex = 1
    tokoQuery = tokoQuery.replace(/\?/g, () => `$${tokoParamIndex++}`)
    
    const tokoResult = await quickConnection.query(tokoQuery, params)
    const tokoData = tokoResult.rows
    
    // Proses data langsung dari hasil query yang sudah difilter
    const accountsWithPerforma: any[] = []
    
    for (const row of tokoData) {
      // Get user_id from data_toko (user_id is stored in data_toko table)
      const user_id = row.user_id
      
      if (!user_id) {
        continue
      }
      
      // Ambil data dari report_aggregate
      const performaData = await getPerformaDataFromDatabase(user_id, row.id_toko, startDate, endDate, quickConnection)
      
      // Check missing dates
      const missingDates = await getMissingDates(user_id, row.id_toko, startDate, endDate, quickConnection)
      
      // Map status_toko dari database ke cookie_status
      // active/aktif -> connected, inactive/tidak aktif -> disconnected
        let cookieStatus = 'no_cookies'
      if (row.status_toko) {
        const statusLower = row.status_toko.toLowerCase()
        if (statusLower === 'active' || statusLower === 'aktif') {
            cookieStatus = 'connected'
        } else if (statusLower === 'inactive' || statusLower === 'tidak aktif') {
            cookieStatus = 'disconnected'
          }
        } else if (row.cookies) {
        // Fallback: jika status_toko null tapi ada cookies, anggap checking
          cookieStatus = 'checking'
        }
      
      // Jika ada missing dates, ubah cookie_status menjadi 'sync' (akan ditampilkan sebagai merah di UI)
      if (missingDates.length > 0) {
        cookieStatus = 'sync'
        }
        
        accountsWithPerforma.push({
        id: row.id_toko, // id sama dengan id_toko (VERIFIED: accounts.id = data_toko.id_toko)
        username: row.id_toko,
        email: row.email_toko || '',
        email_toko: row.email_toko || '',
        nama_toko: row.nama_toko || '',
        profile_toko: row.profile_toko || null,
        cookies: '', // Empty string untuk konsistensi, data sensitif tidak dikirim (cookies diambil dari data_toko.cookies)
          created_at: row.created_at || new Date().toISOString(),
        updated_at: row.update_at || new Date().toISOString(),
        performa_data: performaData,
          cookie_status: cookieStatus,
        data_source: 'database',
        last_affiliate_sync: null,
        missing_dates: missingDates // Tambahkan missing dates untuk UI
        })
    }
    
    quickConnection.release()
    
    // PHASE 2: Background processing - update data yang belum ada
    // Jalankan background processing tanpa menunggu
    setImmediate(async () => {
      try {
        const backgroundConnection = await getDatabaseConnection()
        
        // Proses toko yang belum ada datanya (all toko use default data now)
        const pendingAccounts = dataAkun.filter(akun => 
          !accountsWithPerforma.find(acc => 
            acc.username === akun.id_toko
          )
        )
        
        if (pendingAccounts.length > 0) {
          for (let i = 0; i < pendingAccounts.length; i++) {
            const akun = pendingAccounts[i]
            
            try {
              if (!akun.cookies || akun.cookies.trim() === '') {
                continue
              }
              
              // Call API untuk mendapatkan data
              const performaData = await getPerformaData(akun.cookies, startDate, endDate)
              const cookieStatus = getCookieStatusFromPerforma(performaData, !!akun.cookies)
              
              // Add delay between requests
              if (i < pendingAccounts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
              
            } catch (error) {
              // Silent error in background processing
            }
          }
        }
        
        backgroundConnection.release()
        
      } catch (error) {
        // Silent error in background processing
      }
    })
    
    // Calculate summary from accountsWithPerforma
    let totalGmv = 0
    let totalBiayaIklan = 0
    let totalCheckout = 0
    let totalClicks = 0
    let totalOrders = 0
    let totalRoas = 0
    let totalRasioIklan = 0
    let accountsWithData = 0
    
    accountsWithPerforma.forEach(account => {
      const perf = account.performa_data || {}
      totalGmv += perf.total_gmv || 0
      totalBiayaIklan += perf.total_biaya_iklan || 0
      totalCheckout += perf.checkout || 0 // Menggunakan checkout dari report_aggregate
      totalClicks += perf.total_clicks || 0
      totalOrders += perf.total_orders || 0
      
      if (perf.roas && perf.roas > 0) {
        totalRoas += perf.roas
        accountsWithData++
      }
      
      totalRasioIklan += perf.rasio_iklan || 0
    })
    
    const avgRoas = accountsWithData > 0 ? totalRoas / accountsWithData : 0
    const avgRasioIklan = accountsWithPerforma.length > 0 ? totalRasioIklan / accountsWithPerforma.length : 0
    
    const summary = {
      total_gmv: totalGmv,
      total_biaya_iklan: totalBiayaIklan,
      total_checkout: totalCheckout,
      total_clicks: totalClicks,
      total_orders: totalOrders,
      total_accounts: accountsWithPerforma.length,
      avg_roas: avgRoas,
      avg_komisi_percent: 0,
      rasio_iklan_avg: avgRasioIklan,
      connected_count: accountsWithPerforma.filter(acc => acc.cookie_status === 'connected').length,
      disconnected_count: accountsWithPerforma.filter(acc => acc.cookie_status === 'disconnected').length
    }
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: accountsWithPerforma,
        summary: summary,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: totalRecords,
          records_per_page: limit,
          has_next_page: page < totalPages,
          has_prev_page: page > 1
        },
        user_role: user.role // Include user role for UI logic
      }
    })
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    )
  }
}

// POST handler untuk update cookies dan refresh individual account
export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null
  
  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    const { affiliate_id, cookies, action, start_date, end_date, username, id_toko, nama_toko, username_toko, email_toko, no_toko, hard_delete } = body
    
    if (action === 'add_toko') {
      // Handle add new toko - fetch data from Shopee API
      if (!cookies || !cookies.trim()) {
        return NextResponse.json(
          { success: false, error: 'Cookies wajib diisi' },
          { status: 400 }
        )
      }
      
      try {
        connection = await getDatabaseConnection()
      } catch (dbError) {
        console.error('[POST /api/accounts] Database connection error:', dbError)
        return NextResponse.json(
          { success: false, error: 'Gagal terhubung ke database. Silakan coba lagi.' },
          { status: 503 }
        )
      }
      
      try {
        // Flag to track if connection has been released
        let connectionReleased = false
        
        // Helper function to safely release connection
        const releaseConnection = () => {
          if (connection && !connectionReleased) {
            connection.release()
            connectionReleased = true
          }
        }
        
        // Get user_id (UUID string) from data_user table for insert into data_toko
        // Note: user_id column in data_toko is VARCHAR (UUID string), references user_id in data_user
        // Handle both old format (number/no) and new format (string/user_id/UUID)
        let user_id_for_insert: string
        
        if (typeof user.userId === 'string' && user.userId.includes('-')) {
          // New format: user.userId is already UUID string (user_id)
          // Verify it exists in database
          const userResult = await connection.query(
            'SELECT user_id FROM data_user WHERE user_id = $1',
            [user.userId]
          )
          
          if (!userResult.rows || userResult.rows.length === 0) {
            releaseConnection()
            return NextResponse.json(
              { success: false, error: 'User tidak ditemukan' },
              { status: 404 }
            )
          }
          
          user_id_for_insert = user.userId
        } else if (typeof user.userId === 'number') {
          // Old format: user.userId is number (no)
          // Need to get user_id (UUID string) from database
          const userResult = await connection.query(
            'SELECT user_id FROM data_user WHERE no = $1',
            [user.userId]
          )
          
          if (!userResult.rows || userResult.rows.length === 0) {
            releaseConnection()
            return NextResponse.json(
              { success: false, error: 'User tidak ditemukan' },
              { status: 404 }
            )
          }
          
          user_id_for_insert = userResult.rows[0].user_id
        } else {
          // Try to use as string if possible
          const userIdString = user.userId.toString()
          
          // Check if it's a UUID format
          if (userIdString.includes('-')) {
            // It's a UUID string
            const userResult = await connection.query(
              'SELECT user_id FROM data_user WHERE user_id = $1',
              [userIdString]
            )
            
            if (!userResult.rows || userResult.rows.length === 0) {
              releaseConnection()
              return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
              )
            }
            
            user_id_for_insert = userIdString
          } else {
            // Try to parse as number (no)
            const parsedNumber = parseInt(userIdString, 10)
            if (isNaN(parsedNumber)) {
              releaseConnection()
              return NextResponse.json(
                { success: false, error: 'Format user ID tidak valid' },
                { status: 400 }
              )
            }
            
            const userResult = await connection.query(
              'SELECT user_id FROM data_user WHERE no = $1',
              [parsedNumber]
            )
            
            if (!userResult.rows || userResult.rows.length === 0) {
              releaseConnection()
              return NextResponse.json(
                { success: false, error: 'User tidak ditemukan' },
                { status: 404 }
              )
            }
            
            user_id_for_insert = userResult.rows[0].user_id
          }
        }
        // Clean cookies - preserve line breaks between cookie pairs but remove extra whitespace
        let cleanCookies = cookies.trim()
        // Remove multiple spaces but keep single spaces
        cleanCookies = cleanCookies.replace(/\s{2,}/g, ' ')
        // Remove newlines and tabs but keep spaces
        cleanCookies = cleanCookies.replace(/[\r\n\t]/g, ' ')
        
        // Call 3 Shopee APIs to get toko data
        let shopid: string | null = null
        let namaToko: string | null = null
        let usernameToko: string | null = null
        let emailToko: string | null = null
        let noToko: string | null = null
        let portrait: string | null = null
        
        let apiErrors: string[] = []
        
        try {
          // API 1: Get user info
          const userInfoResponse = await fetch('https://chatbot.seller.shopee.co.id/chat/v2/get_user_info', {
            method: 'GET',
            headers: {
              'Cookie': cleanCookies,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Referer': 'https://seller.shopee.co.id/'
            }
          })
          
          if (userInfoResponse.ok) {
            const userInfoData = await userInfoResponse.json()
            if (userInfoData.code === 0 && userInfoData.data) {
              usernameToko = userInfoData.data.biz_user_identity || null
              emailToko = userInfoData.data.email || null
              noToko = userInfoData.data.phone || null
            } else {
              apiErrors.push(`API 1: ${userInfoData.msg || 'Unknown error'}`)
            }
          } else {
            const errorText = await userInfoResponse.text()
            apiErrors.push(`API 1: HTTP ${userInfoResponse.status} - ${errorText.substring(0, 100)}`)
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          apiErrors.push(`API 1 error: ${errorMsg}`)
        }
        
        try {
          // API 2: Login info
          const loginResponse = await fetch('https://seller.shopee.co.id/api/v2/login/', {
            method: 'GET',
            headers: {
              'Cookie': cleanCookies,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Referer': 'https://seller.shopee.co.id/'
            }
          })
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json()
            if (loginData.errcode === 0) {
              shopid = loginData.shopid?.toString() || null
              if (!emailToko && loginData.email) {
                emailToko = loginData.email
              }
              if (!noToko && loginData.phone) {
                noToko = loginData.phone
              }
              portrait = loginData.portrait || null
            } else {
              apiErrors.push(`API 2: errcode ${loginData.errcode}`)
            }
          } else {
            const errorText = await loginResponse.text()
            apiErrors.push(`API 2: HTTP ${loginResponse.status} - ${errorText.substring(0, 100)}`)
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          apiErrors.push(`API 2 error: ${errorMsg}`)
        }
        
        try {
          // API 3: Shop info
          const shopInfoResponse = await fetch('https://seller.shopee.co.id/api/framework/selleraccount/shop_info/', {
            method: 'GET',
            headers: {
              'Cookie': cleanCookies,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Referer': 'https://seller.shopee.co.id/'
            }
          })
          
          if (shopInfoResponse.ok) {
            const shopInfoData = await shopInfoResponse.json()
            if (shopInfoData.code === 0 && shopInfoData.data) {
              if (!shopid) {
                shopid = shopInfoData.data.shop_id?.toString() || null
              }
              namaToko = shopInfoData.data.name || null
            } else {
              apiErrors.push(`API 3: ${shopInfoData.message || 'Unknown error'}`)
            }
          } else {
            const errorText = await shopInfoResponse.text()
            apiErrors.push(`API 3: HTTP ${shopInfoResponse.status} - ${errorText.substring(0, 100)}`)
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          apiErrors.push(`API 3 error: ${errorMsg}`)
        }
        
        // Validate required fields
        if (!shopid) {
          releaseConnection()
          const errorMessage = apiErrors.length > 0 
            ? `Gagal mengambil shopid dari API. Errors: ${apiErrors.join('; ')}`
            : 'Gagal mengambil data toko dari API. Pastikan cookies valid.'
          return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 400 }
          )
        }
        
        if (!namaToko) {
          releaseConnection()
          const errorMessage = apiErrors.length > 0 
            ? `Gagal mengambil nama toko dari API. Errors: ${apiErrors.join('; ')}`
            : 'Gagal mengambil nama toko dari API. Pastikan cookies valid.'
          return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 400 }
          )
        }
        
        // Check if id_toko (shopid) already exists
        const checkResult = await connection.query(
          'SELECT id_toko FROM data_toko WHERE id_toko = $1',
          [shopid]
        )
        
        if (checkResult.rows.length > 0) {
          releaseConnection()
          return NextResponse.json(
            { success: false, error: 'Toko dengan ID ini sudah terdaftar' },
            { status: 400 }
          )
        }
        
        // Build profile_toko URL if portrait exists
        let profileToko: string | null = null
        if (portrait) {
          profileToko = `https://down-id.img.susercontent.com/${portrait}`
        }
        
        // Ensure required fields are not null
        if (!user_id_for_insert) {
          releaseConnection()
          return NextResponse.json(
            { success: false, error: 'User ID tidak ditemukan' },
            { status: 500 }
          )
        }
        
        if (!shopid) {
          releaseConnection()
          return NextResponse.json(
            { success: false, error: 'Shop ID tidak ditemukan' },
            { status: 500 }
          )
        }
        
        if (!namaToko) {
          releaseConnection()
          return NextResponse.json(
            { success: false, error: 'Nama toko tidak ditemukan' },
            { status: 500 }
          )
        }

        // Sebelum insert, cek apakah id_toko sudah ada namun berstatus deleted
        const existingTokoResult = await connection.query(
          'SELECT id_toko, status_toko FROM data_toko WHERE id_toko = $1',
          [shopid]
        )

        if (existingTokoResult.rows && existingTokoResult.rows.length > 0) {
          const existing = existingTokoResult.rows[0]
          if (existing.status_toko === 'deleted') {
            // Re-activate toko yang sebelumnya dihapus (soft delete)
            await connection.query(
              `UPDATE data_toko
               SET user_id = $1,
                   nama_toko = $2,
                   username_toko = $3,
                   email_toko = $4,
                   no_toko = $5,
                   profile_toko = $6,
                   cookies = $7,
                   status_cookies = 'aktif',
                   status_toko = 'active',
                   update_at = NOW()
               WHERE id_toko = $8`,
              [
                user_id_for_insert,
                namaToko,
                usernameToko || null,
                emailToko || null,
                noToko || null,
                portrait,
                cleanCookies,
                shopid,
              ]
            )

            releaseConnection()

            return NextResponse.json({
              success: true,
              message: 'Toko berhasil diaktifkan kembali',
              data: {
                id_toko: shopid,
                nama_toko: namaToko,
              },
            })
          } else {
            // Toko aktif/non-deleted sudah ada → tidak boleh ditambah lagi
            releaseConnection()
            return NextResponse.json(
              { success: false, error: 'Toko dengan ID ini sudah terdaftar' },
              { status: 400 }
            )
          }
        }

        // Validate account limit sebelum menambah toko baru
        const limitValidation = await validateAccountLimit(
          connection,
          user_id_for_insert,
          user.role
        )
        
        if (!limitValidation.allowed) {
          releaseConnection()
          return NextResponse.json(
            { 
              success: false, 
              error: limitValidation.error || 'Batas maksimal toko telah tercapai',
              usage: limitValidation.usage,
              limit: limitValidation.limit
            },
            { status: 403 }
          )
        }
        
        // Insert new toko - ensure all values are properly set
        try {
          await connection.query(
            `INSERT INTO data_toko (user_id, id_toko, nama_toko, username_toko, email_toko, no_toko, profile_toko, cookies, status_cookies, status_toko, saldo_iklan, created_at, update_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NOW(), NOW())`,
            [
              user_id_for_insert, // user_id (UUID string) from data_user table - VARCHAR type
              shopid, // id_toko from shopid
              namaToko, // nama_toko from shop_info name
              usernameToko || null, // username_toko from biz_user_identity (can be null)
              emailToko || null, // email_toko from email (can be null)
              noToko || null, // no_toko from phone (can be null)
              profileToko, // profile_toko from portrait with prefix (can be null)
              cleanCookies, // cookies
              'aktif', // status_cookies = aktif if successful
              'active' // status_toko = active (consistent with filter)
            ]
          )
        } catch (insertError: any) {
          const sanitized = sanitizeErrorForLogging(insertError)
          
          // Check for unique constraint violation
          if (sanitized.code === '23505' || (insertError as any)?.code === '23505') {
            releaseConnection()
            return NextResponse.json(
              { success: false, error: 'Toko dengan ID ini sudah terdaftar' },
              { status: 400 }
            )
          }
          
          // Re-throw to be caught by outer catch (connection will be released there)
          throw insertError
        }
        
        releaseConnection()
        
        return NextResponse.json({
          success: true,
          message: 'Toko berhasil ditambahkan',
          data: {
            id_toko: shopid,
            nama_toko: namaToko
          }
        })
      } catch (error) {
        // Use the helper function to safely release connection
        if (connection && typeof connection === 'object' && 'release' in connection) {
          try {
            (connection as PoolClient).release()
          } catch (releaseError) {
            // Ignore release errors (connection may already be released)
          }
        }
        
        const sanitized = sanitizeErrorForLogging(error)
        const timestamp = new Date().toISOString()
        
        // Log error for debugging (use original error for server-side logging)
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error(`[POST /api/accounts] add_toko error at ${timestamp}:`, {
          error: errorMsg,
          code: sanitized.code || (error as any)?.code,
          type: sanitized.type,
          stack: errorStack?.substring(0, 500) // Limit stack trace length
        })
        
        // Check for unique constraint violation
        if (sanitized.code === '23505' || (error as any)?.code === '23505') {
          return NextResponse.json(
            { success: false, error: 'Toko dengan ID ini sudah terdaftar' },
            { status: 400 }
          )
        }
        
        // Provide more informative error message (sanitize for client)
        const errorMessage = errorMsg && errorMsg.length > 0
          ? 'Gagal menambahkan toko. Pastikan cookies valid dan coba lagi.'
          : 'Gagal menambahkan toko. Pastikan cookies valid dan coba lagi.'
        
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage
          },
          { status: 500 }
        )
      }
    } else if (action === 'refresh_account') {
      // Handle refresh individual account
      // Use username only (affiliate_id might be null for some accounts)
      if (!username) {
        return NextResponse.json(
          { success: false, error: 'username is required for refresh' },
          { status: 400 }
        )
      }
      
      try {
        connection = await getDatabaseConnection()
      } catch (dbError) {
        console.error('[POST /api/accounts] Database connection error:', dbError)
        return NextResponse.json(
          { success: false, error: 'Gagal terhubung ke database. Silakan coba lagi.' },
          { status: 503 }
        )
      }
      
      try {
        // Get toko data from data_toko using id_toko
        const accountResult = await connection.query(
          'SELECT dt.id_toko, dt.nama_toko, dt.email_toko, dt.cookies, dt.status_toko, dt.created_at, dt.update_at FROM data_toko dt WHERE dt.id_toko = $1',
          [username]
        )
        const accountRows = accountResult.rows
        
        if (!accountRows || accountRows.length === 0) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Toko not found' },
            { status: 404 }
          )
        }
        
        const account = accountRows[0]
        const idToko = account.id_toko
        
        // Check if cookies available
        if (!account.cookies || account.cookies.trim() === '') {
          connection.release()
          return NextResponse.json({
            success: false,
            error: 'No cookies available',
            message: `Toko ${idToko} tidak memiliki cookies. Silakan update cookies terlebih dahulu.`
          }, { status: 400 })
        }
        
        // Force refresh from API (request langsung ke Shopee API)
        // Request ke Shopee API - getPerformaData
        let performaData = null
        let cookieStatus = 'disconnected'
        let apiError = false
        
        try {
          // Request performa data
          performaData = await getPerformaData(account.cookies, start_date, end_date)
          
          // Tentukan cookie status berdasarkan performa data
          cookieStatus = getCookieStatusFromPerforma(performaData, !!account.cookies)
          
          // Cek apakah semua response berhasil
          const isPerformaSuccess = performaData && (performaData.total_gmv > 0 || performaData.total_biaya_iklan > 0)
          const isCookieStatusSuccess = cookieStatus === 'connected'
          
          if (isPerformaSuccess && isCookieStatusSuccess) {
            // Semua response berhasil → update status_toko = 'active'
            // Note: Data no longer saved to shopee_accounts table (removed)
            
            // Update status_toko using id_toko
            await connection.query(
              'UPDATE data_toko SET status_toko = $1 WHERE id_toko = $2',
              ['active', idToko]
            )
            
            connection.release()
            
            // Hapus cookies dari response untuk keamanan
            const { cookies, ...accountWithoutCookies } = account
            
            return NextResponse.json({
              success: true,
              data: {
                ...accountWithoutCookies,
                username: idToko, // For backward compatibility
                performa_data: performaData,
                cookie_status: 'connected',
                data_source: 'api_refresh',
                last_affiliate_sync: new Date().toISOString()
              }
            })
          } else {
            // Salah satu response gagal → update status_toko = 'inactive'
            apiError = true
            
            await connection.query(
              'UPDATE data_toko SET status_toko = $1 WHERE id_toko = $2',
              ['inactive', idToko]
            )
            
            connection.release()
            
            return NextResponse.json({
              success: false,
              error: 'One or more API requests failed',
              message: `Gagal memperbarui data untuk toko ${idToko}. Salah satu request ke API gagal.`,
              cookie_status: cookieStatus
            }, { status: 400 })
          }
        } catch (apiErr) {
          // Error saat request ke API → update status_toko = 'inactive'
          apiError = true
          
          await connection.query(
            'UPDATE data_toko SET status_toko = $1 WHERE id_toko = $2',
            ['inactive', idToko]
          )
          
          connection.release()
          
          return NextResponse.json({
            success: false,
            error: 'API request failed',
            message: `Gagal memperbarui data untuk toko ${idToko}. Terjadi kesalahan saat request ke API.`,
            cookie_status: 'disconnected'
          }, { status: 400 })
        }
        
      } catch (error) {
        if (connection) {
          connection.release()
        }
        throw error
      }
      
    } else if (action === 'update_cookies' || !action) {
      // Handle update cookies (default action if no action specified)
      // Use username only (affiliate_id might be null for some accounts)
      if (!cookies) {
        return NextResponse.json(
          { success: false, error: 'cookies is required' },
          { status: 400 }
        )
      }
      
      // username is required to identify the account
      if (!username) {
        return NextResponse.json(
          { success: false, error: 'username is required' },
          { status: 400 }
        )
      }
      
      try {
        connection = await getDatabaseConnection()
      } catch (dbError) {
        console.error('[POST /api/accounts] Database connection error:', dbError)
        return NextResponse.json(
          { success: false, error: 'Gagal terhubung ke database. Silakan coba lagi.' },
          { status: 503 }
        )
      }
      
      try {
        // Get toko data dari data_toko menggunakan id_toko
        const checkAccountResult = await connection.query(
          'SELECT dt.id_toko, dt.nama_toko, dt.email_toko, dt.cookies, dt.status_toko, dt.created_at, dt.update_at FROM data_toko dt WHERE dt.id_toko = $1',
          [username]
        )
        
        if (!checkAccountResult.rows || checkAccountResult.rows.length === 0) {
          connection.release()
          return NextResponse.json(
            { 
              success: false, 
              error: 'Toko not registered',
              message: 'Toko belum terdaftar, silahkan daftarkan toko di member area'
            },
            { status: 404 }
          )
        }
        
        const account = checkAccountResult.rows[0]
        const idToko = account.id_toko
        
        // Validate ownership sebelum update (kecuali admin/superadmin)
        const hasAccess = await validateTokoOwnership(connection, user, idToko)
        if (!hasAccess) {
          connection.release()
          return NextResponse.json(
            { 
              success: false, 
              error: 'Access denied',
              message: 'Anda tidak memiliki akses untuk mengupdate toko ini'
            },
            { status: 403 }
          )
        }
        
        // Update cookies dan paksa status_toko = 'active'
        await connection.query(
          'UPDATE data_toko SET cookies = $1, status_toko = $2, update_at = NOW() WHERE id_toko = $3',
          [cookies, 'active', idToko]
        )
        
        connection.release()
        
        return NextResponse.json({ 
          success: true,
          message: 'Cookies berhasil diupdate',
          data_refreshed: false,
          status_toko: 'active'
        })
        
      } catch (error) {
        if (connection) {
          connection.release()
        }
        throw error
      }
    } else if (action === 'delete_toko') {
      // Soft delete toko: set status_toko = 'deleted' dan kosongkan cookies
      if (!id_toko) {
        return NextResponse.json(
          { success: false, error: 'id_toko is required' },
          { status: 400 }
        )
      }

      try {
        connection = await getDatabaseConnection()
      } catch (dbError) {
        console.error('[POST /api/accounts] Database connection error (delete_toko):', dbError)
        return NextResponse.json(
          { success: false, error: 'Gagal terhubung ke database. Silakan coba lagi.' },
          { status: 503 }
        )
      }

      try {
        // Pastikan toko ada
        const checkResult = await connection.query(
          'SELECT id_toko FROM data_toko WHERE id_toko = $1',
          [id_toko]
        )

        if (!checkResult.rows || checkResult.rows.length === 0) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Toko tidak ditemukan' },
            { status: 404 }
          )
        }

        // Validasi akses (kecuali admin/superadmin sudah di-handle di helper)
        const hasAccess = await validateTokoOwnership(connection, user, id_toko)
        if (!hasAccess) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Access denied', message: 'Anda tidak memiliki akses untuk menghapus toko ini' },
            { status: 403 }
          )
        }

        // Validasi hard delete: hanya superadmin yang bisa hard delete
        const shouldHardDelete = hard_delete === true || hard_delete === 'true'
        if (shouldHardDelete && user.role !== 'superadmin') {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Access denied', message: 'Hanya superadmin yang dapat melakukan hard delete' },
            { status: 403 }
          )
        }

        if (shouldHardDelete && user.role === 'superadmin') {
          // Hard delete: benar-benar hapus row dari database
          await connection.query(
            'DELETE FROM data_toko WHERE id_toko = $1',
            [id_toko]
          )
        } else {
          // Soft delete: set status_toko = 'deleted' dan kosongkan cookies
          await connection.query(
            'UPDATE data_toko SET status_toko = $1, cookies = NULL, update_at = NOW() WHERE id_toko = $2',
            ['deleted', id_toko]
          )
        }

        connection.release()

        return NextResponse.json({
          success: true,
          message: shouldHardDelete && user.role === 'superadmin'
            ? 'Toko berhasil dihapus permanen dari database'
            : 'Toko berhasil dihapus',
        })
      } catch (error) {
        if (connection) {
          connection.release()
        }
        throw error
      }
    } else {
      // Unknown action
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action || 'undefined'}` },
        { status: 400 }
      )
    }
    
  } catch (error) {
    // Ensure connection is released if it exists
    if (connection && typeof connection === 'object' && 'release' in connection) {
      try {
        (connection as PoolClient).release()
      } catch (releaseError) {
        // Ignore release errors
      }
    }
    
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    
    // Log the error for debugging (use original error for server-side logging)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error(`[POST /api/accounts] Error at ${timestamp}:`, {
      error: errorMsg,
      code: sanitized.code || (error as any)?.code,
      type: sanitized.type,
      stack: errorStack?.substring(0, 500) // Limit stack trace length
    })
    
    // Check if it's a database connection error
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { success: false, error: getGenericDatabaseErrorMessage() },
        { status: 503 }
      )
    }
    
    // Provide generic error message (don't expose internal error details to client)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}

// PUT handler untuk refresh all data (setelah background processing)
export async function PUT(request: NextRequest) {
  let connection: PoolClient | null = null;
  
  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    
    const body = await request.json()
    const { start_date, end_date } = body
    
    connection = await getDatabaseConnection()
    
    // Get role-based filter for user isolation
    const roleFilter = getRoleBasedFilter(user)
    
    // Build query with user filter
    let tokoQuery = `
      SELECT dt.id_toko, dt.nama_toko, dt.email_toko, dt.cookies, dt.status_toko, dt.created_at, dt.update_at
      FROM data_toko dt
    `
    const tokoParams: any[] = []
    
    // Apply user filter (unless admin/superadmin)
    if (roleFilter.whereClause) {
      let filterClause = roleFilter.whereClause.startsWith('AND ') 
        ? roleFilter.whereClause.substring(4) 
        : roleFilter.whereClause
      
      // Replace ? with $1 for PostgreSQL
      filterClause = filterClause.replace('?', '$1')
      tokoQuery += ` WHERE ${filterClause}`
      tokoParams.push(...roleFilter.params)
    }
    
    tokoQuery += ` ORDER BY dt.id_toko`
    
    const rowsResult = await connection.query(tokoQuery, tokoParams)
    
    const dataToko = rowsResult.rows
    const accountsWithPerforma: any[] = []
    
    // Get all data (no longer from shopee_accounts, use default data)
    for (const toko of dataToko) {
      try {
        // Return default data (shopee_accounts table removed)
          const defaultPerformaData = {
            total_gmv: 0,
            total_biaya_iklan: 0,
            rasio_iklan: 0,
            target_roas_low: 0,
            target_roas_high: 0,
            roas: 0,
            total_sold: 0,
            total_clicks: 0,
            total_orders: 0,
            impression: 0,
            view: 0,
            persentasi: 0,
            avg_gmv: 0,
            avg_komisi: 0
          }
        
        // Tentukan cookie status berdasarkan status_toko dari database
        // Untuk PUT request, kita gunakan status dari database
        let cookieStatus = 'no_cookies'
        if (toko.cookies) {
          cookieStatus = (toko.status_toko === 'active' || toko.status_toko === 'aktif') ? 'connected' : 'disconnected'
          }
          
          // Hapus cookies dari response untuk keamanan
        const { cookies: _, ...tokoWithoutCookies } = toko
          
          accountsWithPerforma.push({
          ...tokoWithoutCookies,
          username: toko.id_toko, // For backward compatibility
          email: toko.email_toko || '',
            performa_data: defaultPerformaData,
          cookie_status: cookieStatus,
            data_source: 'pending',
            last_affiliate_sync: null
          })
      } catch (error) {
          // Silent error handling
      }
    }
    
    if (connection) {
    connection.release()
    }
    
    // Calculate summary
    let totalGmv = 0
    let totalKomisi = 0
    let totalBiayaIklan = 0
    let totalNettKomisi = 0
    let totalKlik = 0
    let totalPesanan = 0
    let totalTerjual = 0
    
    accountsWithPerforma.forEach(account => {
      totalGmv += account.performa_data.total_gmv || 0
      totalKomisi += account.performa_data.total_komisi || 0
      totalBiayaIklan += account.performa_data.total_biaya_iklan || 0
      totalNettKomisi += account.performa_data.nett_komisi || 0
      totalKlik += account.performa_data.total_clicks || 0
      totalPesanan += account.performa_data.total_orders || 0
      totalTerjual += account.performa_data.total_sold || 0
    })
    
    const summary = {
      total_gmv: totalGmv,
      total_komisi: totalKomisi,
      total_biaya_iklan: totalBiayaIklan,
      nett_komisi: totalNettKomisi,
      total_klik: totalKlik,
      total_pesanan: totalPesanan,
      total_terjual: totalTerjual
    }
    
    return NextResponse.json({
      success: true,
      data: {
        accounts: accountsWithPerforma,
        summary: summary,
        filter_options: {
          tim_options: [],
          pic_options: []
        }
      }
    })
    
  } catch (error) {
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
    }
    
    const sanitized = sanitizeErrorForLogging(error)
    
    // Check if it's a database connection error
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { success: false, error: getGenericDatabaseErrorMessage() },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}