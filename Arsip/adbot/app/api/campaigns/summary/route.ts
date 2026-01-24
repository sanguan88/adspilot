import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { sanitizeErrorForLogging, isDatabaseConnectionError, getGenericDatabaseErrorMessage } from '@/lib/db-errors'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

// Function to convert date string to timestamp
function convertDateToTimestamp(dateStr: string, isStart: boolean = true): number {
  const date = new Date(dateStr)
  if (isStart) {
    date.setHours(0, 0, 0, 0)
  } else {
    date.setHours(23, 59, 59, 999)
  }
  return Math.floor(date.getTime() / 1000)
}

// Function to call Shopee API get_ads_data
async function callShopeeGetAdsData(cookies: string) {
  try {
    // Clean cookies
    const cleanedCookies = cookies.replace(/\s+/g, ' ').replace(/[\r\n\t]/g, ' ').trim()
    
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
    return {
      success: true,
      data: data?.data || data
    }
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error calling get_ads_data API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    throw error
  }
}

// Function to call Shopee API get_time_graph using Python script
async function callShopeeGetTimeGraphPython(cookies: string, startTime: string, endTime: string) {
  try {
    // Create temporary Python script
    const scriptDir = process.cwd()
    const tempScriptPath = path.join(scriptDir, 'temp_get_time_graph.py')
    
    const templateScript = `import requests
import json
import sys
from datetime import datetime

cookies = sys.argv[1]
start_date = sys.argv[2]
end_date = sys.argv[3]

API_URL = "https://seller.shopee.co.id/api/pas/v1/report/get_time_graph/"

def convert_date_to_timestamp(date_str, is_start=True):
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    if is_start:
        date_obj = date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        date_obj = date_obj.replace(hour=23, minute=59, second=59, microsecond=999000)
    return int(date_obj.timestamp())

headers = {
    "Cookie": cookies,
    "User-Agent": "ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1",
    "X-Region": "id",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Accept-Language": "id-ID,id;q=0.9",
    "Origin": "https://seller.shopee.co.id",
    "Referer": "https://seller.shopee.co.id/"
}

start_timestamp = convert_date_to_timestamp(start_date, True)
end_timestamp = convert_date_to_timestamp(end_date, False)

payload = {
    "agg_interval": 4,
    "campaign_type": "new_cpc_homepage",
    "start_time": start_timestamp,
    "end_time": end_timestamp,
    "need_roi_target_setting": False
}

try:
    response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
    result = {
        "status_code": response.status_code,
        "success": response.status_code == 200,
        "data": response.json() if response.status_code == 200 else {"error": response.text}
    }
    print(json.dumps(result))
except Exception as e:
    error_result = {
        "status_code": 500,
        "success": False,
        "error": str(e)
    }
    print(json.dumps(error_result))
    sys.exit(1)
`

    // Write temporary script
    fs.writeFileSync(tempScriptPath, templateScript)
    
    // Escape cookies for command line
    const escapedCookies = cookies.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
    
    // Execute Python script
    const pythonCommand = `python "${tempScriptPath}" "${escapedCookies}" "${startTime}" "${endTime}"`
    
    console.log(`[get_time_graph_python] Executing Python script...`)
    const { stdout, stderr } = await execAsync(pythonCommand, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000
    })
    
    // Clean up temporary script
    try {
      fs.unlinkSync(tempScriptPath)
    } catch (e) {
      // Ignore cleanup errors
    }
    
    if (stderr) {
      console.error(`[get_time_graph_python] Python stderr: ${stderr}`)
    }
    
    // Parse JSON response
    const result = JSON.parse(stdout.trim())
    
    if (!result.success) {
      throw new Error(`Python script failed: ${result.error || 'Unknown error'}`)
    }
    
    return {
      success: true,
      data: result.data?.data || result.data
    }
    
  } catch (error) {
    const sanitized = error instanceof Error ? error.message : String(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error calling get_time_graph via Python: ${sanitized}`)
    throw error
  }
}

// Function to call Shopee API get_time_graph (Node.js fallback)
async function callShopeeGetTimeGraph(cookies: string, startTime: string, endTime: string) {
  try {
    // Clean cookies - preserve semicolon structure, only remove newlines and tabs
    let cleanedCookies = cookies
      .replace(/[\r\n\t]+/g, ' ')  // Replace newlines, carriage returns, tabs with space
      .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
      .trim()
    
    // Ensure proper semicolon separation (no spaces before semicolon, one space after)
    cleanedCookies = cleanedCookies
      .split(';')
      .map(c => c.trim())
      .filter(c => c.length > 0)
      .join('; ')
    
    // Convert date string to timestamp
    const startTimestamp = convertDateToTimestamp(startTime, true)
    const endTimestamp = convertDateToTimestamp(endTime, false)
    
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/report/get_time_graph/'
    
    // Use cleaned cookies directly
    const cookieString = cleanedCookies
    
    const headers: Record<string, string> = {
      'Cookie': cookieString,
      'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
      'X-Region': 'id',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'id-ID,id;q=0.9',
      'Origin': 'https://seller.shopee.co.id',
      'Referer': 'https://seller.shopee.co.id/'
    }
    const requestPayload = {
      agg_interval: 4,
      campaign_type: "new_cpc_homepage",
      start_time: startTimestamp,
      end_time: endTimestamp,
      need_roi_target_setting: false
    }
    
    console.log(`[get_time_graph] ==========================================`)
    console.log(`[get_time_graph] SENDING REQUEST TO: ${apiUrl}`)
    console.log(`[get_time_graph] Method: POST`)
    console.log(`[get_time_graph] Request payload:`, JSON.stringify({
      agg_interval: requestPayload.agg_interval,
      campaign_type: requestPayload.campaign_type,
      start_time: requestPayload.start_time,
      end_time: requestPayload.end_time,
      start_time_readable: new Date(startTimestamp * 1000).toISOString(),
      end_time_readable: new Date(endTimestamp * 1000).toISOString()
    }))
    console.log(`[get_time_graph] Headers:`, {
      'User-Agent': headers['User-Agent'],
      'Content-Type': headers['Content-Type'],
      'X-Region': headers['X-Region'],
      'Accept': headers['Accept'],
      'Cookie': cookieString.substring(0, 100) + '...' // Show first 100 chars of cookie
    })
    console.log(`[get_time_graph] ==========================================`)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload)
    })
    
    console.log(`[get_time_graph] Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[get_time_graph] ==========================================`)
      console.error(`[get_time_graph] ❌ API CALL FAILED`)
      console.error(`[get_time_graph] Status: ${response.status} ${response.statusText}`)
      console.error(`[get_time_graph] Error response: ${errorText}`)
      console.error(`[get_time_graph] ==========================================`)
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[get_time_graph] ==========================================`)
    console.log(`[get_time_graph] ✅ RESPONSE RECEIVED`)
    console.log(`[get_time_graph] Response code: ${data?.code}`)
    console.log(`[get_time_graph] Response msg: ${data?.msg}`)
    console.log(`[get_time_graph] Has data: ${!!data?.data}`)
    console.log(`[get_time_graph] Data keys:`, data?.data ? Object.keys(data.data) : [])
    if (data?.data?.report_aggregate) {
      console.log(`[get_time_graph] report_aggregate keys:`, Object.keys(data.data.report_aggregate))
    }
    if (data?.data?.report_by_time) {
      console.log(`[get_time_graph] report_by_time length:`, data.data.report_by_time.length)
    }
    console.log(`[get_time_graph] ==========================================`)
    
    return {
      success: true,
      data: data?.data || data
    }
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error calling get_time_graph API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    throw error
  }
}

// Function to get accounts with cookies (with user filtering)
async function getAccountsWithCookies(connection: PoolClient, user: any, tokoIds: string[]) {
  try {
    let paramIndex = 1
    
    // User isolation: Filter by user_id (unless admin/superadmin)
    let userFilter = ''
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      userFilter = ` AND dt.user_id = $${paramIndex++}`
    }
    
    const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
    const query = `
      SELECT dt.id_toko, dt.id_toko as username, dt.cookies as cookie_account, dt.nama_toko
      FROM data_toko dt
      WHERE dt.id_toko IN (${placeholders})
      AND dt.cookies IS NOT NULL 
      AND dt.cookies != ''
      AND dt.status_toko = 'active'
      ${userFilter}
    `
    
    const params = [...tokoIds]
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      params.push(user.userId)
    }
    
    const result = await connection.query(query, params)
    return result.rows
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error fetching accounts: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountIdsParam = searchParams.get('account_ids') || ''
  const startTime = searchParams.get('start_time') || ''
  const endTime = searchParams.get('end_time') || ''
  
  // Filter out empty strings, null, and undefined values
  const accountIds = accountIdsParam 
    ? accountIdsParam.split(',').map(id => id.trim()).filter(id => id !== '' && id !== 'null' && id !== 'undefined')
    : []

  console.log(`[Summary API] Received request: account_ids="${accountIdsParam}", start_time="${startTime}", end_time="${endTime}", parsed=${JSON.stringify(accountIds)}`)
  
  // Validate date parameters
  if (!startTime || !endTime) {
    console.log('[Summary API] Missing start_time or end_time parameters')
    const defaultSummaryData = {
      adBalance: 0,
      totalSpend: 0,
      totalSales: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      averageCTR: 0,
      averageROAS: 0,
      estCommission: 0,
      yesterday: null
    }
    return NextResponse.json({
      success: true,
      data: defaultSummaryData,
      accounts_processed: 0,
      error: 'Missing start_time or end_time parameters'
    })
  }

  // Return default values if no account IDs provided
  if (accountIds.length === 0) {
    console.log('[Summary API] No valid account IDs, returning default values')
    const defaultSummaryData = {
      adBalance: 0,
      totalSpend: 0,
      totalSales: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      averageCTR: 0,
      averageROAS: 0,
      estCommission: 0,
      yesterday: null
    }
    return NextResponse.json({
      success: true,
      data: defaultSummaryData,
      accounts_processed: 0
    })
  }

  let connection: PoolClient | null = null

  try {
    connection = await getDatabaseConnection()

    // Get id_toko from account_ids
    const tokoIds = accountIds.filter(id => id && id.trim() !== '')
    
    if (tokoIds.length === 0) {
      const defaultSummaryData = {
        adBalance: 0,
        totalSpend: 0,
        totalSales: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        averageCTR: 0,
        averageROAS: 0,
        estCommission: 0,
        yesterday: null
      }
      return NextResponse.json({
        success: true,
        data: defaultSummaryData,
        accounts_processed: 0
      })
    }

    // Get authenticated user for data isolation
    const user = await requireActiveStatus(request)
    
    // Get accounts with cookies
    const accounts = await getAccountsWithCookies(connection, user, tokoIds)
    
    console.log(`[Summary API] Found ${accounts.length} accounts with cookies for tokoIds: ${JSON.stringify(tokoIds)}`)
    
    if (accounts.length === 0) {
      console.log('[Summary API] No accounts with valid cookies found')
      return NextResponse.json({ error: 'No accounts with valid cookies found' }, { status: 404 })
    }

    // Initialize summary data
    let totalAdBalance = 0
    let totalSpend = 0
    let totalSales = 0
    let totalImpressions = 0
    let totalClicks = 0
    let totalConversions = 0
    let totalCTR = 0
    let totalROAS = 0
    let accountCount = 0

    // Get saldo iklan dari get_ads_data dan metrics dari get_time_graph untuk setiap account
    for (const account of accounts) {
      try {
        // Get saldo iklan dari get_ads_data (tetap sama seperti sekarang)
        const adsData = await callShopeeGetAdsData(account.cookie_account)
        
        // Log full response structure for debugging
        console.log(`[Summary API] ${account.username} - get_ads_data response:`, {
          hasData: !!adsData.data,
          hasAdsCredit: !!adsData.data?.ads_credit,
          adsCreditTotal: adsData.data?.ads_credit?.total,
          adsCreditKeys: adsData.data?.ads_credit ? Object.keys(adsData.data.ads_credit) : []
        })
        
        // Get saldo iklan dari ads_credit.total (dibagi 100000)
        // Check explicitly for null/undefined, not just truthy (because 0 is falsy)
        if (adsData.data?.ads_credit?.total !== null && adsData.data?.ads_credit?.total !== undefined) {
          const adBalance = adsData.data.ads_credit.total / 100000
          totalAdBalance += adBalance
          console.log(`[Summary API] ${account.username} - Saldo from API: ${adsData.data.ads_credit.total} (Rp${adBalance.toLocaleString('id-ID')}), Total so far: Rp${totalAdBalance.toLocaleString('id-ID')}`)
        } else {
          console.log(`[Summary API] ${account.username} - No saldo data found in ads_credit.total (value: ${adsData.data?.ads_credit?.total})`)
        }
        
        // Get metrics dari get_time_graph report_aggregate
        // Try Python script first (more reliable), fallback to Node.js fetch if Python fails
        console.log(`[Summary API] ==========================================`)
        console.log(`[Summary API] 📊 Calling get_time_graph for account: ${account.username}`)
        console.log(`[Summary API] Date range: ${startTime} to ${endTime}`)
        console.log(`[Summary API] ==========================================`)
        
        let timeGraphData
        try {
          // Try using Python script first (more reliable based on user's testing)
          try {
            console.log(`[Summary API] Attempting to use Python script...`)
            timeGraphData = await callShopeeGetTimeGraphPython(account.cookie_account, startTime, endTime)
            console.log(`[Summary API] ✅ Python script succeeded`)
          } catch (pythonError) {
            console.log(`[Summary API] Python script failed, falling back to Node.js fetch...`)
            console.log(`[Summary API] Python error: ${pythonError instanceof Error ? pythonError.message : String(pythonError)}`)
            // Fallback to Node.js fetch
            timeGraphData = await callShopeeGetTimeGraph(account.cookie_account, startTime, endTime)
            console.log(`[Summary API] ✅ Node.js fetch succeeded`)
          }
        } catch (error) {
          console.error(`[Summary API] ❌ Failed to get time_graph data for ${account.username}`)
          if (error instanceof Error) {
            console.error(`[Summary API] Error: ${error.message}`)
          }
          // Continue to next account instead of breaking
          continue
        }
        
        // Log response structure untuk debugging
        console.log(`[Summary API] get_time_graph response structure for ${account.username}:`, {
          hasData: !!timeGraphData.data,
          dataKeys: timeGraphData.data ? Object.keys(timeGraphData.data) : [],
          hasReportAggregate: !!timeGraphData.data?.report_aggregate,
          hasReportByTime: !!timeGraphData.data?.report_by_time,
          reportByTimeLength: timeGraphData.data?.report_by_time?.length || 0
        })
        
        const reportAggregate = timeGraphData.data?.report_aggregate
        
        if (reportAggregate) {
          console.log(`[Summary API] Processing report_aggregate for ${account.username}:`, {
            cost: reportAggregate.cost,
            broad_gmv: reportAggregate.broad_gmv,
            impression: reportAggregate.impression,
            click: reportAggregate.click,
            broad_order_amount: reportAggregate.broad_order_amount,
            ctr: reportAggregate.ctr,
            broad_roi: reportAggregate.broad_roi
          })
          
          // Total spend = cost (dibagi 100000)
          if (reportAggregate.cost) {
            totalSpend += reportAggregate.cost / 100000
          }
          
          // Total sales = broad_gmv (dibagi 100000)
          if (reportAggregate.broad_gmv) {
            totalSales += reportAggregate.broad_gmv / 100000
          }
          
          // Impressions
          if (reportAggregate.impression) {
            totalImpressions += reportAggregate.impression
          }
          
          // Clicks
          if (reportAggregate.click) {
            totalClicks += reportAggregate.click
          }
          
          // Conversions = broad_order_amount
          if (reportAggregate.broad_order_amount) {
            totalConversions += reportAggregate.broad_order_amount
          }
          
          // CTR (sudah dalam format 0-1, perlu dikali 100 untuk persen)
          if (reportAggregate.ctr !== undefined && reportAggregate.ctr !== null) {
            totalCTR += reportAggregate.ctr * 100
          }
          
          // ROAS = broad_roi
          if (reportAggregate.broad_roi !== undefined && reportAggregate.broad_roi !== null) {
            totalROAS += reportAggregate.broad_roi
          }
          
          accountCount++
        } else {
          console.log(`[Summary API] No report_aggregate found for ${account.username}, checking report_by_time...`)
          
          // Fallback: aggregate dari report_by_time jika report_aggregate tidak ada
          const reportByTime = timeGraphData.data?.report_by_time
          if (reportByTime && Array.isArray(reportByTime) && reportByTime.length > 0) {
            let aggregatedCost = 0
            let aggregatedGMV = 0
            let aggregatedImpressions = 0
            let aggregatedClicks = 0
            let aggregatedOrderAmount = 0
            let aggregatedCTR = 0
            let aggregatedROAS = 0
            let timeEntryCount = 0
            
            for (const timeEntry of reportByTime) {
              const metrics = timeEntry.metrics
              if (metrics) {
                if (metrics.cost) aggregatedCost += metrics.cost
                if (metrics.broad_gmv) aggregatedGMV += metrics.broad_gmv
                if (metrics.impression) aggregatedImpressions += metrics.impression
                if (metrics.click) aggregatedClicks += metrics.click
                if (metrics.broad_order_amount) aggregatedOrderAmount += metrics.broad_order_amount
                if (metrics.ctr !== undefined && metrics.ctr !== null) aggregatedCTR += metrics.ctr
                if (metrics.broad_roi !== undefined && metrics.broad_roi !== null) aggregatedROAS += metrics.broad_roi
                timeEntryCount++
              }
            }
            
            console.log(`[Summary API] Aggregated from report_by_time for ${account.username}:`, {
              cost: aggregatedCost,
              broad_gmv: aggregatedGMV,
              impression: aggregatedImpressions,
              click: aggregatedClicks,
              broad_order_amount: aggregatedOrderAmount,
              ctr: aggregatedCTR,
              broad_roi: aggregatedROAS,
              timeEntryCount
            })
            
            // Total spend = cost (dibagi 100000)
            if (aggregatedCost) {
              totalSpend += aggregatedCost / 100000
            }
            
            // Total sales = broad_gmv (dibagi 100000)
            if (aggregatedGMV) {
              totalSales += aggregatedGMV / 100000
            }
            
            // Impressions
            if (aggregatedImpressions) {
              totalImpressions += aggregatedImpressions
            }
            
            // Clicks
            if (aggregatedClicks) {
              totalClicks += aggregatedClicks
            }
            
            // Conversions = broad_order_amount
            if (aggregatedOrderAmount) {
              totalConversions += aggregatedOrderAmount
            }
            
            // CTR (average dari semua time entries, dikali 100 untuk persen)
            if (timeEntryCount > 0 && aggregatedCTR > 0) {
              totalCTR += (aggregatedCTR / timeEntryCount) * 100
            }
            
            // ROAS (average dari semua time entries)
            if (timeEntryCount > 0 && aggregatedROAS > 0) {
              totalROAS += aggregatedROAS / timeEntryCount
            }
            
            accountCount++
          } else {
            console.log(`[Summary API] No report_by_time data found for ${account.username}`)
          }
        }
      } catch (error) {
        const sanitized = sanitizeErrorForLogging(error)
        const timestamp = new Date().toISOString()
        console.error(`[${timestamp}] Error fetching data for account ${account.username}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
        if (error instanceof Error) {
          console.error(`[${timestamp}] Error message: ${error.message}`)
        }
        // Continue processing other accounts even if one fails
      }
    }
    
    // Calculate average CTR and ROAS
    const averageCTR = accountCount > 0 ? totalCTR / accountCount : 0
    const averageROAS = accountCount > 0 ? totalROAS / accountCount : 0

    const summaryData = {
      adBalance: Math.round(totalAdBalance || 0),
      totalSpend: Math.round((totalSpend || 0) * 100) / 100,
      totalSales: Math.round(totalSales || 0),
      totalImpressions: Math.round(totalImpressions || 0),
      totalClicks: Math.round(totalClicks || 0),
      totalConversions: Math.round(totalConversions || 0),
      averageCTR: Math.round((averageCTR || 0) * 100) / 100,
      averageROAS: Math.round((averageROAS || 0) * 100) / 100,
      estCommission: 0, // Not available
      // Yesterday data for trend calculation (null if not available)
      yesterday: null
    }

    return NextResponse.json({
      success: true,
      data: summaryData,
      accounts_processed: accounts.length
    })

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
    } else {
      console.error(`[${timestamp}] Error fetching summary data: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    }
     
    // Return default values instead of error
     const defaultSummaryData = {
       adBalance: 0,
       totalSpend: 0,
       totalSales: 0,
       totalImpressions: 0,
       totalClicks: 0,
       totalConversions: 0,
       averageCTR: 0,
       averageROAS: 0,
      estCommission: 0,
      yesterday: null
     }
     
     return NextResponse.json({
       success: true,
       data: defaultSummaryData,
       accounts_processed: 0,
      error: 'Failed to fetch summary data'
     })
   } finally {
     if (connection) {
       connection.release()
     }
   }
}
