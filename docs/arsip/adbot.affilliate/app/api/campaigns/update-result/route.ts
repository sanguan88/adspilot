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
async function calculateGMVWithRules(connection: PoolClient, username: string, activeSessions: any[], startTime: string) {
  try {
    const today = startTime.split('T')[0] // Get date from startTime
    const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    let totalGMV = 0
    
    for (const session of activeSessions) {
      const sessionId = session.sessionId
      const confirmedSales = session.confirmedSales || 0
      
      // PRIORITAS RULES: Rule 3 > Rule 1 > Rule 2
      
      // Rule 3: sessionid (kemarin) = sessionid dari API
      const yesterdayResult = await connection.query(
        `SELECT id, gmv FROM data_gmv WHERE today = $1 AND username = $2 AND sessionid = $3`,
        [yesterday, username, sessionId]
      )
      const yesterdayData = yesterdayResult.rows
      
      if (yesterdayData.length > 0) {
        // Rule 3: sessionid (kemarin) = sessionid dari API
        // GMV = GMV dari API - GMV kemarin
        const yesterdayGMV = yesterdayData[0].gmv
        const todayGMV = confirmedSales - yesterdayGMV
        totalGMV += Math.max(0, todayGMV) // Ensure non-negative
        console.log(`Rule 3 - Same sessionid as yesterday: ${username}, sessionId: ${sessionId}, API GMV: ${confirmedSales}, Yesterday GMV: ${yesterdayGMV}, Calculated GMV: ${todayGMV}`)
      } else {
        // Rule 1: sessionid (hari ini) = sessionid dari API
        const todayResult = await connection.query(
          `SELECT id, sessionid, gmv FROM data_gmv WHERE today = $1 AND username = $2 AND sessionid = $3`,
          [today, username, sessionId]
        )
        const todayData = todayResult.rows
        
        if (todayData.length > 0) {
          // Rule 1: sessionid (hari ini) = sessionid dari API
          // UPDATE data GMV dengan nilai dari API
          totalGMV += confirmedSales
          console.log(`Rule 1 - Same sessionid today: ${username}, sessionId: ${sessionId}, GMV: ${confirmedSales}`)
        } else {
          // Rule 2: sessionid (hari ini) ≠ sessionid dari API
          const todayDifferentResult = await connection.query(
            `SELECT id, sessionid, gmv FROM data_gmv WHERE today = $1 AND username = $2`,
            [today, username]
          )
          const todayDifferentData = todayDifferentResult.rows
          
          if (todayDifferentData.length > 0) {
            // Rule 2: sessionid (hari ini) ≠ sessionid dari API
            // GMV = GMV dari API + GMV database (sessionid sebelumnya)
            const existingGMV = todayDifferentData[0].gmv
            const newGMV = existingGMV + confirmedSales
            totalGMV += newGMV // Add total GMV (existing + new)
            console.log(`Rule 2 - Different sessionid today: ${username}, sessionId: ${sessionId}, Existing GMV: ${existingGMV}, API GMV: ${confirmedSales}, New GMV: ${newGMV}`)
          } else {
            // New session - insert as is
            totalGMV += confirmedSales
            console.log(`New session: ${username}, sessionId: ${sessionId}, GMV: ${confirmedSales}`)
          }
        }
      }
    }
    
    return totalGMV
  } catch (error) {
    console.error(`Error calculating GMV with rules for ${username}:`, error)
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
    
    const result = await connection.query(query, [...accountIds, ...accountIds])
    const rows = result.rows
    console.log(`Found accounts for query:`, rows)
    
    return rows
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { account_ids, start_time, end_time } = body

    if (!account_ids || account_ids.length === 0) {
      return NextResponse.json({ error: 'No account IDs provided' }, { status: 400 })
    }

    const startTime = start_time || new Date().toISOString().split('T')[0]
    const endTime = end_time || new Date().toISOString().split('T')[0]

    // Database connection
    const connection = await getDatabaseConnection()

    try {
      // Get accounts with cookies
      const accounts = await getAccountWithCookies(connection, account_ids)
      
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
        console.log(`\n=== PROCESSING ACCOUNT: ${account.username} ===`)
        
        try {
          // Get ad balance from getsaldo API
          try {
            console.log(`Fetching saldo data for ${account.username}...`)
            const saldoData = await callShopeeAPI('getsaldo', {}, account.cookie_account)
            console.log(`Saldo response:`, JSON.stringify(saldoData, null, 2))
            
            if (saldoData?.data?.ads_credit?.total) {
              const adBalance = saldoData.data.ads_credit.total / 100000
              summaryData.adBalance += adBalance
              console.log(`Saldo data for ${account.username}:`, { adBalance })
            } else {
              console.log(`No saldo data found for ${account.username}`)
            }
          } catch (saldoError) {
            console.error(`Error fetching saldo for account ${account.username}:`, saldoError)
          }

          // Get all metrics from homepage_query - jumlahkan semua report data dari entry_list
          try {
            console.log(`Fetching homepage_query data for ${account.username}...`)
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
          } catch (homepageError) {
            console.error(`Error fetching homepage_query for account ${account.username}:`, homepageError)
          }

          // Get total sales from listsesion API with GMV rules
          try {
            console.log(`Fetching listsesion data for ${account.username}...`)
            const listsesionData = await callShopeeAPI('listsesion', {}, account.cookie_account)
            console.log(`Listsesion response:`, JSON.stringify(listsesionData, null, 2))
            
            if (listsesionData?.data?.list && Array.isArray(listsesionData.data.list)) {
              console.log(`Found ${listsesionData.data.list.length} sessions`)
              
              // Filter sessions with status = 1
              const activeSessions = listsesionData.data.list.filter((session: any) => session.status === 1)
              console.log(`Active sessions (status=1): ${activeSessions.length}`)
              
              if (activeSessions.length > 0) {
                console.log(`Active sessions data:`, activeSessions.map((s: any) => ({
                  sessionId: s.sessionId,
                  status: s.status,
                  confirmedSales: s.confirmedSales
                })))
                
                // Calculate GMV based on rules
                const calculatedGMV = await calculateGMVWithRules(connection, account.username, activeSessions, startTime)
                summaryData.totalSales += calculatedGMV
                console.log(`Account ${account.username}: Calculated GMV with rules: ${calculatedGMV}`)
              } else {
                console.log(`No active sessions found for ${account.username}`)
              }
            } else {
              console.log(`No listsesion data found for ${account.username}`)
            }
          } catch (listsesionError) {
            console.error(`Error fetching listsesion for account ${account.username}:`, listsesionError)
          }
        } catch (error) {
          console.error(`Error processing account ${account.username}:`, error)
          continue
        }
        
        console.log(`=== END PROCESSING ACCOUNT: ${account.username} ===\n`)
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

      // Calculate estimated commission
      let totalCommissionPercentage = 0
      let accountsWithCommission = 0
      
      for (const account of accounts) {
        if (account.persentasi) {
          const commissionPercentage = typeof account.persentasi === 'string' 
            ? parseFloat(account.persentasi) 
            : account.persentasi
          
          if (!isNaN(commissionPercentage)) {
            totalCommissionPercentage += commissionPercentage
            accountsWithCommission++
          }
        }
      }
      
      const avgCommissionPercentage = accountsWithCommission > 0 ? totalCommissionPercentage / accountsWithCommission : 0
      summaryData.estCommission = summaryData.totalSales * (avgCommissionPercentage / 100)

      // Round values
      summaryData.adBalance = Math.round(summaryData.adBalance || 0)
      summaryData.totalSpend = Math.round((summaryData.totalSpend || 0) * 100) / 100 // Data dari homepage_query dengan PPN 11%
      summaryData.totalSales = Math.round(summaryData.totalSales || 0)
      summaryData.totalImpressions = Math.round(summaryData.totalImpressions || 0)
      summaryData.totalClicks = Math.round(summaryData.totalClicks || 0)
      summaryData.totalConversions = Math.round(summaryData.totalConversions || 0)
      summaryData.averageCTR = Math.round((summaryData.averageCTR || 0) * 100) / 100
      summaryData.averageROAS = Math.round((summaryData.averageROAS || 0) * 100) / 100
      summaryData.estCommission = Math.round(summaryData.estCommission || 0)

      // Debug logging untuk summary data
      console.log('=== SUMMARY DATA DEBUG ===')
      console.log(`Accounts processed: ${accounts.length}`)
      console.log(`Account usernames: ${accounts.map(acc => acc.username).join(', ')}`)
      console.log(`Summary data before save:`, {
        adBalance: summaryData.adBalance,
        totalSpend: summaryData.totalSpend,
        totalSales: summaryData.totalSales,
        totalImpressions: summaryData.totalImpressions,
        totalClicks: summaryData.totalClicks,
        totalConversions: summaryData.totalConversions,
        averageCTR: summaryData.averageCTR,
        averageROAS: summaryData.averageROAS,
        estCommission: summaryData.estCommission
      })
      console.log('=== END SUMMARY DATA DEBUG ===')

      // Update campaigns_result table
      const today = new Date().toISOString().split('T')[0]
      
      // Use the actual username from the first account, not account_ids
      const actualUsername = accounts[0]?.username || account_ids[0]
      console.log(`Using username: ${actualUsername} for campaigns_result`)
      
      // First, ensure there's a campaign record for this username
      // Check if username exists in campaigns table
      const campaignExistsResult = await connection.query(
        `SELECT id FROM campaigns WHERE username = $1 LIMIT 1`,
        [actualUsername]
      )
      const campaignExists = campaignExistsResult.rows

      if (campaignExists.length === 0) {
        // Insert a dummy campaign record to satisfy foreign key constraint
        await connection.query(
          `INSERT INTO campaigns (
            username, campaign_id, title, status, objective, daily_budget, 
            total_spend, roi_two_target, broad_gmv, broad_order, broad_roi, 
            cost_ratio, impression, view, cps, cpm, checkout_rate
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            actualUsername, // username (actual username, not ID)
            'SUMMARY_' + Date.now(), // campaign_id (unique)
            'Summary Campaign', // title
            'active', // status
            'summary', // objective
            0, // daily_budget
            0, // total_spend
            0, // roi_two_target
            0, // broad_gmv
            0, // broad_order
            0, // broad_roi
            0, // cost_ratio
            0, // impression
            0, // view
            0, // cps
            0, // cpm
            0 // checkout_rate
          ]
        )
        console.log(`Created dummy campaign record for ${actualUsername}`)
      }
      
      // Check if record exists in campaigns_result
      const existingRecordResult = await connection.query(
        `SELECT id FROM campaigns_result WHERE username = $1`,
        [actualUsername]
      )
      const existingRecord = existingRecordResult.rows

      if (existingRecord.length > 0) {
        // Update existing record
        await connection.query(
          `UPDATE campaigns_result SET 
            saldo = $1, 
            spend = $2, 
            sales = $3, 
            impressions = $4, 
            clicks = $5, 
            ctr = $6, 
            conversions = $7, 
            roas = $8, 
            commission = $9
          WHERE username = $10`,
          [
            summaryData.adBalance,
            summaryData.totalSpend,
            summaryData.totalSales,
            summaryData.totalImpressions,
            summaryData.totalClicks,
            summaryData.averageCTR,
            summaryData.totalConversions,
            summaryData.averageROAS,
            summaryData.estCommission,
            actualUsername
          ]
        )
        console.log(`Updated campaigns_result for ${actualUsername} on ${today}`)
      } else {
        // Insert new record using ON CONFLICT to handle duplicate key issues
        try {
          await connection.query(
            `INSERT INTO campaigns_result (
              username, saldo, spend, sales, impressions, clicks, ctr, conversions, roas, commission
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (username) 
            DO UPDATE SET
              saldo = EXCLUDED.saldo,
              spend = EXCLUDED.spend,
              sales = EXCLUDED.sales,
              impressions = EXCLUDED.impressions,
              clicks = EXCLUDED.clicks,
              ctr = EXCLUDED.ctr,
              conversions = EXCLUDED.conversions,
              roas = EXCLUDED.roas,
              commission = EXCLUDED.commission`,
            [
              actualUsername,
              summaryData.adBalance,
              summaryData.totalSpend,
              summaryData.totalSales,
              summaryData.totalImpressions,
              summaryData.totalClicks,
              summaryData.averageCTR,
              summaryData.totalConversions,
              summaryData.averageROAS,
              summaryData.estCommission
            ]
          )
          console.log(`Inserted new campaigns_result for ${actualUsername} on ${today}`)
        } catch (insertError: any) {
          // If duplicate key error (PostgreSQL error code 23505), try to update instead
          if (insertError.code === '23505') {
            console.log(`Duplicate key detected, updating instead of inserting for ${actualUsername}`)
            await connection.query(
              `UPDATE campaigns_result SET 
                saldo = $1, 
                spend = $2, 
                sales = $3, 
                impressions = $4, 
                clicks = $5, 
                ctr = $6, 
                conversions = $7, 
                roas = $8, 
                commission = $9
              WHERE username = $10`,
              [
                summaryData.adBalance,
                summaryData.totalSpend,
                summaryData.totalSales,
                summaryData.totalImpressions,
                summaryData.totalClicks,
                summaryData.averageCTR,
                summaryData.totalConversions,
                summaryData.averageROAS,
                summaryData.estCommission,
                actualUsername
              ]
            )
            console.log(`Updated campaigns_result for ${actualUsername} after duplicate key error`)
          } else {
            throw insertError
          }
        }
      }

      console.log('Final summary data saved to campaigns_result:', summaryData)

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
    console.error('Error updating campaigns result:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update campaigns result',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
