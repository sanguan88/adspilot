import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { sanitizeErrorForLogging, isDatabaseConnectionError, getGenericDatabaseErrorMessage } from '@/lib/db-errors'
import { validateCampaignsLimitForSync } from '@/lib/subscription-limits'

// Function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''

  return cookies
    .replace(/[\r\n\t]+/g, ' ')  // Replace newlines, carriage returns, tabs with space
    .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
    .trim()                      // Remove leading/trailing spaces
}

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

// Function to call Shopee API - langsung ke API Shopee seperti apitest.py
async function callShopeeAPI(endpoint: string, payload: any, cookies: string) {
  const cleanedCookies = cleanCookies(cookies)

  // Log hanya endpoint, tidak log payload (bisa panjang)
  console.log(`[API Call] Calling Shopee API: ${endpoint}`)

  // showallcampaign - langsung ke API Shopee
  if (endpoint === 'showallcampaign') {
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
    const headers = {
      'Cookie': cleanedCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Content-Type': 'application/json'
    }

    // Convert date string ke timestamp
    const startTimestamp = convertDateToTimestamp(payload.start_time || payload.startTime, true)
    const endTimestamp = convertDateToTimestamp(payload.end_time || payload.endTime, false)

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

    // Log hanya URL, tidak log payload (bisa panjang)
    console.log(`[API Call] Direct call to Shopee API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[API Call] ✗ ${endpoint} - HTTP ${response.status}: ${errorText}`)
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    console.log(`[API Call] ✓ ${endpoint} - Direct API response received`)

    // Transform response to match expected format
    return {
      success: true,
      data: result?.data || result
    }
  }

  // Jika endpoint tidak dikenali
  throw new Error(`Unknown endpoint: ${endpoint}. Only showallcampaign is supported.`)
}

// Function to get campaign data from Shopee API
async function getCampaignData(cookies: string, startTime: string, endTime: string) {
  if (!cookies) {
    return []
  }

  const payload = {
    start_time: startTime,
    end_time: endTime
  }

  try {
    const campaignData = await callShopeeAPI(
      'showallcampaign',
      payload,
      cookies
    )

    if (campaignData) {
      // Extract data from response structure
      const responseData = campaignData.data || campaignData

      // Check different possible structures based on actual response
      if (responseData?.entry_list) {
        console.log(`[Campaign API] Found ${responseData.entry_list.length} campaigns in entry_list`)
        return responseData.entry_list
      } else if (responseData?.campaigns) {
        console.log(`[Campaign API] Found ${responseData.campaigns.length} campaigns in campaigns`)
        return responseData.campaigns
      } else if (Array.isArray(responseData)) {
        console.log(`[Campaign API] Found ${responseData.length} campaigns as array`)
        return responseData
      } else {
        console.log('[Campaign API] No campaigns found in response structure')
        console.log('[Campaign API] Available keys:', Object.keys(responseData || {}))
      }
    }

    return []
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error fetching campaign data from Shopee API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    return []
  }
}

// Function to save campaigns to database (data_produk)
async function saveCampaignsToDatabase(connection: PoolClient, campaigns: any[], startTime: string, endTime: string, userRole?: string) {
  try {
    // Use endTime as report_date (or startTime if endTime is not available)
    const reportDate = endTime || startTime
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    // Group campaigns by user_id for limit validation
    const campaignsByUser = new Map<string, Array<{ campaign: any; campaignId: string; idToko: string }>>()

    // First pass: group campaigns by user
    for (const campaign of campaigns) {
      try {
        const idToko = campaign.account_username || campaign.username
        if (!idToko) {
          errorCount++
          continue
        }

        // Get user_id from data_toko
        const tokoResult = await connection.query(
          'SELECT user_id FROM data_toko WHERE id_toko = $1',
          [idToko]
        )

        if (!tokoResult.rows || tokoResult.rows.length === 0) {
          errorCount++
          continue
        }

        const userId = tokoResult.rows[0].user_id
        const campaignId = campaign.campaign_id?.toString() || campaign.campaign?.campaign_id?.toString() || campaign.id?.toString() || ''

        if (!campaignId) {
          errorCount++
          continue
        }

        if (!campaignsByUser.has(userId)) {
          campaignsByUser.set(userId, [])
        }
        campaignsByUser.get(userId)!.push({ campaign, campaignId, idToko })
      } catch (error) {
        errorCount++
        continue
      }
    }

    // Second pass: validate limits per user and filter allowed campaigns
    const allowedCampaigns: Array<{ campaign: any; campaignId: string; idToko: string; userId: string }> = []

    for (const [userId, userCampaigns] of campaignsByUser.entries()) {
      const campaignIds = userCampaigns.map(uc => uc.campaignId)

      // Validate limit for this user
      const validation = await validateCampaignsLimitForSync(
        connection,
        userId,
        campaignIds,
        userRole
      )

      // Create set of allowed campaign IDs for this user
      const allowedIdsSet = new Set(validation.allowedCampaignIds.map(id => id.toString()))

      // Filter campaigns that are allowed
      for (const userCampaign of userCampaigns) {
        if (allowedIdsSet.has(userCampaign.campaignId.toString())) {
          allowedCampaigns.push({ ...userCampaign, userId })
        } else {
          skippedCount++
          console.log(`[Campaign Save] Skipping campaign ${userCampaign.campaignId} for user ${userId} due to subscription limit`)
        }
      }

      if (validation.skippedCount > 0) {
        console.log(`[Campaign Save] Limit validation for user ${userId}: ${validation.skippedCount} campaigns skipped`)
      }
    }

    // Third pass: save only allowed campaigns
    for (const { campaign, campaignId, idToko, userId } of allowedCampaigns) {
      try {

        // Helper function to clamp DECIMAL(10, 4) values to max 999999.9999
        // Note: campaignId is in closure scope
        const clampDecimal10_4 = (value: number | null, fieldName: string = ''): number | null => {
          if (value === null || value === undefined || isNaN(value)) return null
          const maxValue = 999999.9999
          const minValue = -999999.9999
          if (value > maxValue) {
            console.warn(`[Campaign ${campaignId}] Field ${fieldName} value ${value} exceeds max ${maxValue}, clamping to ${maxValue}`)
            return maxValue
          }
          if (value < minValue) {
            console.warn(`[Campaign ${campaignId}] Field ${fieldName} value ${value} below min ${minValue}, clamping to ${minValue}`)
            return minValue
          }
          return value
        }

        // Extract data from campaign object
        const title = campaign.title || campaign.campaign?.title || ''
        const status = campaign.state || campaign.status || ''
        const objective = campaign.objective || campaign.campaign?.objective || campaign.live_stream_ads?.objective || ''
        const dailyBudget = campaign.campaign?.daily_budget || campaign.daily_budget ? parseFloat((campaign.campaign?.daily_budget || campaign.daily_budget).toString()) / 100000 : null
        const estimationRoi = clampDecimal10_4(campaign.campaign?.estimation_roi || campaign.estimation_roi ? parseFloat((campaign.campaign?.estimation_roi || campaign.estimation_roi).toString()) : null, 'estimation_roi')

        // Extract report data
        const report = campaign.report || {}
        const reportCost = report.cost ? parseFloat(report.cost.toString()) / 100000 : null
        const reportBroadGmv = report.broad_gmv ? parseFloat(report.broad_gmv.toString()) / 100000 : null
        const reportBroadOrder = report.broad_order ? parseInt(report.broad_order.toString()) : null
        const reportBroadOrderAmount = report.broad_order_amount ? parseFloat(report.broad_order_amount.toString()) / 100000 : null
        // ROI bisa sangat besar, clamp ke maksimum DECIMAL(10, 4)
        const reportBroadRoi = clampDecimal10_4(report.broad_roi ? parseFloat(report.broad_roi.toString()) : null, 'report_broad_roi')
        const reportClick = report.click ? parseInt(report.click.toString()) : null
        const reportImpression = report.impression ? parseInt(report.impression.toString()) : null
        const reportView = report.view ? parseInt(report.view.toString()) : null
        // CTR biasanya dalam format 0-1 (desimal) atau 0-100 (persen), clamp jika perlu
        const reportCtr = clampDecimal10_4(report.ctr ? parseFloat(report.ctr.toString()) : null, 'report_ctr')
        // CPC/CPM perlu dibagi 100000 jika dalam format Shopee (micro currency)
        const reportCpc = clampDecimal10_4(report.cpc ? parseFloat(report.cpc.toString()) / 100000 : null, 'report_cpc')
        const reportCpm = clampDecimal10_4(report.cpm ? parseFloat(report.cpm.toString()) / 100000 : null, 'report_cpm')

        // Extract ratio data if available
        const ratio = campaign.ratio || {}
        const ratioCost = ratio.cost ? parseFloat(ratio.cost.toString()) / 100000 : null
        const ratioBroadGmv = ratio.broad_gmv ? parseFloat(ratio.broad_gmv.toString()) / 100000 : null
        const ratioBroadOrder = ratio.broad_order ? parseInt(ratio.broad_order.toString()) : null
        const ratioClick = ratio.click ? parseInt(ratio.click.toString()) : null
        const ratioImpression = ratio.impression ? parseInt(ratio.impression.toString()) : null
        const ratioView = ratio.view ? parseInt(ratio.view.toString()) : null
        const ratioCtr = clampDecimal10_4(ratio.ctr ? parseFloat(ratio.ctr.toString()) : null, 'ratio_ctr')
        const ratioCpc = clampDecimal10_4(ratio.cpc ? parseFloat(ratio.cpc.toString()) / 100000 : null, 'ratio_cpc')
        const ratioCpm = clampDecimal10_4(ratio.cpm ? parseFloat(ratio.cpm.toString()) / 100000 : null, 'ratio_cpm')

        // Insert or update to data_produk
        await connection.query(
          `INSERT INTO data_produk (
            user_id, id_toko, campaign_id, title, status, objective, daily_budget, estimation_roi,
            report_cost, report_broad_gmv, report_broad_order, report_broad_order_amount, report_broad_roi,
            report_click, report_impression, report_view, report_ctr, report_cpc, report_cpm,
            ratio_cost, ratio_broad_gmv, ratio_broad_order, ratio_click, ratio_impression, ratio_view, ratio_ctr, ratio_cpc, ratio_cpm,
            report_date, last_sync, created_at, update_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW(), NOW(), NOW())
          ON CONFLICT (id_toko, campaign_id, report_date)
          DO UPDATE SET
            user_id = EXCLUDED.user_id,
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
            ratio_cost = EXCLUDED.ratio_cost,
            ratio_broad_gmv = EXCLUDED.ratio_broad_gmv,
            ratio_broad_order = EXCLUDED.ratio_broad_order,
            ratio_click = EXCLUDED.ratio_click,
            ratio_impression = EXCLUDED.ratio_impression,
            ratio_view = EXCLUDED.ratio_view,
            ratio_ctr = EXCLUDED.ratio_ctr,
            ratio_cpc = EXCLUDED.ratio_cpc,
            ratio_cpm = EXCLUDED.ratio_cpm,
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
            ratioCost,
            ratioBroadGmv,
            ratioBroadOrder,
            ratioClick,
            ratioImpression,
            ratioView,
            ratioCtr,
            ratioCpc,
            ratioCpm,
            reportDate
          ]
        )

        successCount++
      } catch (error: any) {
        errorCount++
        const sanitized = sanitizeErrorForLogging(error)
        const timestamp = new Date().toISOString()
        console.error(`[${timestamp}] Error saving campaign ${campaign.campaign_id || campaign.id}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
        // Continue processing other campaigns
      }
    }
    console.log(`[Campaign Save] Completed: ${successCount} success, ${errorCount} errors from ${campaigns.length} campaigns`)
  } catch (error) {
    console.error('Error saving campaigns to database:', error)
    // Don't throw error to prevent breaking the main flow
  }
}

// Function to get all accounts with cookies (with user filtering)
async function getAccountsWithCookies(connection: PoolClient, user: any, accountIds?: string[]) {
  try {
    let query = `SELECT dt.id_toko as id, dt.id_toko as username, dt.email_toko as email, dt.cookies, dt.nama_toko
                 FROM data_toko dt 
                 WHERE dt.cookies IS NOT NULL AND dt.cookies != '' AND dt.status_toko = 'active'`

    let params: any[] = []
    let paramIndex = 1

    // User isolation: Filter by user_id (unless admin/superadmin)
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      query += ` AND dt.user_id = $${paramIndex++}`
      params.push(user.userId)
    }

    if (accountIds && accountIds.length > 0) {
      // Validate accountIds belong to user (unless admin/superadmin)
      if (user.role !== 'superadmin' && user.role !== 'admin') {
        const allowedTokoIds = await getAllowedUsernames(user)
        accountIds = accountIds.filter(id => allowedTokoIds.includes(id))
        if (accountIds.length === 0) {
          return [] // No valid account IDs
        }
      }

      // Filter by id_toko
      const placeholders = accountIds.map(() => `$${paramIndex++}`).join(',')
      query += ` AND dt.id_toko IN (${placeholders})`
      params.push(...accountIds)
    }

    query += ` ORDER BY dt.created_at DESC`

    // Don't log query or params (may contain sensitive data)
    const result = await connection.query(query, params)
    const rows = result.rows
    console.log(`Found ${rows.length} accounts`)
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

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)

    // Default to today (always current date)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    const startTime = searchParams.get('start_time') || startOfDay.toISOString().split('T')[0]
    const endTime = searchParams.get('end_time') || endOfDay.toISOString().split('T')[0]
    const accountIdsParam = searchParams.get('account_ids')
    const accountIds = accountIdsParam ? accountIdsParam.split(',').filter(id => id.trim()) : undefined

    // Validate date format
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Please use YYYY-MM-DD format for start_time and end_time'
        },
        { status: 400 }
      )
    }

    if (startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'start_time cannot be greater than end_time'
        },
        { status: 400 }
      )
    }

    // Get authenticated user for data isolation
    const user = await requireActiveStatus(request)

    // Create database connection
    connection = await getDatabaseConnection()

    // Get accounts with cookies
    const accounts = await getAccountsWithCookies(connection, user, accountIds)
    console.log(`Found ${accounts.length} accounts with cookies`)

    // If no accounts found, return empty result
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: {
          start_time: startTime,
          end_time: endTime,
          total_campaigns: 0,
          active_campaigns: 0,
          paused_campaigns: 0,
          ended_campaigns: 0,
          total_spend: 0,
          total_budget: 0,
          total_gmv: 0
        }
      })
    }

    // Get campaign data for all accounts
    const allCampaigns: any[] = []

    for (const account of accounts) {
      if (account.cookies) {
        try {
          const campaigns = await getCampaignData(account.cookies, startTime, endTime)

          if (campaigns && campaigns.length > 0) {
            campaigns.forEach((campaign: any) => {
              // Add account information to campaign
              campaign.account_username = account.username
              campaign.account_id = account.id
              campaign.account_email = account.email
              campaign.kode_tim = account.kode_tim
              campaign.nama_tim = account.nama_tim
              campaign.pic_akun = account.pic_akun
              allCampaigns.push(campaign)
            })
          }
        } catch (error) {
          const sanitized = sanitizeErrorForLogging(error)
          const timestamp = new Date().toISOString()
          console.error(`[${timestamp}] Error fetching campaigns for account ${account.username}: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
          // Continue with other accounts even if one fails
        }
      }
    }

    // Process campaigns data like in campaigns.php
    const processedCampaigns = allCampaigns.map(campaign => {
      // Extract data from the correct structure
      const campaign_id = campaign.campaign?.campaign_id || campaign.campaign_id || 'N/A'
      const title = campaign.title || 'N/A'
      const state = campaign.state || 'unknown'
      const daily_budget = campaign.campaign?.daily_budget || campaign.daily_budget || 0
      const image = campaign.image || null
      const report = campaign.report || {}
      const cost = report.cost || 0
      const cost_ratio = report.cost_ratio || 0
      const impression = report.impression || 0
      const click = report.click || 0
      const view = report.view || 0
      const broad_order = report.broad_order || 0
      const broad_gmv = report.broad_gmv || 0

      // Extract roi_two_target from campaign data
      const roi_two_target = campaign.campaign?.roi_two_target || campaign.roi_two_target || 0

      // Extract cost_ratio from API data.entry_list.ratio.cost
      const cost_ratio_value = campaign.ratio?.cost || 0

      // Check if this is a group campaign (has mpd.item_list)
      const isGroupCampaign = !!(campaign.mpd?.item_list && Array.isArray(campaign.mpd.item_list) && campaign.mpd.item_list.length > 0)

      // Extract group image data for group campaigns
      let groupImages: string[] = []
      let totalItems = 0
      if (isGroupCampaign) {
        // Get images from group_image.image_list
        if (campaign.group_image?.image_list && Array.isArray(campaign.group_image.image_list)) {
          groupImages = campaign.group_image.image_list
        }
        // Get total count from mpd.item_list or group_image.total_count
        totalItems = campaign.mpd.item_list.length || campaign.group_image?.total_count || 0
      }

      // Extract subtype from campaign data (entry_list.subtype)
      const subtype = campaign.subtype || null

      // Extract start_time from campaign data (entry_list.campaign.start_time)
      const start_time = campaign.campaign?.start_time || campaign.start_time || null

      // Get objective from live_stream_ads or other sources and map to display text
      let objective_raw = 'N/A'
      if (campaign.live_stream_ads?.objective) {
        objective_raw = campaign.live_stream_ads.objective
      } else if (campaign.objective) {
        objective_raw = campaign.objective
      }

      // Map objective to display text
      let objective = 'N/A'
      switch (objective_raw) {
        case 'max_gmv_roi_two':
          objective = 'GMV MAX'
          break
        case 'max_gmv':
          objective = 'AUTO'
          break
        case 'max_view':
          objective = 'VIEW'
          break
        default:
          objective = objective_raw
      }

      // Calculate metrics
      const spend_percentage = daily_budget > 0 ? (cost / daily_budget) * 100 : 0
      const cpc = campaign.report?.cpc || 0
      const conversion_rate = (campaign.report?.checkout_rate || 0) * 100  // Conversion Rate = checkout_rate * 100
      const cpm = impression > 0 ? (cost / impression) * 1000 : 0
      const roas = cost > 0 ? (broad_gmv / cost) : 0
      const ctr = impression > 0 ? (click / impression) * 100 : 0  // CTR = (clicks / impressions) * 100

      return {
        id: campaign_id,
        title,
        state,
        daily_budget,
        cost,
        impression,
        click,
        view,
        broad_order,
        broad_gmv,
        objective,
        spend_percentage,
        cpc,
        conversion_rate,
        cpm,
        roas,
        ctr,
        roi_two_target,
        cost_ratio: cost_ratio_value,
        account_username: campaign.account_username,
        account_id: campaign.account_id,
        account_email: campaign.account_email,
        kode_tim: campaign.kode_tim,
        nama_tim: campaign.nama_tim,
        pic_akun: campaign.pic_akun,
        image,
        isGroupCampaign,
        groupImages,
        totalItems,
        subtype,
        start_time
      }
    })

    // Save campaigns to database (save all campaigns with original data from Shopee API)
    try {
      // Save original campaign data from allCampaigns (before processing)
      // Filter only active and paused campaigns
      const campaignsToSave = allCampaigns.filter((campaign: any) => {
        const state = campaign.state || campaign.status || ''
        return state === 'ongoing' || state === 'paused'
      })

      // Save to database
      if (campaignsToSave.length > 0) {
        await saveCampaignsToDatabase(connection, campaignsToSave, startTime, endTime, user.role)
        console.log(`[Campaign Save] Processing ${campaignsToSave.length} active/paused campaigns`)
      }
    } catch (error) {
      console.error('Error saving campaigns to database:', error)
      // Don't fail the entire request if database save fails
    }

    return NextResponse.json({
      success: true,
      data: processedCampaigns,
      meta: {
        start_time: startTime,
        end_time: endTime,
        total_campaigns: processedCampaigns.length,
        active_campaigns: processedCampaigns.filter(c => c.state === 'ongoing').length,
        paused_campaigns: processedCampaigns.filter(c => c.state === 'paused').length,
        ended_campaigns: processedCampaigns.filter(c => c.state === 'ended').length,
        total_spend: processedCampaigns.reduce((sum, c) => sum + c.cost, 0),
        total_budget: processedCampaigns.reduce((sum, c) => sum + c.daily_budget, 0),
        total_gmv: processedCampaigns.reduce((sum, c) => sum + c.broad_gmv, 0)
      }
    })

  } catch (error: any) {
    // Always release connection in catch block
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
      connection = null
    }

    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()

    // Handle authentication errors from requireActiveStatus
    if (error?.message?.includes('Authentication required') || error?.message?.includes('Access denied')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Check if it's a database connection error
    const isConnectionError = isDatabaseConnectionError(error) ||
      error?.message?.includes('Connection terminated') ||
      error?.message?.includes('connection') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.isDatabaseError

    if (isConnectionError) {
      console.error(`[${timestamp}] Database connection error in campaigns shopee API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
      return NextResponse.json(
        { success: false, error: getGenericDatabaseErrorMessage() },
        { status: 503 }
      )
    }

    console.error(`[${timestamp}] Error in campaigns shopee API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Gagal mengambil data campaigns. Silakan coba lagi.'
      },
      { status: 500 }
    )
  } finally {
    // Always release connection (safety net)
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
    }
  }
}
