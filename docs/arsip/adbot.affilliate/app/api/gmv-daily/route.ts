import { NextResponse, NextRequest } from 'next/server'
import mysql from 'mysql2/promise'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'

// Function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  
  return cookies
    .replace(/[\r\n\t]+/g, ' ')  // Replace newlines, carriage returns, tabs with space
    .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
    .trim()                      // Remove leading/trailing spaces
}

// Function to call Shopee API untuk listsession - direct GET request
async function callShopeeListsessionAPI(cookies: string) {
  const cleanedCookies = cleanCookies(cookies)
  
  console.log('Calling listsession API directly to creator.shopee.co.id...')
  
  const response = await fetch('https://creator.shopee.co.id/supply/api/lm/sellercenter/realtime/sessionList?page=1&pageSize=100', {
    method: 'GET',
    headers: {
      'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
      'Cookie': cleanedCookies
    }
  })
  
  console.log('Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Error response:', errorText)
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  const result = await response.json()
  console.log('Listsession API Response:', JSON.stringify(result, null, 2))
  
  // Transform response to match expected format
  return {
    success: true,
    data: {
      list: result?.data?.list || []
    }
  }
}

// Function to get session data from Shopee API
async function getSessionData(cookies: string) {
  if (!cookies) {
    return []
  }
  
  try {
    console.log('Calling Shopee listsession API...')
    const sessionData = await callShopeeListsessionAPI(cookies)
    
    console.log('API Response received:', JSON.stringify(sessionData, null, 2))
    
    if (sessionData && sessionData.data && sessionData.data.list && Array.isArray(sessionData.data.list)) {
      // Filter sessions with status = 1
      const activeSessions = sessionData.data.list.filter((session: any) => session.status === 1)
      console.log(`Found ${activeSessions.length} active sessions (status=1)`)
      return activeSessions
    }
    
    return []
  } catch (error) {
    console.error('Error fetching session data from Shopee API:', error)
    return []
  }
}

// Function to get all accounts with cookies
async function getAccountsWithCookies(connection: mysql.Connection, accountIds?: string[]) {
  try {
    let query = `SELECT da.id_affiliate as id, da.username, da.email, da.cookies, da.kode_tim, dt.nama_tim, da.pic_akun 
                 FROM data_akun da 
                 LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
                 WHERE da.cookies IS NOT NULL AND da.cookies != ''`
    
    let params: any[] = []
    
    if (accountIds && accountIds.length > 0) {
      // Try both id_affiliate and username fields
      const placeholders = accountIds.map(() => '?').join(',')
      query += ` AND (da.id_affiliate IN (${placeholders}) OR da.username IN (${placeholders}))`
      params.push(...accountIds, ...accountIds) // Add accountIds twice for both fields
    }
    
    query += ` ORDER BY da.created_at DESC`
    
    console.log('Executing query:', query)
    console.log('With params:', params)
    
    const [rows] = await connection.execute(query, params) as [any[], any]
    console.log('Found accounts:', rows)
    return rows
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw error
  }
}

// Function to save GMV data to database with daily GMV calculation rules
async function saveGMVToDatabase(connection: mysql.Connection, gmvData: any[]) {
  try {
    console.log(`Processing ${gmvData.length} GMV records for database save`)
    
    for (const gmv of gmvData) {
      console.log(`Processing GMV for user: ${gmv.username}, session: ${gmv.sessionId}`)
      
      // Check if data already exists for this user and date
      const [existingData] = await connection.execute(
        `SELECT id, sessionid, gmv FROM data_gmv WHERE today = ? AND username = ?`,
        [gmv.today, gmv.username]
      ) as [any[], any]
      
      if (existingData.length > 0) {
        // Update existing record - check if sessionid is different
        const existingRecord = existingData[0]
        console.log(`Found existing data for user: ${gmv.username} (ID: ${existingRecord.id})`)
        console.log(`  Existing session: ${existingRecord.sessionid}`)
        console.log(`  New session: ${gmv.sessionId}`)
        console.log(`  Existing GMV: ${existingRecord.gmv}`)
        console.log(`  New GMV: ${gmv.gmv}`)
        
        if (existingRecord.sessionid !== gmv.sessionId) {
          // Different session - add GMV (Rule 2)
          const newGMV = existingRecord.gmv + gmv.gmv
          console.log(`  Different session detected - adding GMV: ${existingRecord.gmv} + ${gmv.gmv} = ${newGMV}`)
          
          await connection.execute(
            `UPDATE data_gmv SET sessionid = ?, gmv = ? WHERE id = ?`,
            [gmv.sessionId, newGMV, existingRecord.id]
          )
          console.log(`Successfully updated GMV for user: ${gmv.username} (added GMV)`)
        } else {
          // Same session - replace GMV
          console.log(`  Same session - replacing GMV`)
          await connection.execute(
            `UPDATE data_gmv SET gmv = ? WHERE id = ?`,
            [gmv.gmv, existingRecord.id]
          )
          console.log(`Successfully updated GMV for user: ${gmv.username} (replaced GMV)`)
        }
      } else {
        // Insert new record - check if same sessionid from yesterday (Rule 1)
        console.log(`No existing data for today - checking yesterday's data`)
        
        // Get yesterday's date
        const yesterday = new Date(gmv.today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        // Check if same sessionid exists yesterday
        const [yesterdayData] = await connection.execute(
          `SELECT id, gmv FROM data_gmv WHERE today = ? AND username = ? AND sessionid = ?`,
          [yesterdayStr, gmv.username, gmv.sessionId]
        ) as [any[], any]
        
        if (yesterdayData.length > 0) {
          // Same sessionid as yesterday - subtract yesterday's GMV (Rule 1)
          const yesterdayGMV = yesterdayData[0].gmv
          const newGMV = gmv.gmv - yesterdayGMV
          console.log(`  Same sessionid as yesterday detected`)
          console.log(`  Today's GMV: ${gmv.gmv}`)
          console.log(`  Yesterday's GMV: ${yesterdayGMV}`)
          console.log(`  Calculated GMV: ${gmv.gmv} - ${yesterdayGMV} = ${newGMV}`)
          
          await connection.execute(
            `INSERT INTO data_gmv (today, username, sessionid, gmv) VALUES (?, ?, ?, ?)`,
            [gmv.today, gmv.username, gmv.sessionId, newGMV]
          )
          console.log(`Successfully inserted new GMV for user: ${gmv.username} (subtracted yesterday's GMV)`)
        } else {
          // New session - insert as is
          console.log(`  New session - inserting GMV as is`)
          await connection.execute(
            `INSERT INTO data_gmv (today, username, sessionid, gmv) VALUES (?, ?, ?, ?)`,
            [gmv.today, gmv.username, gmv.sessionId, gmv.gmv]
          )
          console.log(`Successfully inserted new GMV for user: ${gmv.username} (new session)`)
        }
      }
    }
    console.log(`Completed processing all GMV records`)
  } catch (error) {
    console.error('Error saving GMV to database:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  // Authenticate user
  const user = requireAuth(request);
  let connection: mysql.Connection | null = null
  
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const accountIdsParam = searchParams.get('account_ids')
    const accountIds = accountIdsParam ? accountIdsParam.split(',').filter(id => id.trim()) : undefined
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    // Create database connection
    connection = await getDatabaseConnection()
    
    // Get accounts with cookies
    const accounts = await getAccountsWithCookies(connection, accountIds)
    console.log(`Found ${accounts.length} accounts with cookies`)
    
    // Get session data for all accounts
    const allGMVData: any[] = []
    
    for (const account of accounts) {
      if (account.cookies) {
        try {
          const sessions = await getSessionData(account.cookies)
          
          if (sessions && sessions.length > 0) {
            sessions.forEach((session: any) => {
              // Extract sessionId and confirmedSales from session data
              const sessionId = session.sessionId || session.session_id || 'N/A'
              const confirmedSales = session.confirmedSales || session.confirmed_sales || 0
              
              // Add GMV data to array
              allGMVData.push({
                today: todayString,
                username: account.username,
                sessionId: sessionId,
                gmv: confirmedSales
              })
            })
          }
        } catch (error) {
          console.error(`Error fetching session data for account ${account.username}:`, error)
          // Continue with other accounts even if one fails
        }
      }
    }
    
    // Save GMV data to database
    try {
      if (allGMVData.length > 0) {
        await saveGMVToDatabase(connection, allGMVData)
        console.log(`Successfully saved ${allGMVData.length} GMV records to database`)
      } else {
        console.log('No GMV data to save to database')
      }
    } catch (error) {
      console.error('Error saving GMV data to database:', error)
      // Don't fail the entire request if database save fails
    }
    
    return NextResponse.json({
      success: true,
      data: allGMVData,
      meta: {
        today: todayString,
        total_records: allGMVData.length,
        total_gmv: allGMVData.reduce((sum, gmv) => sum + gmv.gmv, 0),
        accounts_processed: accounts.length
      }
    })
    
  } catch (error) {
    console.error('Error in GMV daily API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch GMV data from Shopee API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    // Close database connection
    if (connection) {
      await connection.end()
    }
  }
}

// POST method untuk manual trigger
export async function POST(request: NextRequest) {
  // Authenticate user
  const user = requireAuth(request);
  return GET(request)
}
