import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { getRoleBasedFilter } from '@/lib/role-filter'
import { isDatabaseConnectionError, getGenericDatabaseErrorMessage, sanitizeErrorForLogging } from '@/lib/db-errors'

// Force dynamic rendering karena menggunakan request.headers
export const dynamic = 'force-dynamic'

// Function to call Shopee API get_ads_data for saldo iklan
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

    // Debug: log full response structure
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [Overview] callShopeeGetAdsData - Full API response:`, {
      hasCode: 'code' in data,
      code: data?.code,
      hasData: 'data' in data,
      hasAdsCredit: !!data?.data?.ads_credit,
      adsCreditTotal: data?.data?.ads_credit?.total,
      responseKeys: Object.keys(data || {})
    })

    // Response structure: { code: 0, data: { ads_credit: { total: ... } } }
    // Return the data object directly (which contains ads_credit)
    return {
      success: true,
      data: data?.data || data // data.data contains ads_credit, or fallback to data if already unwrapped
    }
  } catch (error: any) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [Overview] Error calling get_ads_data API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    console.error(`[${timestamp}] [Overview] Error message: ${error?.message || 'Unknown error'}`)
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${timestamp}] [Overview] Full error:`, error)
    }
    throw error
  }
}

// Function to get accounts with cookies for fetching saldo iklan
async function getAccountsWithCookies(connection: PoolClient, user: any, tokoIds: string[]) {
  try {
    if (tokoIds.length === 0) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [Overview] getAccountsWithCookies: No tokoIds provided`)
      return []
    }

    let paramIndex = 1

    // User isolation: Filter by user_id (unless admin/superadmin)
    let userFilter = ''
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      userFilter = ` AND dt.user_id = $${paramIndex++}`
    }

    // First, check what data exists for these tokoIds (for debugging)
    // Use separate parameter index for debug query
    let debugParamIndex = 1
    const debugPlaceholders = tokoIds.map(() => `$${debugParamIndex++}`).join(',')
    const debugQuery = `
      SELECT dt.id_toko, dt.nama_toko, dt.status_toko, dt.status_cookies,
             CASE 
               WHEN dt.cookies IS NULL THEN 'NULL'::text
               WHEN dt.cookies = '' THEN 'EMPTY'::text
               ELSE 'HAS_COOKIES'::text
             END as cookie_status,
             CASE 
               WHEN dt.cookies IS NULL THEN 0::integer
               ELSE LENGTH(dt.cookies::text)::integer
             END as cookie_length,
             dt.user_id
      FROM data_toko dt
      WHERE dt.id_toko IN (${debugPlaceholders})
    `
    const debugParams = [...tokoIds]
    const debugResult = await connection.query(debugQuery, debugParams)
    const debugTimestamp = new Date().toISOString()
    console.log(`[${debugTimestamp}] [Overview] getAccountsWithCookies - Debug query result:`, {
      tokoIds: tokoIds,
      foundRows: debugResult.rows.map(r => ({
        id_toko: r.id_toko,
        nama_toko: r.nama_toko,
        status_toko: r.status_toko,
        status_cookies: r.status_cookies,
        cookie_status: r.cookie_status,
        cookie_length: r.cookie_length,
        user_id: r.user_id,
        matchesUser: user.role === 'superadmin' || user.role === 'admin' || r.user_id === user.userId
      }))
    })

    // Now build the actual query with correct parameter index
    // IMPORTANT: user_id must be first ($1) if userFilter exists, then tokoIds
    const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
    const query = `
      SELECT dt.id_toko, dt.id_toko as username, dt.cookies as cookie_account, dt.nama_toko, dt.status_cookies
      FROM data_toko dt
      WHERE dt.id_toko IN (${placeholders})
      AND dt.cookies IS NOT NULL 
      AND dt.cookies != ''
      AND dt.status_toko = 'active'
      ${userFilter}
    `

    // Build params array in the correct order: user_id first (if needed), then tokoIds
    const params: any[] = []
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      params.push(user.userId) // $1 = user_id
    }
    params.push(...tokoIds) // $2, $3, $4, etc. = tokoIds

    console.log(`[${debugTimestamp}] [Overview] getAccountsWithCookies - Query:`, query)
    console.log(`[${debugTimestamp}] [Overview] getAccountsWithCookies - Params:`, params)

    const result = await connection.query(query, params)
    const rows = result.rows

    // Log untuk debugging
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [Overview] getAccountsWithCookies: Found ${rows.length} account(s)`, {
      tokoIdsCount: tokoIds.length,
      tokoIds: tokoIds.slice(0, 5), // Log first 5 only
      accountsFound: rows.map(r => ({
        id_toko: r.id_toko,
        nama_toko: r.nama_toko,
        hasCookies: !!r.cookie_account && r.cookie_account.length > 0,
        cookiesLength: r.cookie_account ? r.cookie_account.length : 0,
        status_cookies: r.status_cookies
      }))
    })

    return rows
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error fetching accounts: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    throw error
  }
}

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null
  const timestamp = new Date().toISOString()

  try {
    // Authenticate user and check active status
    const user = await requireActiveStatus(request);
    console.log(`[${timestamp}] [Overview] User authenticated:`, {
      userId: user.userId,
      username: user.username,
      role: user.role,
      userIdType: typeof user.userId
    })

    // Get database connection first (needed for user_id conversion if needed)
    console.log(`[${timestamp}] [Overview] Getting database connection...`)
    try {
      connection = await getDatabaseConnection()
      console.log(`[${timestamp}] [Overview] Database connection established`)
    } catch (dbError) {
      const errorTimestamp = new Date().toISOString()
      if (isDatabaseConnectionError(dbError)) {
        const sanitized = sanitizeErrorForLogging(dbError)
        console.error(`[${errorTimestamp}] [Overview] Database connection error: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

        // Log detailed error in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`[${errorTimestamp}] [Overview] Database connection error details:`, {
            message: (dbError as any)?.message,
            code: (dbError as any)?.code,
            name: (dbError as any)?.name
          })
        }

        return NextResponse.json(
          {
            success: false,
            error: getGenericDatabaseErrorMessage(),
          },
          { status: 503 }
        )
      }
      throw dbError
    }

    // Get role-based filter (same as accounts API)
    const roleFilter = getRoleBasedFilter(user);
    console.log(`[${timestamp}] [Overview] Role filter:`, {
      role: user.role,
      whereClause: roleFilter.whereClause,
      paramsCount: roleFilter.params.length
    })

    // Get allowed usernames based on role (for backward compatibility)
    let allowedUsernames: string[] = []
    try {
      allowedUsernames = await getAllowedUsernames(user);
      console.log(`[${timestamp}] [Overview] Allowed usernames:`, allowedUsernames, `(count: ${allowedUsernames.length})`)
    } catch (allowedError) {
      console.error(`[${timestamp}] [Overview] Error getting allowed usernames:`, {
        message: (allowedError as any)?.message,
        code: (allowedError as any)?.code,
        stack: (allowedError as any)?.stack
      })
      // Don't throw, continue with role-based filter
    }

    const { searchParams } = new URL(request.url)
    const selectedAccount = searchParams.get('account') || 'all'
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    // Parse date range parameters
    let startDateStr: string | null = null
    let endDateStr: string | null = null

    if (startDateParam) {
      startDateStr = startDateParam
    }
    if (endDateParam) {
      endDateStr = endDateParam
    }

    // If no date range provided, use latest available date (backward compatibility)
    let useDateRange = false
    if (startDateStr && endDateStr) {
      useDateRange = true
    }

    // 1. Ambil semua id_toko dari data_toko untuk dropdown (same logic as accounts API)
    // Menggunakan role-based filter untuk konsistensi dengan accounts page
    let tokoQuery = `SELECT DISTINCT dt.id_toko, dt.nama_toko
       FROM data_toko dt
       WHERE dt.id_toko IS NOT NULL AND dt.id_toko != '' 
       AND dt.status_toko = 'active'`

    let usernameParams: any[] = []
    let paramIndex = 1

    // Apply role-based filter (same as accounts API)
    if (roleFilter.whereClause) {
      // Remove 'AND' prefix if exists
      let roleFilterClause = roleFilter.whereClause.startsWith('AND ')
        ? roleFilter.whereClause.substring(4)
        : roleFilter.whereClause;

      // Replace ? with $1, $2, etc. for PostgreSQL
      roleFilter.params.forEach((param) => {
        roleFilterClause = roleFilterClause.replace('?', `$${paramIndex++}`)
      })

      tokoQuery += ` AND ${roleFilterClause}`
      usernameParams.push(...roleFilter.params)
    }

    // Also filter by allowedUsernames if available (for backward compatibility)
    if (user.role !== 'superadmin' && allowedUsernames.length > 0) {
      const placeholders = allowedUsernames.map(() => `$${paramIndex++}`).join(',')
      tokoQuery += ` AND dt.id_toko IN (${placeholders})`
      usernameParams.push(...allowedUsernames)
    }

    tokoQuery += ` ORDER BY dt.nama_toko ASC`

    console.log(`[${timestamp}] [Overview] Fetching toko list with query params:`, usernameParams)
    const tokoResult = await connection.query(tokoQuery, usernameParams)
    const tokoRows = tokoResult.rows
    console.log(`[${timestamp}] [Overview] Found ${tokoRows.length} toko(s)`)

    // Get toko IDs from the toko list we just fetched
    const tokoIds = tokoRows.map((row: any) => row.id_toko).filter((id: string) => id)
    console.log(`[${timestamp}] [Overview] Extracted ${tokoIds.length} tokoIds:`, tokoIds.slice(0, 10)) // Log first 10 only

    // Get the latest available report_date from data_produk
    // This ensures we always show real data, even if today's data doesn't exist yet
    // Use the same toko IDs from the toko list we just fetched
    let latestDateQuery = `SELECT MAX(CAST(report_date AS DATE)) as latest_date FROM data_produk dp
       INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko
       WHERE dp.id_toko IS NOT NULL AND dp.id_toko != '' 
       AND dt.status_toko = 'active'`
    let latestDateParams: any[] = []
    let latestDateParamIndex = 1

    // Filter berdasarkan toko IDs yang sudah difilter
    if (tokoIds.length > 0) {
      const placeholders = tokoIds.map(() => `$${latestDateParamIndex++}`).join(',')
      latestDateQuery += ` AND dp.id_toko IN (${placeholders})`
      latestDateParams.push(...tokoIds)
    } else {
      // If no toko found, use role-based filter
      if (roleFilter.whereClause) {
        let roleFilterClause = roleFilter.whereClause.startsWith('AND ')
          ? roleFilter.whereClause.substring(4)
          : roleFilter.whereClause;

        roleFilter.params.forEach((param) => {
          roleFilterClause = roleFilterClause.replace('?', `$${latestDateParamIndex++}`)
        })

        latestDateQuery += ` AND ${roleFilterClause}`
        latestDateParams.push(...roleFilter.params)
      }
    }

    const latestDateResult = await connection.query(latestDateQuery, latestDateParams)
    let latestDateStr = latestDateResult.rows[0]?.latest_date

    // Format date to YYYY-MM-DD if it's a Date object
    if (latestDateStr instanceof Date) {
      latestDateStr = latestDateStr.toISOString().split('T')[0]
    } else if (latestDateStr) {
      // Ensure it's in YYYY-MM-DD format
      latestDateStr = String(latestDateStr).split('T')[0]
    } else {
      // Fallback to today if no data found
      latestDateStr = new Date().toISOString().split('T')[0]
    }

    // Determine date range to use
    let reportDateStr: string
    let reportStartDateStr: string | null = null
    let reportEndDateStr: string | null = null

    if (useDateRange && startDateStr && endDateStr) {
      // Use provided date range
      reportStartDateStr = startDateStr
      reportEndDateStr = endDateStr
      reportDateStr = endDateStr // For backward compatibility in some queries
    } else {
      // Use latest available date for main query
      reportDateStr = latestDateStr
      reportStartDateStr = latestDateStr
      reportEndDateStr = latestDateStr
    }

    console.log(`[${timestamp}] [Overview] Using date range: ${reportStartDateStr} to ${reportEndDateStr}`)
    console.log(`[${timestamp}] [Overview] Allowed usernames count: ${allowedUsernames.length}`)
    console.log(`[${timestamp}] [Overview] User role: ${user.role}`)

    // Yesterday for trend comparison (based on latest date)
    const reportDate = new Date(reportDateStr)
    const yesterday = new Date(reportDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Today's date for comparison
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Map id_toko ke nama_toko untuk dropdown (value tetap id_toko, label nama_toko)
    // Kembalikan array objek dengan id_toko dan nama_toko untuk frontend
    const usernames = (tokoRows || []).map((row: any) => ({
      id_toko: row.id_toko,
      nama_toko: row.nama_toko || row.id_toko
    }))

    // Buat mapping id_toko -> nama_toko untuk digunakan nanti
    const tokoNameMap = new Map<string, string>()
    tokoRows.forEach((row: any) => {
      tokoNameMap.set(row.id_toko, row.nama_toko || row.id_toko)
    })

    // 2. Hitung total per id_toko (untuk Account Status) - Use date range or single date
    // Ambil juga nama_toko dari data_toko
    // Mengambil semua data tanpa filter status untuk mendapatkan data real
    let query = `SELECT 
        dp.id_toko,
        dt.nama_toko,
        COUNT(DISTINCT dp.campaign_id) as campaign_count,
        COALESCE(SUM(dp.report_cost), 0) as total_spend,
        COALESCE(SUM(dp.daily_budget), 0) as total_budget,
        COALESCE(SUM(dp.report_impression), 0) as total_impressions,
        COALESCE(SUM(dp.report_click), 0) as total_clicks,
        COALESCE(SUM(dp.report_broad_order), 0) as total_pesanan,
        COALESCE(SUM(dp.report_broad_gmv), 0) as total_gmv
       FROM data_produk dp
       INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko
       WHERE dp.id_toko IS NOT NULL AND dp.id_toko != '' 
       AND dt.status_toko = 'active'`

    const queryParams: any[] = []
    paramIndex = 1

    // Add date filter (cast report_date to DATE if it's VARCHAR)
    // Note: report_date is VARCHAR, so we need to cast both sides
    if (useDateRange && reportStartDateStr && reportEndDateStr) {
      query += ` AND CAST(dp.report_date AS DATE) >= CAST($${paramIndex++} AS DATE) AND CAST(dp.report_date AS DATE) <= CAST($${paramIndex++} AS DATE)`
      queryParams.push(reportStartDateStr, reportEndDateStr)
    } else {
      query += ` AND CAST(dp.report_date AS DATE) = CAST($${paramIndex++} AS DATE)`
      queryParams.push(reportDateStr)
    }

    // Filter berdasarkan toko IDs yang sudah difilter (from data_toko)
    if (tokoIds.length > 0) {
      const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
      query += ` AND dp.id_toko IN (${placeholders})`
      queryParams.push(...tokoIds)
    } else {
      // If no toko found, apply role-based filter directly
      if (roleFilter.whereClause) {
        let roleFilterClause = roleFilter.whereClause.startsWith('AND ')
          ? roleFilter.whereClause.substring(4)
          : roleFilter.whereClause;

        // Need to join with data_toko for role filter
        // Replace $1, $2, etc. in roleFilterClause with correct paramIndex
        // roleFilterClause already contains $1, so we need to replace it with the correct index
        roleFilter.params.forEach((param, idx) => {
          // Replace $1, $2, etc. with the correct paramIndex (use regex for global replace)
          const oldParam = `\\$${idx + 1}\\b` // \b for word boundary to avoid replacing $10 when looking for $1
          const newParam = `$${paramIndex++}`
          roleFilterClause = roleFilterClause.replace(new RegExp(oldParam, 'g'), newParam)
        })

        query += ` AND ${roleFilterClause.replace('dt.', 'dt2.')}`
        // Add another join for role filter
        query = query.replace('FROM data_produk dp', 'FROM data_produk dp')
        query = query.replace('INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko',
          'INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko INNER JOIN data_toko dt2 ON dp.id_toko = dt2.id_toko')
        queryParams.push(...roleFilter.params)
      } else {
        // No filter and no toko, return empty
        return NextResponse.json({
          success: true,
          data: {
            accounts: [],
            usernames: [],
            totals: {},
            averages: {},
            recentActivities: [],
            trends: {}
          }
        });
      }
    }

    // Tambahkan filter id_toko jika account dipilih (bukan "all")
    if (selectedAccount && selectedAccount !== 'all') {
      query += ` AND dp.id_toko = $${paramIndex++}`
      queryParams.push(selectedAccount)
    }

    query += ` GROUP BY dp.id_toko, dt.nama_toko ORDER BY COALESCE(SUM(dp.report_broad_gmv), 0) DESC`

    console.log(`[${timestamp}] [Overview] Executing query with report_date: ${reportDateStr}`)
    console.log(`[${timestamp}] [Overview] Query:`, query)
    console.log(`[${timestamp}] [Overview] Params:`, queryParams)
    const campaignResult = await connection.query(query, queryParams)
    const campaignRows = campaignResult.rows
    console.log(`[${timestamp}] [Overview] Query returned ${campaignRows.length} rows`)

    // If no data found for the latest date, try to get data from last 7 days (aggregate)
    if (campaignRows.length === 0) {
      console.log(`[${timestamp}] [Overview] No data found for ${reportDateStr}, trying to get data from last 7 days...`)
      const sevenDaysAgo = new Date(reportDate)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      let fallbackQuery = `SELECT 
          dp.id_toko,
          dt.nama_toko,
          COUNT(DISTINCT dp.campaign_id) as campaign_count,
          COALESCE(SUM(dp.report_cost), 0) as total_spend,
          COALESCE(SUM(dp.daily_budget), 0) as total_budget,
          COALESCE(SUM(dp.report_impression), 0) as total_impressions,
          COALESCE(SUM(dp.report_click), 0) as total_clicks,
          COALESCE(SUM(dp.report_broad_order), 0) as total_pesanan,
          COALESCE(SUM(dp.report_broad_gmv), 0) as total_gmv
         FROM data_produk dp
         INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko
         WHERE dp.id_toko IS NOT NULL AND dp.id_toko != '' 
         AND dt.status_toko = 'active'
         AND CAST(dp.report_date AS DATE) >= CAST($1 AS DATE) AND CAST(dp.report_date AS DATE) <= CAST($2 AS DATE)`

      const fallbackParams: any[] = [sevenDaysAgoStr, reportDateStr]
      let fallbackParamIndex = 3

      // Use tokoIds for fallback query
      if (tokoIds.length > 0) {
        const placeholders = tokoIds.map(() => `$${fallbackParamIndex++}`).join(',')
        fallbackQuery += ` AND dp.id_toko IN (${placeholders})`
        fallbackParams.push(...tokoIds)
      } else if (roleFilter.whereClause) {
        // Apply role-based filter if no tokoIds
        let roleFilterClause = roleFilter.whereClause.startsWith('AND ')
          ? roleFilter.whereClause.substring(4)
          : roleFilter.whereClause;

        // Replace $1, $2, etc. in roleFilterClause with correct paramIndex
        // roleFilterClause already contains $1, so we need to replace it with the correct index
        roleFilter.params.forEach((param, idx) => {
          // Replace $1, $2, etc. with the correct paramIndex (use regex for global replace)
          const oldParam = `\\$${idx + 1}\\b` // \b for word boundary to avoid replacing $10 when looking for $1
          const newParam = `$${fallbackParamIndex++}`
          roleFilterClause = roleFilterClause.replace(new RegExp(oldParam, 'g'), newParam)
        })

        fallbackQuery += ` AND ${roleFilterClause.replace('dt.', 'dt2.')}`
        fallbackQuery = fallbackQuery.replace('INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko',
          'INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko INNER JOIN data_toko dt2 ON dp.id_toko = dt2.id_toko')
        fallbackParams.push(...roleFilter.params)
      }

      if (selectedAccount && selectedAccount !== 'all') {
        fallbackQuery += ` AND dp.id_toko = $${fallbackParamIndex++}`
        fallbackParams.push(selectedAccount)
      }

      fallbackQuery += ` GROUP BY dp.id_toko, dt.nama_toko ORDER BY COALESCE(SUM(dp.report_broad_gmv), 0) DESC`

      const fallbackResult = await connection.query(fallbackQuery, fallbackParams)
      const fallbackRows = fallbackResult.rows
      console.log(`[${timestamp}] [Overview] Fallback query returned ${fallbackRows.length} rows`)

      if (fallbackRows.length > 0) {
        // Use fallback data
        campaignRows.push(...fallbackRows)
      }
    }

    // 3a. Jika akun dipilih (bukan "all"), ambil data campaign active untuk ditampilkan di Account Status
    let activeCampaigns: any[] = []
    if (selectedAccount && selectedAccount !== 'all') {
      // Validate that selectedAccount is in tokoIds (or allow if superadmin)
      if (user.role !== 'superadmin' && tokoIds.length > 0 && !tokoIds.includes(selectedAccount)) {
        return NextResponse.json({
          success: false,
          error: 'Access denied to this account'
        }, { status: 403 });
      }

      // Validate that selectedAccount has active status_toko
      const accountStatusCheck = await connection.query(
        `SELECT id_toko, status_toko, status_cookies FROM data_toko WHERE id_toko = $1`,
        [selectedAccount]
      )

      if (accountStatusCheck.rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Account not found'
        }, { status: 404 });
      }

      const accountStatus = accountStatusCheck.rows[0].status_cookies
      if (!accountStatus || accountStatus.toLowerCase() !== 'aktif') {
        return NextResponse.json({
          success: false,
          error: 'Account does not have active cookies status'
        }, { status: 403 });
      }

      // Ambil data campaign dari data_produk untuk tanggal terbaru yang tersedia
      // Mengambil semua data tanpa filter status untuk mendapatkan data real
      let campaignDetailQuery = `SELECT 
          dp.campaign_id,
          dp.title as campaign_name,
          dp.status,
          COALESCE(dp.report_cost, 0) as total_spend,
          COALESCE(dp.daily_budget, 0) as daily_budget,
          COALESCE(dp.report_impression, 0) as impression,
          COALESCE(dp.report_click, 0) as view,
          COALESCE(dp.report_broad_order, 0) as broad_order,
          COALESCE(dp.report_broad_gmv, 0) as broad_gmv
         FROM data_produk dp
         INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko
         WHERE dp.id_toko = $1 
         AND dt.status_cookies = 'aktif'`

      const campaignDetailParams: any[] = [selectedAccount]
      let campaignDetailParamIndex = 2

      // Add date filter (cast report_date to DATE if it's VARCHAR)
      // Note: report_date is VARCHAR, so we need to cast both sides
      if (useDateRange && reportStartDateStr && reportEndDateStr) {
        campaignDetailQuery += ` AND CAST(dp.report_date AS DATE) >= CAST($${campaignDetailParamIndex++} AS DATE) AND CAST(dp.report_date AS DATE) <= CAST($${campaignDetailParamIndex++} AS DATE)`
        campaignDetailParams.push(reportStartDateStr, reportEndDateStr)
      } else {
        campaignDetailQuery += ` AND CAST(dp.report_date AS DATE) = CAST($${campaignDetailParamIndex++} AS DATE)`
        campaignDetailParams.push(reportDateStr)
      }

      campaignDetailQuery += ` ORDER BY COALESCE(dp.report_broad_gmv, 0) DESC, dp.campaign_id DESC`

      const campaignDetailResult = await connection.query(campaignDetailQuery, campaignDetailParams)
      const campaignDetailRows = campaignDetailResult.rows

      activeCampaigns = (campaignDetailRows || []).map((row: any) => {
        const spend = Number(row.total_spend) || 0
        const gmv = Number(row.broad_gmv) || 0
        const roas = spend > 0 && gmv > 0 ? gmv / spend : 0
        // Determine status: if status is 'ongoing' or null/empty, consider it active
        const isActive = !row.status || row.status === 'ongoing' || row.status === 'active'

        return {
          accountName: row.campaign_name || `Campaign ${row.campaign_id}`,
          status: isActive ? 'active' : 'paused',
          spend,
          gmv,
          budget: Number(row.daily_budget) || 0,
          impressions: Number(row.impression) || 0,
          clicks: Number(row.view) || 0,
          pesanan: Number(row.broad_order) || 0,
          conversions: Number(row.broad_order) || 0, // Conversions = jumlah order, bukan GMV
          roas: Number(roas.toFixed(1)),
          activeCampaigns: 1,
          activeRules: 0
        }
      })

      // Sort activeCampaigns by GMV descending
      activeCampaigns.sort((a, b) => (b.gmv || 0) - (a.gmv || 0))
    }

    // 3b. Build account metrics (per username) untuk "All Accounts"
    // Data sudah di-sort berdasarkan total_gmv DESC dari query
    const accountMetrics = campaignRows.map((row: any) => {
      const spend = Number(row.total_spend) || 0
      const budget = Number(row.total_budget) || 0
      const impressions = Number(row.total_impressions) || 0
      const clicks = Number(row.total_clicks) || 0
      const pesanan = Number(row.total_pesanan) || 0
      const gmv = Number(row.total_gmv) || 0

      // Calculate ROAS: (GMV / Spend)
      const roas = spend > 0 && gmv > 0 ? gmv / spend : 0

      // Status: default active untuk semua account dari campaigns table
      const status: "active" | "paused" | "error" = "active"

      // Gunakan nama_toko dari data_toko, fallback ke id_toko jika tidak ada
      const accountName = row.nama_toko || row.id_toko || 'Unknown'

      return {
        accountName: accountName,
        status,
        spend,
        gmv, // Tambahkan GMV untuk ditampilkan di frontend
        budget,
        impressions,
        clicks,
        pesanan,
        conversions: pesanan, // Conversions = jumlah order (pesanan), bukan GMV
        roas: Number(roas.toFixed(1)),
        activeCampaigns: Number(row.campaign_count) || 0,
        activeRules: 0
      }
    })

    // 4. Get saldo iklan from Shopee API (not from database daily_budget)
    let totalSaldoIklan = 0
    try {
      console.log(`[${timestamp}] [Overview] Getting accounts with cookies for ${tokoIds.length} toko(s)`)
      const accountsWithCookies = await getAccountsWithCookies(connection, user, tokoIds)
      console.log(`[${timestamp}] [Overview] Found ${accountsWithCookies.length} account(s) with cookies`)

      if (accountsWithCookies.length === 0) {
        console.log(`[${timestamp}] [Overview] No accounts with cookies found. Saldo iklan will be 0.`)
      } else {
        for (const account of accountsWithCookies) {
          try {
            console.log(`[${timestamp}] [Overview] Fetching saldo for account: ${account.username} (${account.nama_toko || 'N/A'})`)
            console.log(`[${timestamp}] [Overview] ${account.username} - Cookie length: ${account.cookie_account?.length || 0} chars`)

            const adsData = await callShopeeGetAdsData(account.cookie_account)

            // Debug: log response structure
            console.log(`[${timestamp}] [Overview] ${account.username} - Processed Response structure:`, {
              hasData: !!adsData.data,
              hasAdsCredit: !!adsData.data?.ads_credit,
              adsCreditTotal: adsData.data?.ads_credit?.total,
              adsCreditTotalType: typeof adsData.data?.ads_credit?.total,
              adsCreditKeys: adsData.data?.ads_credit ? Object.keys(adsData.data.ads_credit) : [],
              fullAdsCredit: adsData.data?.ads_credit ? JSON.stringify(adsData.data.ads_credit).substring(0, 200) : 'null'
            })

            // Get saldo iklan dari ads_credit.total (dibagi 100000)
            const totalValue = adsData.data?.ads_credit?.total
            if (totalValue !== null && totalValue !== undefined && totalValue !== 0) {
              const adBalance = Number(totalValue) / 100000
              totalSaldoIklan += adBalance
              console.log(`[${timestamp}] [Overview] ✓ ${account.username} - Saldo: Rp${adBalance.toLocaleString('id-ID')} (from ${totalValue}), Total: Rp${totalSaldoIklan.toLocaleString('id-ID')}`)
            } else {
              console.log(`[${timestamp}] [Overview] ✗ ${account.username} - No saldo data found. totalValue: ${totalValue} (type: ${typeof totalValue})`)
            }
          } catch (saldoError: any) {
            const sanitized = sanitizeErrorForLogging(saldoError)
            console.error(`[${timestamp}] [Overview] ✗ Error fetching saldo for ${account.username}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
            console.error(`[${timestamp}] [Overview] Error message: ${saldoError?.message || 'Unknown error'}`)
            if (process.env.NODE_ENV === 'development') {
              console.error(`[${timestamp}] [Overview] Full error:`, saldoError)
            }
            // Continue with other accounts even if one fails
          }
        }
      }
      console.log(`[${timestamp}] [Overview] Final total saldo iklan: Rp${totalSaldoIklan.toLocaleString('id-ID')}`)
    } catch (saldoError) {
      const sanitized = sanitizeErrorForLogging(saldoError)
      console.error(`[${timestamp}] [Overview] Error fetching saldo iklan: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
      if (process.env.NODE_ENV === 'development') {
        console.error(`[${timestamp}] [Overview] Error details:`, saldoError)
      }
      // Continue with totalMetrics calculation even if saldo fetch fails
    }

    // 5. Hitung totals untuk summary cards (using saldo iklan from Shopee API)
    const totalMetrics = accountMetrics.reduce(
      (acc, account) => ({
        spend: acc.spend + account.spend,
        budget: totalSaldoIklan, // Use saldo iklan from Shopee API instead of database
        impressions: acc.impressions + account.impressions,
        clicks: acc.clicks + account.clicks,
        pesanan: acc.pesanan + account.pesanan,
        conversions: acc.conversions + account.conversions,
        campaigns: acc.campaigns + account.activeCampaigns,
        rules: 0,
        gmv: acc.gmv + account.gmv
      }),
      { spend: 0, budget: totalSaldoIklan, impressions: 0, clicks: 0, pesanan: 0, conversions: 0, campaigns: 0, rules: 0, gmv: 0 }
    )

    // 5. Calculate trends - compare with yesterday
    let trends: { spend?: number; impressions?: number; clicks?: number; conversions?: number } = {}

    try {
      // Get yesterday's totals for comparison (based on latest report date)
      // Mengambil semua data tanpa filter status untuk mendapatkan data real
      let yesterdayQuery = `SELECT 
        COALESCE(SUM(dp.report_cost), 0) as total_spend,
        COALESCE(SUM(dp.report_impression), 0) as total_impressions,
        COALESCE(SUM(dp.report_click), 0) as total_clicks,
        COALESCE(SUM(dp.report_broad_order), 0) as total_orders
       FROM data_produk dp
       INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko
       WHERE dp.id_toko IS NOT NULL AND dp.id_toko != '' 
       AND dt.status_toko = 'active'
       AND CAST(dp.report_date AS DATE) = CAST($1 AS DATE)`

      const yesterdayParams: any[] = [yesterdayStr]
      let yesterdayParamIndex = 2

      // Apply same filters as main query (use tokoIds)
      if (tokoIds.length > 0) {
        const placeholders = tokoIds.map(() => `$${yesterdayParamIndex++}`).join(',')
        yesterdayQuery += ` AND dp.id_toko IN (${placeholders})`
        yesterdayParams.push(...tokoIds)
      } else if (roleFilter.whereClause) {
        // Apply role-based filter if no tokoIds
        let roleFilterClause = roleFilter.whereClause.startsWith('AND ')
          ? roleFilter.whereClause.substring(4)
          : roleFilter.whereClause;

        // Replace $1, $2, etc. in roleFilterClause with correct paramIndex
        // roleFilterClause already contains $1, so we need to replace it with the correct index
        roleFilter.params.forEach((param, idx) => {
          // Replace $1, $2, etc. with the correct paramIndex (use regex for global replace)
          const oldParam = `\\$${idx + 1}\\b` // \b for word boundary to avoid replacing $10 when looking for $1
          const newParam = `$${yesterdayParamIndex++}`
          roleFilterClause = roleFilterClause.replace(new RegExp(oldParam, 'g'), newParam)
        })

        yesterdayQuery += ` AND ${roleFilterClause.replace('dt.', 'dt2.')}`
        yesterdayQuery = yesterdayQuery.replace('INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko',
          'INNER JOIN data_toko dt ON dp.id_toko = dt.id_toko INNER JOIN data_toko dt2 ON dp.id_toko = dt2.id_toko')
        yesterdayParams.push(...roleFilter.params)
      }

      if (selectedAccount && selectedAccount !== 'all') {
        yesterdayQuery += ` AND dp.id_toko = $${yesterdayParamIndex++}`
        yesterdayParams.push(selectedAccount)
      }

      const yesterdayResult = await connection.query(yesterdayQuery, yesterdayParams)
      const yesterdayRow = yesterdayResult.rows[0]

      if (yesterdayRow) {
        const yesterdaySpend = Number(yesterdayRow.total_spend) || 0
        const yesterdayImpressions = Number(yesterdayRow.total_impressions) || 0
        const yesterdayClicks = Number(yesterdayRow.total_clicks) || 0
        const yesterdayOrders = Number(yesterdayRow.total_orders) || 0

        // Only include trends if yesterday data exists
        if (yesterdaySpend > 0) trends.spend = yesterdaySpend
        if (yesterdayImpressions > 0) trends.impressions = yesterdayImpressions
        if (yesterdayClicks > 0) trends.clicks = yesterdayClicks
        if (yesterdayOrders > 0) trends.conversions = yesterdayOrders // Conversions = jumlah order
      }
    } catch (trendError) {
      // If trend calculation fails, just continue without trends
      console.error('Error calculating trends:', trendError)
    }

    // 6. Hitung untuk Performance Overview
    const totalPesanan = totalMetrics.pesanan
    const avgROAS = accountMetrics.length > 0
      ? accountMetrics.reduce((sum, acc) => sum + acc.roas, 0) / accountMetrics.length
      : 0
    const totalActiveCampaigns = totalMetrics.campaigns

    // Get user_id (VARCHAR) - handle both old token format (number) and new format (string)
    let userId: string = ''
    if (typeof user.userId === 'string') {
      userId = user.userId
    } else if (typeof user.userId === 'number' && connection) {
      // Old format: no (INTEGER) - need to query user_id from database
      console.log(`[${timestamp}] [Overview] Old token format detected (number), querying user_id from database...`)
      const userNo = user.userId
      const userResult = await connection.query(
        'SELECT user_id FROM data_user WHERE no = $1',
        [userNo]
      )
      if (userResult.rows && userResult.rows.length > 0) {
        userId = userResult.rows[0].user_id
        console.log(`[${timestamp}] [Overview] Converted user_id from no:`, { no: userNo, user_id: userId })
      }
    }

    // Fetch automation rules count - filter by user_id if not admin/superadmin
    let ruleQuery = `SELECT COUNT(DISTINCT dr.rule_id) as rule_count
       FROM data_rules dr
       WHERE dr.status = 'active'`
    const ruleParams: any[] = []
    let ruleParamIndex = 1

    if (user.role !== 'superadmin' && user.role !== 'admin' && userId) {
      ruleQuery += ` AND dr.user_id = $${ruleParamIndex++}`
      ruleParams.push(userId)
    }

    const ruleResult = await connection.query(ruleQuery, ruleParams)
    const ruleRows = ruleResult.rows
    const totalActiveRules = Number(ruleRows[0]?.rule_count) || 0


    // 8. Fetch Recent Automation Activity - filter by user_id if not admin/superadmin
    let activityQuery = `SELECT 
        dr.rule_id,
        dr.name as rule_name,
        dr.status,
        dr.triggers,
        dr.success_rate,
        dr.error_count,
        dr.actions,
        dr.update_at
       FROM data_rules dr
       WHERE dr.status = 'active'`
    const activityParams: any[] = []
    let activityParamIndex = 1

    if (user.role !== 'superadmin' && user.role !== 'admin' && userId) {
      activityQuery += ` AND dr.user_id = $${activityParamIndex++}`
      activityParams.push(userId)
    }

    activityQuery += ` ORDER BY dr.update_at DESC LIMIT 3`

    const activityResult = await connection.query(activityQuery, activityParams)
    const activityRows = activityResult.rows

    // Format recent activities
    const recentActivities = (activityRows || []).map((row: any) => {
      const lastUpdate = row.update_at ? new Date(row.update_at) : null
      const now = new Date()

      let timeAgo = ''
      if (lastUpdate) {
        const diffMs = now.getTime() - lastUpdate.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 60) {
          timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
        } else if (diffHours < 24) {
          timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
        } else {
          timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
        }
      }

      let actionText = 'Rule executed'
      let campaignText = row.rule_name || 'Automation Rule'

      try {
        if (row.actions) {
          const actions = JSON.parse(row.actions)
          if (Array.isArray(actions) && actions.length > 0) {
            const firstAction = actions[0]
            if (firstAction.type) {
              switch (firstAction.type) {
                case 'pause_campaign':
                  actionText = 'Campaign paused'
                  break
                case 'increase_budget':
                  actionText = `Budget increased by ${firstAction.value || ''}%`
                  break
                case 'decrease_budget':
                  actionText = `Budget decreased by ${firstAction.value || ''}%`
                  break
                case 'duplicate_campaign':
                  actionText = 'Campaign duplicated'
                  break
                case 'send_notification':
                  actionText = 'Notification sent'
                  break
                default:
                  actionText = 'Rule executed'
              }
            }
          }
        }
      } catch (e) {
        // If parsing fails, use default
      }

      let status = 'success'
      if (row.error_count > 0) {
        status = 'warning'
      } else if (row.success_rate < 50) {
        status = 'warning'
      }

      return {
        time: timeAgo || 'Recently',
        action: actionText,
        campaign: campaignText,
        status: status
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        accounts: selectedAccount && selectedAccount !== 'all' ? activeCampaigns : accountMetrics,
        usernames,
        isAccountSelected: selectedAccount && selectedAccount !== 'all',
        reportDate: reportDateStr, // Include the date being used for the data
        totals: {
          spend: totalMetrics.spend,
          spendWithPPN: totalMetrics.spend,
          budget: totalMetrics.budget,
          impressions: totalMetrics.impressions,
          clicks: totalMetrics.clicks,
          conversions: totalMetrics.conversions,
          pesanan: totalMetrics.pesanan,
          campaigns: totalMetrics.campaigns,
          rules: totalActiveRules,
          gmv: totalMetrics.gmv
        },
        averages: {
          pesanan: totalPesanan,
          roas: avgROAS,
          activeCampaigns: totalActiveCampaigns
        },
        recentActivities: recentActivities,
        trends: trends
      }
    })

  } catch (error) {
    const errorTimestamp = new Date().toISOString()
    const sanitized = sanitizeErrorForLogging(error)

    // Log comprehensive error information
    const errorDetails = {
      type: sanitized.type,
      code: (error as any)?.code || sanitized.code,
      message: (error as any)?.message,
      name: (error as any)?.name,
      detail: (error as any)?.detail,
      hint: (error as any)?.hint,
      stack: process.env.NODE_ENV === 'development' ? (error as any)?.stack : undefined
    }

    // Handle specific auth/payment errors without 500 log noise
    if ((error as any)?.message && ((error as any).message.includes('Access denied') || (error as any).message.includes('Payment required'))) {
      return NextResponse.json({ success: false, error: (error as any).message }, { status: 402 })
    }

    console.error(`[${errorTimestamp}] [Overview] Error fetching overview:`, errorDetails)

    // Check if database connection error
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: getGenericDatabaseErrorMessage(),
          ...(process.env.NODE_ENV === 'development' && {
            errorDetails: {
              type: errorDetails.type,
              code: errorDetails.code,
              message: errorDetails.message
            }
          })
        },
        { status: 503 }
      )
    }

    // Other errors
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan saat memuat data overview. Silakan coba lagi.',
        ...(process.env.NODE_ENV === 'development' && {
          errorDetails: {
            type: errorDetails.type,
            code: errorDetails.code,
            message: errorDetails.message
          }
        })
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      try {
        connection.release()
        console.log(`[${new Date().toISOString()}] [Overview] Database connection released`)
      } catch (releaseError) {
        console.error(`[${new Date().toISOString()}] [Overview] Error releasing connection:`, {
          message: (releaseError as any)?.message
        })
      }
    }
  }
}
