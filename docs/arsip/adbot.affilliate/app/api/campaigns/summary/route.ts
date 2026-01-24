import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'

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
    
    console.log(`[API Call] Calling Shopee API: ${endpoint}`)
    console.log(`[API Call] Payload:`, payload)
    
    // Special handling for listsesion - use direct GET request to creator.shopee.co.id
    if (endpoint === 'listsesion') {
      console.log(`[API Call] Using direct GET request for listsesion to creator.shopee.co.id`)
      
      const response = await fetch('https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/sessionList?page=1&pageSize=100', {
        method: 'GET',
        headers: {
          'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
          'Cookie': cleanedCookies
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`[API Call] ✓ listsesion - Direct API response received`)
      
      // Transform response to match expected format
      return {
        success: true,
        data: {
          list: data?.data?.list || []
        }
      }
    }
    
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
        filter_list: [{"campaign_type": "live_stream_homepage", "state": "all", "search_term": ""}],
        offset: 0,
        limit: 20
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
    throw new Error(`Unknown endpoint: ${endpoint}. Only listsesion, getsaldo, timegraph, and homepage_query are supported.`)
  } catch (error) {
    console.error(`[API Call] ✗ Error calling ${endpoint}:`, error)
    throw error
  }
}

// Function to calculate GMV with rules (PRIORITAS: Rule 3 > Rule 1 > Rule 2)
// Fungsi ini menghitung GMV langsung dari API seperti updategmv.py
async function calculateGMVWithRules(connection: PoolClient, username: string, activeSessions: any[], startTime: string) {
  try {
    // Parse startTime to get today (format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    const today = startTime.split('T')[0]
    
    // Calculate yesterday (format: YYYY-MM-DD)
    const todayDate = new Date(today)
    const yesterdayDate = new Date(todayDate)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = yesterdayDate.toISOString().split('T')[0]
    
    console.log(`Calculating GMV for ${username}: today=${today}, yesterday=${yesterday}, sessions=${activeSessions.length}`)
    
    let totalGMV = 0
    
    for (const session of activeSessions) {
      const sessionId = session.sessionId
      const confirmedSales = session.confirmedSales || 0
      
      console.log(`Processing session ${sessionId}: confirmedSales=${confirmedSales}`)
      
      // PRIORITAS RULES: Rule 3 > Rule 1 > Rule 2
      
      // Rule 3: sessionid (kemarin) = sessionid dari API
      const yesterdayResult = await connection.query(
        `SELECT id, gmv FROM data_gmv WHERE today = $1 AND username = $2 AND sessionid = $3`,
        [yesterday, username, sessionId]
      )
      const yesterdayData = yesterdayResult.rows
      
      if (yesterdayData.length > 0) {
        // Rule 3: sessionid (kemarin) = sessionid dari API
        // GMV = GMV dari API - GMV kemarin (SUBTRACT)
        const yesterdayGMV = yesterdayData[0].gmv
        const calculatedGMV = confirmedSales - yesterdayGMV
        totalGMV += Math.max(0, calculatedGMV) // Ensure non-negative
        console.log(`✅ Rule 3: ${username}, session=${sessionId}, API=${confirmedSales}, Yesterday=${yesterdayGMV}, Calculated=${calculatedGMV}`)
      } else {
        // Cek apakah ada data hari ini dengan sessionid yang sama (Rule 1)
        const todayResult = await connection.query(
          `SELECT id, sessionid, gmv FROM data_gmv WHERE today = $1 AND username = $2 AND sessionid = $3`,
          [today, username, sessionId]
        )
        const todayData = todayResult.rows
        
        if (todayData.length > 0) {
          // Rule 1: sessionid (hari ini) sudah ada di database
          // Gunakan API GMV langsung (nilai terbaru dari API)
          totalGMV += confirmedSales
          console.log(`✅ Rule 1: ${username}, session=${sessionId}, GMV=${confirmedSales}`)
        } else {
          // Cek apakah ada data lain hari ini dengan sessionid berbeda (Rule 2)
          const todayDifferentResult = await connection.query(
            `SELECT id, sessionid, gmv FROM data_gmv WHERE today = $1 AND username = $2`,
            [today, username]
          )
          const todayDifferentData = todayDifferentResult.rows
          
          if (todayDifferentData.length > 0) {
            // Rule 2: sessionid (hari ini) berbeda dengan yang di database
            // GMV = existing GMV (dari DB) + API GMV (ADD)
            const existingGMV = todayDifferentData[0].gmv
            totalGMV += existingGMV + confirmedSales
            console.log(`✅ Rule 2: ${username}, existing=${existingGMV}, API=${confirmedSales}, Total=${existingGMV + confirmedSales}`)
          } else {
            // New session - gunakan API GMV langsung
            totalGMV += confirmedSales
            console.log(`✅ New session: ${username}, session=${sessionId}, GMV=${confirmedSales}`)
          }
        }
      }
    }
    
    console.log(`📊 Total GMV for ${username}: ${totalGMV}`)
    return totalGMV
  } catch (error) {
    console.error(`❌ Error calculating GMV with rules for ${username}:`, error)
    return 0
  }
}

// Function to get account with cookies
async function getAccountWithCookies(connection: PoolClient, accountIds: string[]) {
  try {
    console.log(`Fetching accounts for IDs: ${accountIds.join(', ')}`)
    
    // Build query to check both id_affiliate and username
    let paramIndex = 1
    const placeholders = accountIds.map(() => `$${paramIndex++}`).join(',')
    const placeholders2 = accountIds.map(() => `$${paramIndex++}`).join(',')
      const query = `
        SELECT da.id_affiliate, da.username, da.cookies as cookie_account, dt.nama_tim, sa.persentasi
        FROM data_akun da
        LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
        LEFT JOIN shopee_accounts sa ON da.username = sa.username
        WHERE (da.id_affiliate IN (${placeholders}) OR da.username IN (${placeholders2}))
        AND da.cookies IS NOT NULL 
        AND da.cookies != ''
      `
    
    console.log(`Query: ${query}`)
    console.log(`Parameters: [${[...accountIds, ...accountIds].join(', ')}]`)
    
    // First, let's check what accounts exist with cookies
    const allAccountsResult = await connection.query(`
      SELECT da.id_affiliate, da.username, da.cookies, dt.nama_tim
      FROM data_akun da
      LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim
      WHERE da.cookies IS NOT NULL AND da.cookies != ''
      LIMIT 5
    `)
    const allAccounts = allAccountsResult.rows
    console.log(`All accounts with cookies:`, allAccounts)
    
    const result = await connection.query(query, [...accountIds, ...accountIds])
    const rows = result.rows
    console.log(`Found accounts for query:`, rows)
    
    return rows
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountIds = searchParams.get('account_ids')?.split(',') || []
  
  // Gunakan tanggal hari ini jika tidak ada parameter (bukan hardcode)
  const today = new Date().toLocaleDateString('en-CA') // Format: YYYY-MM-DD
  const startTime = searchParams.get('start_time') || today
  const endTime = searchParams.get('end_time') || today

  if (accountIds.length === 0) {
    return NextResponse.json({ error: 'No account IDs provided' }, { status: 400 })
  }

  let connection: PoolClient | null = null

  try {
    connection = await getDatabaseConnection()

    // Get accounts with cookies
    const accounts = await getAccountWithCookies(connection, accountIds)
    
    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No accounts found with valid cookies' }, { status: 404 })
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
       try {
         // Get saldo data from getsaldo endpoint
         try {
           const saldoData = await callShopeeAPI('getsaldo', {}, account.cookie_account)
           
           if (saldoData?.data?.ads_credit?.total) {
             summaryData.adBalance += saldoData.data.ads_credit.total / 100000 // Convert to Rupiah
           }
           // If API fails or no data, keep default value 0
         } catch (saldoError) {
           console.error(`Error fetching saldo for account ${account.username}:`, saldoError)
           // Keep default value 0 - no dummy data
         }

         // Get all metrics from homepage_query - jumlahkan semua report data dari entry_list
         try {
           const homepagePayload = {
             start_time: startTime,
             end_time: endTime
           }
           
           const homepageData = await callShopeeAPI('homepage_query', homepagePayload, account.cookie_account)
           console.log(`Homepage query response for ${account.username}:`, JSON.stringify(homepageData, null, 2))
           
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
             
             // CTR akan dihitung di akhir dari total clicks dan total impressions
             
             console.log(`Homepage query data for ${account.username}:`, {
               totalCost,
               baseTotalSpend,
               totalSpendWithPPN,
               totalImpressions,
               totalClicks,
               totalConversions
             })
           } else {
             console.log(`No entry_list found in homepage_query response for ${account.username}`)
           }
           // If API fails or no data, keep default value 0
         } catch (homepageError) {
           console.error(`Error fetching homepage_query for account ${account.username}:`, homepageError)
           // Keep default value 0 - no dummy data
         }

        // Get total sales dari database untuk date range, atau hitung dari API dengan rules
        try {
          const startDate = startTime.split('T')[0]
          const endDate = endTime.split('T')[0]
          
          // Ambil total GMV dari database untuk date range (sudah dihitung dengan rules oleh updategmv.py)
          const existingGMVResult = await connection.query(
            `SELECT SUM(gmv) as total_gmv FROM data_gmv WHERE today BETWEEN $1 AND $2 AND username = $3`,
            [startDate, endDate, account.username]
          )
          const existingGMV = existingGMVResult.rows
          
          const gmvFromDB = existingGMV[0]?.total_gmv
          
          if (gmvFromDB && gmvFromDB > 0) {
            // Ambil dari database (sudah dihitung dengan rules oleh updategmv.py)
            summaryData.totalSales += Number(gmvFromDB)
            console.log(`Account ${account.username}: Using GMV from database (${startDate} to ${endDate}): ${gmvFromDB}`)
          } else {
            // Hitung dari API dengan rules (jika belum ada di database)
            const listsesionData = await callShopeeAPI('listsesion', {}, account.cookie_account)
            
            if (listsesionData?.data?.list && Array.isArray(listsesionData.data.list)) {
              // Filter sessions with status = 1
              const activeSessions = listsesionData.data.list.filter((session: any) => session.status === 1)
              
              if (activeSessions.length > 0) {
                // Calculate GMV based on rules (seperti updategmv.py)
                const calculatedGMV = await calculateGMVWithRules(connection, account.username, activeSessions, startTime)
                summaryData.totalSales += calculatedGMV
                console.log(`Account ${account.username}: Calculated GMV from API with rules: ${calculatedGMV}`)
              } else {
                console.log(`Account ${account.username}: No active sessions found`)
              }
            }
          }
          // If API fails or no data, keep default value 0
        } catch (salesError) {
          console.error(`Error calculating sales for account ${account.username}:`, salesError)
          // Keep default value 0 - no dummy data
        }
       } catch (error) {
         console.error(`Error processing account ${account.username}:`, error)
         // Continue with other accounts even if one fails
         // Keep default values 0 - no dummy data
       }
     }

     // Calculate averages - CTR sudah dihitung per account, jadi tidak perlu dibagi lagi
     // Calculate ROAS as total sales / total spend (base tanpa PPN untuk perhitungan ROAS)
     const baseTotalSpendForROAS = summaryData.totalSpend / 1.11 // Kembalikan ke base sebelum PPN
     summaryData.averageROAS = baseTotalSpendForROAS > 0 ? summaryData.totalSales / baseTotalSpendForROAS : 0
     
     // Average CTR: jika ada beberapa account, hitung rata-rata
     if (accounts.length > 0 && summaryData.totalImpressions > 0) {
       // Recalculate CTR dari total clicks dan total impressions
       summaryData.averageCTR = (summaryData.totalClicks / summaryData.totalImpressions) * 100
     } else {
       summaryData.averageCTR = 0
     }

      // Calculate estimated commission using commission percentage from database
      let totalCommissionPercentage = 0
      let accountsWithCommission = 0
      
      for (const account of accounts) {
        if (account.persentasi) {
          // Convert persentasi to number if it's a string
          const commissionPercentage = typeof account.persentasi === 'string' 
            ? parseFloat(account.persentasi) 
            : account.persentasi
          
          if (!isNaN(commissionPercentage)) {
            totalCommissionPercentage += commissionPercentage
            accountsWithCommission++
          }
        }
      }
      
      // Calculate average commission percentage
      const avgCommissionPercentage = accountsWithCommission > 0 ? totalCommissionPercentage / accountsWithCommission : 0
      
      // Calculate estimated commission: totalSales * commission% / 100
      summaryData.estCommission = summaryData.totalSales * (avgCommissionPercentage / 100)

     // Round values - ensure all values are properly rounded
     summaryData.adBalance = Math.round(summaryData.adBalance || 0)
     summaryData.totalSpend = Math.round((summaryData.totalSpend || 0) * 100) / 100 // Data dari homepage_query dengan PPN 11%
     summaryData.totalSales = Math.round(summaryData.totalSales || 0)
     summaryData.totalImpressions = Math.round(summaryData.totalImpressions || 0)
     summaryData.totalClicks = Math.round(summaryData.totalClicks || 0)
     summaryData.totalConversions = Math.round(summaryData.totalConversions || 0)
     summaryData.averageCTR = Math.round((summaryData.averageCTR || 0) * 100) / 100 // Round to 2 decimal places
     summaryData.averageROAS = Math.round((summaryData.averageROAS || 0) * 100) / 100 // Round to 2 decimal places
     summaryData.estCommission = Math.round(summaryData.estCommission || 0)

    console.log('Final summary data:', summaryData)

    return NextResponse.json({
      success: true,
      data: summaryData,
      accounts_processed: accounts.length
    })

   } catch (error) {
     console.error('Error fetching summary data:', error)
     
     // Return default values instead of error - no dummy data, just zeros
     const defaultSummaryData = {
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
     
     return NextResponse.json({
       success: true,
       data: defaultSummaryData,
       accounts_processed: 0,
       error: 'API calls failed, returning default values'
     })
   } finally {
     if (connection) {
       connection.release()
     }
   }
}
