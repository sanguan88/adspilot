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

// Fungsi untuk request homepage/query dan simpan per tanggal
async function saveCampaignDataPerDate(
  connection: any,
  idToko: string,
  userId: string,
  cookies: string,
  startDate: string,
  endDate: string
) {
  const cleanCookies = cookies.trim().replace(/\s+/g, ' ').replace(/[\r\n\t]/g, '')
  
  // Generate array tanggal dari startDate sampai endDate
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dates.push(dateStr)
  }
  
  let savedCount = 0
  let errorCount = 0
  
  // Loop untuk setiap tanggal
  console.log(`[Save Campaign Data] Processing ${dates.length} dates for toko ${idToko}`)
  for (const dateStr of dates) {
    try {
      // Convert tanggal ke timestamp (1 hari penuh)
      const startTimestamp = convertDateToTimestamp(dateStr, true)
      const endTimestamp = convertDateToTimestamp(dateStr, false)
      
      console.log(`[Save Campaign Data] Fetching data for date ${dateStr} (${startTimestamp} - ${endTimestamp})`)
      
      // Request ke homepage/query
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
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response')
        console.error(`[Homepage Query Error] Status ${response.status}:`, errorText.substring(0, 500))
        errorCount++
        continue
      }
      
      const responseData = await response.json()
      
      if (!responseData || !responseData.data || !responseData.data.entry_list) {
        console.error(`[Homepage Query Error] Invalid response structure:`, {
          has_responseData: !!responseData,
          has_data: !!responseData?.data,
          has_entry_list: !!responseData?.data?.entry_list
        })
        errorCount++
        continue
      }
      
      const entryList = responseData.data.entry_list
      
      if (!entryList || entryList.length === 0) {
        console.log(`[Save Campaign Data] No campaigns found for date ${dateStr}`)
        continue
      }
      
      console.log(`[Save Campaign Data] Found ${entryList.length} campaigns for date ${dateStr}`)
      
      // Simpan setiap campaign dari entry_list
      for (const campaign of entryList) {
        const campaignId = campaign.campaign_id?.toString() || ''
        if (!campaignId) continue
        
        // Extract data dari campaign
        const title = campaign.title || ''
        const status = campaign.status || ''
        const objective = campaign.objective || ''
        const dailyBudget = campaign.daily_budget ? parseFloat(campaign.daily_budget.toString()) / 100000 : null
        const estimationRoi = campaign.estimation_roi ? parseFloat(campaign.estimation_roi.toString()) : null
        
        // Extract report data
        const report = campaign.report || {}
        const reportCost = report.cost ? parseFloat(report.cost.toString()) / 100000 : null
        const reportBroadGmv = report.broad_gmv ? parseFloat(report.broad_gmv.toString()) / 100000 : null
        const reportBroadOrder = report.broad_order ? parseInt(report.broad_order.toString()) : null
        const reportBroadOrderAmount = report.broad_order_amount ? parseFloat(report.broad_order_amount.toString()) / 100000 : null
        const reportBroadRoi = report.broad_roi ? parseFloat(report.broad_roi.toString()) : null
        const reportClick = report.click ? parseInt(report.click.toString()) : null
        const reportImpression = report.impression ? parseInt(report.impression.toString()) : null
        const reportView = report.view ? parseInt(report.view.toString()) : null
        const reportCtr = report.ctr ? parseFloat(report.ctr.toString()) : null
        const reportCpc = report.cpc ? parseFloat(report.cpc.toString()) : null
        const reportCpm = report.cpm ? parseFloat(report.cpm.toString()) : null
        
        // Insert atau update data ke data_produk
        await connection.query(
          `INSERT INTO data_produk (
            user_id, id_toko, campaign_id, title, status, objective, daily_budget, estimation_roi,
            report_cost, report_broad_gmv, report_broad_order, report_broad_order_amount, report_broad_roi,
            report_click, report_impression, report_view, report_ctr, report_cpc, report_cpm,
            report_date, last_sync, created_at, update_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW(), NOW())
          ON CONFLICT (id_toko, campaign_id, report_date)
          DO UPDATE SET
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            objective = EXCLUDED.objective,
            daily_budget = EXCLUDED.daily_budget,
            estimation_roi = EXCLUDED.estimation_roi,
            report_cost = EXCLUDED.report_cost,
            report_broad_gmv = EXCLUDED.report_broad_gmv,
            report_broad_order = EXCLUDED.report_broad_order,
            report_broad_order_amount = EXCLUDED.report_broad_order_amount,
            report_broad_roi = EXCLUDED.report_broad_roi,
            report_click = EXCLUDED.report_click,
            report_impression = EXCLUDED.report_impression,
            report_view = EXCLUDED.report_view,
            report_ctr = EXCLUDED.report_ctr,
            report_cpc = EXCLUDED.report_cpc,
            report_cpm = EXCLUDED.report_cpm,
            last_sync = NOW(),
            update_at = NOW()`,
          [
            userId,
            idToko,
            campaignId,
            title,
            status,
            objective,
            dailyBudget,
            estimationRoi,
            reportCost,
            reportBroadGmv,
            reportBroadOrder,
            reportBroadOrderAmount,
            reportBroadRoi,
            reportClick,
            reportImpression,
            reportView,
            reportCtr,
            reportCpc,
            reportCpm,
            dateStr
          ]
        )
        
        savedCount++
      }
    } catch (error) {
      errorCount++
      console.error(`Error saving data for date ${dateStr}:`, error)
    }
  }
  
  return { savedCount, errorCount, totalDates: dates.length }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveStatus(request)
    const body = await request.json()
    const { id_toko, start_date, end_date } = body
    
    if (!id_toko || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'id_toko, start_date, dan end_date diperlukan' },
        { status: 400 }
      )
    }
    
    const connection = await getDatabaseConnection()
    
    try {
      // Get toko data dengan cookies
      const tokoResult = await connection.query(
        `SELECT id_toko, cookies, user_id FROM data_toko WHERE id_toko = $1`,
        [id_toko]
      )
      
      if (tokoResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Toko tidak ditemukan' },
          { status: 404 }
        )
      }
      
      const toko = tokoResult.rows[0]
      
      if (!toko.cookies) {
        return NextResponse.json(
          { success: false, error: 'Cookies tidak tersedia untuk toko ini' },
          { status: 400 }
        )
      }
      
      // Simpan data per tanggal
      console.log(`[Save Campaign Data] Starting save for toko ${id_toko}, date range: ${start_date} to ${end_date}`)
      const result = await saveCampaignDataPerDate(
        connection,
        toko.id_toko,
        toko.user_id,
        toko.cookies,
        start_date,
        end_date
      )
      
      console.log(`[Save Campaign Data] Completed: ${result.savedCount} campaigns saved, ${result.errorCount} errors, ${result.totalDates} dates processed`)
      
      return NextResponse.json({
        success: true,
        message: `Data berhasil disimpan: ${result.savedCount} campaign dari ${result.totalDates} tanggal`,
        data: result
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Error saving campaign data:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

