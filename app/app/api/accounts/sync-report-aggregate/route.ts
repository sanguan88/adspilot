import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'

// Helper function untuk convert date string ke timestamp
function convertDateToTimestamp(dateStr: string, isStart: boolean = true): number {
  const date = new Date(dateStr)
  if (isStart) {
    date.setHours(0, 0, 0, 0)
  } else {
    date.setHours(23, 59, 59, 999)
  }
  return Math.floor(date.getTime() / 1000)
}

// Function to call Shopee API homepage/query using Node.js fetch (pertanggal)
async function fetchShopeeHomepageQuery(cookies: string, date: string) {
  const cleanCookies = cookies.trim().replace(/\s+/g, ' ').replace(/[\r\n\t]/g, '')

  try {
    const startTimestamp = convertDateToTimestamp(date, true)
    const endTimestamp = convertDateToTimestamp(date, false)

    // Gunakan endpoint homepage/query yang TIDAK diblokir oleh ALB
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
    const headers = {
      'Cookie': cleanCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Content-Type': 'application/json'
    }

    const payload = {
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
      body: JSON.stringify(payload)
    })

    console.log(`[DEBUG_SYNC] Date: ${date}, Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.error(`[DEBUG_SYNC] ERROR BODY: ${errorText}`)
      throw new Error(`Shopee API error ${response.status}: ${errorText.substring(0, 200)}`)
    }

    const result = await response.json()
    console.log(`[DEBUG_SYNC] SUCCESS for ${date}: ${result.data?.entry_list?.length || 0} campaigns found. Full data: ${JSON.stringify(result).substring(0, 500)}`)

    if (!result.data?.entry_list) {
      return { success: true, data: { report_aggregate: {} } }
    }

    // Hitung AGREGAT manual dari semua campaign
    const entryList = result.data.entry_list
    const aggregate: any = {
      broad_gmv: 0,
      broad_order: 0,
      cost: 0,
      impression: 0,
      click: 0,
      view: 0,
      broad_roi: 0,
      checkout: 0
    }

    entryList.forEach((entry: any) => {
      const report = entry.report || {}
      aggregate.broad_gmv += Number(report.broad_gmv || 0)
      aggregate.broad_order += Number(report.broad_order || 0)
      aggregate.cost += Number(report.cost || 0)
      aggregate.impression += Number(report.impression || 0)
      aggregate.click += Number(report.click || 0)
      aggregate.view += Number(report.view || 0)
      aggregate.checkout += Number(report.checkout || 0)
    })

    // Hitung ROI Agregat
    if (aggregate.cost > 0) {
      aggregate.broad_roi = aggregate.broad_gmv / aggregate.cost
    }

    return {
      success: true,
      data: {
        report_aggregate: aggregate
      }
    }

  } catch (error) {
    console.error(`[sync-report-aggregate] Manual aggregate fetch error for date ${date}:`, error)
    throw error
  }
}

// Function to save report_aggregate data to database
async function saveReportAggregate(
  connection: any,
  userId: string,
  idToko: string,
  date: string,
  reportAggregate: any
) {
  try {
    const query = `
      INSERT INTO report_aggregate (
        user_id, id_toko, tanggal,
        broad_cir, broad_gmv, broad_order, broad_order_amount, broad_roi,
        checkout, checkout_rate,
        click, cost, cpc, cpdc, cr, ctr,
        direct_cr, direct_cir, direct_gmv, direct_order, direct_order_amount, direct_roi,
        impression, avg_rank,
        product_click, product_impression, product_ctr,
        location_in_ads,
        reach, page_views, unique_visitors, view,
        cpm, unique_click_user,
        created_at, update_at
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22,
        $23, $24,
        $25, $26, $27,
        $28,
        $29, $30, $31, $32,
        $33, $34,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, id_toko, tanggal)
      DO UPDATE SET
        broad_cir = EXCLUDED.broad_cir,
        broad_gmv = EXCLUDED.broad_gmv,
        broad_order = EXCLUDED.broad_order,
        broad_order_amount = EXCLUDED.broad_order_amount,
        broad_roi = EXCLUDED.broad_roi,
        checkout = EXCLUDED.checkout,
        checkout_rate = EXCLUDED.checkout_rate,
        click = EXCLUDED.click,
        cost = EXCLUDED.cost,
        cpc = EXCLUDED.cpc,
        cpdc = EXCLUDED.cpdc,
        cr = EXCLUDED.cr,
        ctr = EXCLUDED.ctr,
        direct_cr = EXCLUDED.direct_cr,
        direct_cir = EXCLUDED.direct_cir,
        direct_gmv = EXCLUDED.direct_gmv,
        direct_order = EXCLUDED.direct_order,
        direct_order_amount = EXCLUDED.direct_order_amount,
        direct_roi = EXCLUDED.direct_roi,
        impression = EXCLUDED.impression,
        avg_rank = EXCLUDED.avg_rank,
        product_click = EXCLUDED.product_click,
        product_impression = EXCLUDED.product_impression,
        product_ctr = EXCLUDED.product_ctr,
        location_in_ads = EXCLUDED.location_in_ads,
        reach = EXCLUDED.reach,
        page_views = EXCLUDED.page_views,
        unique_visitors = EXCLUDED.unique_visitors,
        view = EXCLUDED.view,
        cpm = EXCLUDED.cpm,
        unique_click_user = EXCLUDED.unique_click_user,
        update_at = CURRENT_TIMESTAMP
    `

    const reportAgg = reportAggregate.report_aggregate || reportAggregate

    // Helper function to safely convert and limit DECIMAL(10,4) values
    // DECIMAL(10,4) can hold up to 999999.9999 with 4 decimal places
    const safeDecimal = (value: any, maxValue: number = 999999.9999): number | null => {
      if (value === null || value === undefined) return null
      const num = typeof value === 'string' ? parseFloat(value) : Number(value)
      if (isNaN(num)) return null
      // Round to 4 decimal places
      let rounded = Math.round(num * 10000) / 10000
      // If value exceeds max, clamp it
      if (Math.abs(rounded) > maxValue) {
        return Math.sign(rounded) * maxValue
      }
      return rounded
    }

    // Helper function to safely convert DECIMAL(15,2) values (for GMV, cost, etc.)
    // Note: Based on API response, cost, broad_gmv, direct_gmv are multiplied by 100000
    // We need to divide by 100000 to get the actual value
    const safeDecimal15_2 = (value: any, divideBy: number = 100000): number | null => {
      if (value === null || value === undefined) return null
      const num = typeof value === 'string' ? parseFloat(value) : Number(value)
      if (isNaN(num)) return null
      // Divide by 100000 to convert from API format
      const converted = num / divideBy
      // Round to 2 decimal places for DECIMAL(15,2)
      let rounded = Math.round(converted * 100) / 100
      // DECIMAL(15,2) can hold up to 9999999999999.99
      const maxValue = 9999999999999.99
      if (Math.abs(rounded) > maxValue) {
        return Math.sign(rounded) * maxValue
      }
      return rounded
    }

    // Helper function to safely convert DECIMAL(15,4) values
    // Note: Some values like cpc, cpdc might also need division by 100000
    const safeDecimal15_4 = (value: any, divideBy: number = 1): number | null => {
      if (value === null || value === undefined) return null
      const num = typeof value === 'string' ? parseFloat(value) : Number(value)
      if (isNaN(num)) return null
      // Divide if needed
      const converted = num / divideBy
      // Round to 4 decimal places for DECIMAL(15,4)
      let rounded = Math.round(converted * 10000) / 10000
      // DECIMAL(15,4) can hold up to 999999999999.9999
      const maxValue = 999999999999.9999
      if (Math.abs(rounded) > maxValue) {
        return Math.sign(rounded) * maxValue
      }
      return rounded
    }

    await connection.query(query, [
      userId,
      idToko,
      date,
      safeDecimal15_4(reportAgg.broad_cir), // DECIMAL(15,4) - no division needed (0.2584... → 0.2585)
      safeDecimal15_2(reportAgg.broad_gmv, 100000), // DECIMAL(15,2) - divide by 100000 (482999900000 → 4829999.00)
      reportAgg.broad_order || null, // INTEGER (38 → 38)
      safeDecimal15_2(reportAgg.broad_order_amount, 1), // DECIMAL(15,2) - no division (39 → 39.00)
      safeDecimal(reportAgg.broad_roi), // DECIMAL(10,4) - no division needed (3.8686... → 3.8686)
      reportAgg.checkout || null, // INTEGER (26 → 26)
      safeDecimal(reportAgg.checkout_rate), // DECIMAL(10,4) - no division needed (0.0742... → 0.0743)
      reportAgg.click || null, // INTEGER (952 → 952)
      safeDecimal15_2(reportAgg.cost, 100000), // DECIMAL(15,2) - divide by 100000 (124850076734 → 1248500.77)
      safeDecimal(reportAgg.cpc ? reportAgg.cpc / 100000 : null), // DECIMAL(10,4) - divide by 100000 (3285528335 → 32855.2834)
      safeDecimal(reportAgg.cpdc ? reportAgg.cpdc / 100000 : null), // DECIMAL(10,4) - divide by 100000 (6571056670 → 65710.5667)
      safeDecimal(reportAgg.cr), // DECIMAL(10,4) - no division needed (0.0399... → 0.0399)
      safeDecimal(reportAgg.ctr), // DECIMAL(10,4) - no division needed (0.0209... → 0.0209)
      safeDecimal(reportAgg.direct_cr), // DECIMAL(10,4) - no division needed (0.0199... → 0.0200)
      safeDecimal15_4(reportAgg.direct_cir), // DECIMAL(15,4) - no division needed (0.3974... → 0.3975)
      safeDecimal15_2(reportAgg.direct_gmv, 100000), // DECIMAL(15,2) - divide by 100000 (314099900000 → 3140999.00)
      reportAgg.direct_order || null, // INTEGER (19 → 19)
      safeDecimal15_2(reportAgg.direct_order_amount, 1), // DECIMAL(15,2) - no division (19 → 19.00)
      safeDecimal(reportAgg.direct_roi), // DECIMAL(10,4) - no division needed (2.5158... → 2.5158)
      reportAgg.impression || null, // INTEGER (45489 → 45489)
      safeDecimal(reportAgg.avg_rank), // DECIMAL(10,4) - no division needed (15 → 15.0000)
      reportAgg.product_click || null, // INTEGER (0 → 0)
      reportAgg.product_impression || null, // INTEGER (0 → 0)
      safeDecimal(reportAgg.product_ctr), // DECIMAL(10,4) - no division needed (0 → 0.0000)
      reportAgg.location_in_ads ? reportAgg.location_in_ads.toString() : null, // VARCHAR (621598 → "621598")
      reportAgg.reach || null, // INTEGER (0 → 0)
      reportAgg.page_views || null, // INTEGER (33 → 33)
      reportAgg.unique_visitors || null, // INTEGER (0 → 0)
      reportAgg.view || null, // INTEGER (350 → 350)
      safeDecimal(reportAgg.cpm), // DECIMAL(10,4) - no division needed (0 → 0.0000)
      reportAgg.unique_click_user || null // INTEGER (0 → 0)
    ])

    return true
  } catch (error) {
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveStatus(request)
    const body = await request.json()
    const { id_toko, start_date, end_date } = body

    if (!id_toko || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: id_toko, start_date, end_date' },
        { status: 400 }
      )
    }

    const connection = await getDatabaseConnection()

    try {
      // Get cookies and user_id for this account (user_id is stored in data_toko table)
      const cookieQuery = 'SELECT cookies, user_id FROM data_toko WHERE id_toko = $1'
      const cookieResult = await connection.query(cookieQuery, [id_toko])

      if (cookieResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Account not found' },
          { status: 404 }
        )
      }

      const tokoData = cookieResult.rows[0]
      const cookies = tokoData.cookies
      const user_id = tokoData.user_id

      if (!user_id) {
        return NextResponse.json(
          { success: false, error: 'No user_id found for this account' },
          { status: 400 }
        )
      }

      if (!cookies || cookies.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'No cookies found for this account' },
          { status: 400 }
        )
      }

      // Generate array of dates in range
      const startDate = new Date(start_date)
      const endDate = new Date(end_date)
      const datesToSync: string[] = []

      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const day = String(currentDate.getDate()).padStart(2, '0')
        datesToSync.push(`${year}-${month}-${day}`)
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Check which dates already exist in database
      const existingDatesQuery = `
        SELECT tanggal::text as tanggal
        FROM report_aggregate
        WHERE user_id = $1 
          AND id_toko = $2 
          AND tanggal >= $3 
          AND tanggal <= $4
      `
      const existingDatesResult = await connection.query(existingDatesQuery, [
        user_id,
        id_toko,
        start_date,
        end_date
      ])
      const existingDates = existingDatesResult.rows.map(row => row.tanggal)

      // Filter out dates that already exist
      const missingDates = datesToSync.filter(date => !existingDates.includes(date))

      if (missingDates.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All dates already synced',
          synced_dates: [],
          skipped_dates: datesToSync
        })
      }

      // Sync missing dates one by one with retry logic
      const syncedDates: string[] = []
      const failedDates: string[] = []

      for (const date of missingDates) {
        let retryCount = 0
        const maxRetries = 3
        let success = false

        // Retry loop: maksimal 3x percobaan
        while (retryCount < maxRetries && !success) {
          try {
            retryCount++

            // Call homepage/query fetch and calculate aggregate
            const timeGraphData = await fetchShopeeHomepageQuery(cookies, date)

            if (timeGraphData.data?.report_aggregate) {
              // Save to database immediately after successful fetch
              await saveReportAggregate(
                connection,
                user_id,
                id_toko,
                date,
                timeGraphData.data
              )
              syncedDates.push(date)
              success = true
            } else {
              // If no data but no error, don't retry (API returned success but no data)
              if (retryCount >= maxRetries) {
                failedDates.push(date)
              } else {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)) // Exponential backoff
              }
            }
          } catch (error) {
            if (retryCount >= maxRetries) {
              // After 3 failed attempts, skip this date and continue to next
              failedDates.push(date)
            } else {
              // Wait before retry with exponential backoff
              const waitTime = 2000 * retryCount // 2s, 4s, 6s
              await new Promise(resolve => setTimeout(resolve, waitTime))
            }
          }
        }

        // Add delay between different dates to avoid rate limiting (only if not the last date)
        if (date !== missingDates[missingDates.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synced ${syncedDates.length} date(s), ${failedDates.length} failed`,
        synced_dates: syncedDates,
        failed_dates: failedDates,
        skipped_dates: existingDates
      })

    } finally {
      connection.release()
    }

  } catch (error) {
    const sanitized = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: sanitized },
      { status: 500 }
    )
  }
}

