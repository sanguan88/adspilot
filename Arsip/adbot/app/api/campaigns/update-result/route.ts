import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { sanitizeErrorForLogging, isDatabaseConnectionError, getGenericDatabaseErrorMessage } from '@/lib/db-errors'

// Helper function untuk convert date string ke timestamp (seperti Python)
function convertDateToTimestamp(dateStr: string, isStart: boolean = true): number {
  const date = new Date(dateStr)
  if (isStart) {
    date.setHours(0, 0, 0, 0)
  } else {
    date.setHours(23, 59, 59, 999)
  }
  return Math.floor(date.getTime() / 1000)
}

// Function to call Shopee API - langsung ke API Shopee seperti Python
async function callShopeeAPI(endpoint: string, payload: any = {}, cookie: string) {
  try {
    // Clean cookies
    const cleanedCookies = cookie.replace(/\s+/g, ' ').replace(/[\r\n\t]/g, ' ').trim()
    
    // Log hanya endpoint, tidak log payload (bisa panjang)
    console.log(`[API Call] Calling Shopee API: ${endpoint}`)
    
    // getsaldo - langsung ke API Shopee
    if (endpoint === 'getsaldo') {
      console.log(`[API Call] Using direct POST request for getsaldo to seller.shopee.co.id`)
      
      const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/meta/get_ads_data/'
      const headers = {
        'Cookie': cleanedCookies,
        'Content-Type': 'application/json'
      }
      const requestPayload = {
        info_type_list: ["ads_expense", "ads_credit", "campaign_day", "has_ads", "incentive", "ads_toggle"]
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`[API Call] ✓ getsaldo - Direct API response received`)
      
      // Transform response to match expected format
      return {
        success: true,
        data: data?.data || data
      }
    }
    
    // timegraph - langsung ke API Shopee
    if (endpoint === 'timegraph') {
      console.log(`[API Call] Using direct POST request for timegraph to seller.shopee.co.id`)
      
      // Convert date string ke timestamp
      const startTimestamp = convertDateToTimestamp(payload.start_time || payload.startTime, true)
      const endTimestamp = convertDateToTimestamp(payload.end_time || payload.endTime, false)
      
      const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/report/get_time_graph/'
      const headers = {
        'Cookie': cleanedCookies,
        'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
        'X-Region': 'id',
        'Content-Type': 'application/json'
      }
      const requestPayload = {
        agg_interval: 1,
        campaign_type: "live_stream_homepage",
        start_time: startTimestamp,
        end_time: endTimestamp,
        need_roi_target_setting: false
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`[API Call] ✓ timegraph - Direct API response received`)
      
      // Transform response to match expected format
      return {
        success: true,
        data: data?.data || data
      }
    }
    
    // homepage_query - untuk mendapatkan total spend dari semua campaign
    if (endpoint === 'homepage_query') {
      console.log(`[API Call] Using direct POST request for homepage_query to seller.shopee.co.id`)
      
      // Convert date string ke timestamp
      const startTimestamp = convertDateToTimestamp(payload.start_time || payload.startTime, true)
      const endTimestamp = convertDateToTimestamp(payload.end_time || payload.endTime, false)
      
      const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
      const headers = {
        'Cookie': cleanedCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Content-Type': 'application/json'
      }
      const requestPayload = {
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
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`[API Call] ✓ homepage_query - Direct API response received`)
      
      // Transform response to match expected format
      return {
        success: true,
        data: data?.data || data
      }
    }
    
    // Jika endpoint tidak dikenali, throw error
    throw new Error(`Unknown endpoint: ${endpoint}. Only getsaldo, timegraph, and homepage_query are supported.`)
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [API Call] ✗ Error calling ${endpoint}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    throw error
  }
}

// Function to get toko with cookies (with user filtering)
async function getAccountWithCookies(connection: PoolClient, user: any, tokoIds: string[]) {
  try {
    if (tokoIds.length === 0) {
      return []
    }
    
    // Build query to get toko by id_toko
    let paramIndex = 1
    
    // User isolation: Filter by user_id (unless admin/superadmin)
    let userFilter = ''
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      userFilter = ` AND dt.user_id = $${paramIndex++}`
    }
    
    const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
    const query = `
      SELECT dt.id_toko, dt.id_toko as username, dt.cookies as cookie_account, dt.nama_toko, dt.status_toko
      FROM data_toko dt
      WHERE dt.id_toko IN (${placeholders})
      AND dt.cookies IS NOT NULL 
      AND dt.cookies != ''
      AND (dt.status_toko = 'active' OR dt.status_toko = 'aktif')
      ${userFilter}
    `
    
    const params = [...tokoIds]
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      params.push(user.userId)
    }
    
    console.log(`[Update Result] Querying ${tokoIds.length} tokoIds`)
    const result = await connection.query(query, params)
    const rows = result.rows
    console.log(`[Update Result] Found ${rows.length} accounts with cookies`)
    
    return rows
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error fetching toko: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { account_ids, start_time, end_time } = body

    console.log('[Update Result] Received request:', { account_ids, start_time, end_time })

    // Handle account_ids - bisa array atau string kosong
    let tokoIds: string[] = []
    if (Array.isArray(account_ids)) {
      tokoIds = account_ids.filter(id => id && id.trim() !== '')
    } else if (typeof account_ids === 'string') {
      tokoIds = account_ids.split(',').filter(id => id && id.trim() !== '')
    }

    if (tokoIds.length === 0) {
      console.log('[Update Result] No account IDs provided or all empty')
      return NextResponse.json({ 
        success: false,
        error: 'No account IDs provided' 
      }, { status: 400 })
    }

    console.log('[Update Result] Processing tokoIds:', tokoIds)

    const startTime = start_time || new Date().toISOString().split('T')[0]
    const endTime = end_time || new Date().toISOString().split('T')[0]

    // Get authenticated user for data isolation
    const user = await requireActiveStatus(request)
    
    // Database connection
    const connection = await getDatabaseConnection()

    try {
      // Get accounts with cookies
      const accounts = await getAccountWithCookies(connection, user, tokoIds)
      
      console.log(`[Update Result] Found ${accounts.length} accounts with cookies`)
      
      if (accounts.length === 0) {
        // Log untuk debugging
        const debugQuery = await connection.query(
          `SELECT dt.id_toko, dt.status_toko, 
           CASE WHEN dt.cookies IS NULL THEN 'NULL' 
                WHEN dt.cookies = '' THEN 'EMPTY' 
                ELSE 'HAS_COOKIES' END as cookie_status
           FROM data_toko dt 
           WHERE dt.id_toko IN (${tokoIds.map((_, i) => `$${i + 1}`).join(',')})`,
          tokoIds
        )
        console.log('[Update Result] Debug - Toko status:', debugQuery.rows)
        
        return NextResponse.json({ 
          success: false,
          error: 'No accounts found with valid cookies' 
        }, { status: 404 })
      }

      const summaryData = {
        adBalance: 0,
        totalSpend: 0,
        totalSales: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        averageCTR: 0,
        averageROAS: 0,
        estCommission: 0
      }

      // Process each account
      for (const account of accounts) {
        console.log(`[Update Result] Processing account: ${account.username}`)
        
        try {
          // Get ad balance from getsaldo API
          try {
            const saldoData = await callShopeeAPI('getsaldo', {}, account.cookie_account)
            
            if (saldoData?.data?.ads_credit?.total) {
              const adBalance = saldoData.data.ads_credit.total / 100000
              summaryData.adBalance += adBalance
              console.log(`[Update Result] ${account.username} - Saldo: Rp${Math.round(adBalance).toLocaleString('id-ID')}`)
            } else {
              console.log(`[Update Result] ${account.username} - No saldo data found`)
            }
          } catch (saldoError) {
            const sanitized = sanitizeErrorForLogging(saldoError)
            const timestamp = new Date().toISOString()
            console.error(`[${timestamp}] Error fetching saldo for account ${account.username}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
          }

          // Get all metrics from homepage_query - jumlahkan semua report data dari entry_list
          try {
            const homepagePayload = {
              start_time: startTime,
              end_time: endTime
            }
            const homepageData = await callShopeeAPI('homepage_query', homepagePayload, account.cookie_account)
            
            // Jumlahkan semua report data dari entry_list
            if (homepageData?.data?.entry_list && Array.isArray(homepageData.data.entry_list)) {
              let totalCost = 0
              let totalImpressions = 0
              let totalClicks = 0
              let totalConversions = 0
              
              homepageData.data.entry_list.forEach((campaign: any) => {
                if (campaign?.report) {
                  const report = campaign.report
                  
                  // Jumlahkan cost
                  if (report.cost) {
                    totalCost += parseInt(report.cost.toString())
                  }
                  
                  // Jumlahkan impressions
                  if (report.impression) {
                    totalImpressions += parseInt(report.impression.toString())
                  }
                  
                  // Jumlahkan clicks (view)
                  if (report.view) {
                    totalClicks += parseInt(report.view.toString())
                  }
                  
                  // Jumlahkan conversions (broad_order)
                  if (report.broad_order) {
                    totalConversions += parseInt(report.broad_order.toString())
                  }
                }
              })
              
              // Total spend: dibagi 100000, lalu tambahkan PPN 11%
              const baseTotalSpend = totalCost / 100000
              const totalSpendWithPPN = baseTotalSpend + (baseTotalSpend * 0.11)
              summaryData.totalSpend += totalSpendWithPPN
              
              // Add other metrics
              summaryData.totalImpressions += totalImpressions
              summaryData.totalClicks += totalClicks
              summaryData.totalConversions += totalConversions
              
              console.log(`[Update Result] ${account.username} - Homepage: ${homepageData.data.entry_list.length} campaigns, Spend: Rp${Math.round(totalSpendWithPPN).toLocaleString('id-ID')}, Clicks: ${totalClicks}, Impressions: ${totalImpressions}`)
            } else {
              console.log(`[Update Result] ${account.username} - No entry_list found in homepage_query`)
            }
          } catch (homepageError) {
            const sanitized = sanitizeErrorForLogging(homepageError)
            const timestamp = new Date().toISOString()
            console.error(`[${timestamp}] Error fetching homepage_query for account ${account.username}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
          }

        } catch (error) {
          const sanitized = sanitizeErrorForLogging(error)
          const timestamp = new Date().toISOString()
          console.error(`[${timestamp}] Error processing account ${account.username}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
          continue
        }
      }

      // Calculate averages - CTR sudah dihitung per account, jadi tidak perlu dibagi lagi
      // Calculate ROAS as total sales / total spend (base tanpa PPN untuk perhitungan ROAS)
      const baseTotalSpendForROAS = summaryData.totalSpend / 1.11 // Kembalikan ke base sebelum PPN
      summaryData.averageROAS = baseTotalSpendForROAS > 0 ? summaryData.totalSales / baseTotalSpendForROAS : 0
      
      // Average CTR: hitung dari total clicks dan total impressions
      if (summaryData.totalImpressions > 0) {
        summaryData.averageCTR = (summaryData.totalClicks / summaryData.totalImpressions) * 100
      } else {
        summaryData.averageCTR = 0
      }

      // Calculate estimated commission (simplified, no commission data available)
      summaryData.estCommission = 0

      // Round values
      // Kolom bigint (saldo, spend, sales, impressions, clicks, conversions, commission) harus integer
      summaryData.adBalance = Math.round(summaryData.adBalance || 0)
      summaryData.totalSpend = Math.round(summaryData.totalSpend || 0) // Round to integer for bigint column
      summaryData.totalSales = Math.round(summaryData.totalSales || 0)
      summaryData.totalImpressions = Math.round(summaryData.totalImpressions || 0)
      summaryData.totalClicks = Math.round(summaryData.totalClicks || 0)
      summaryData.totalConversions = Math.round(summaryData.totalConversions || 0)
      summaryData.averageCTR = Math.round((summaryData.averageCTR || 0) * 100) / 100 // Round to 2 decimal places (numeric column)
      summaryData.averageROAS = Math.round((summaryData.averageROAS || 0) * 100) / 100 // Round to 2 decimal places (numeric column)
      summaryData.estCommission = Math.round(summaryData.estCommission || 0)

      // Summary logging (ringkas)
      console.log(`[Update Result] Summary: ${accounts.length} accounts, Balance=Rp${Math.round(summaryData.adBalance).toLocaleString('id-ID')}, Spend=Rp${Math.round(summaryData.totalSpend).toLocaleString('id-ID')}, Sales=Rp${Math.round(summaryData.totalSales).toLocaleString('id-ID')}, ROAS=${summaryData.averageROAS.toFixed(2)}x`)

      return NextResponse.json({
        success: true,
        message: 'Campaigns result updated successfully',
        data: summaryData,
        accounts_processed: accounts.length
      })

    } finally {
      if (connection) {
        connection.release()
      }
    }

  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    
    // Check if it's a database connection error
    if (isDatabaseConnectionError(error)) {
      console.error(`[${timestamp}] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
      return NextResponse.json({ 
        success: false,
        error: getGenericDatabaseErrorMessage()
      }, { status: 503 })
    }
    
    console.error(`[${timestamp}] Error updating campaigns result: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update campaigns result'
    }, { status: 500 })
  }
}
