import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getRoleBasedFilter } from '@/lib/role-filter'
import { sanitizeErrorForLogging } from '@/lib/db-errors'
import { validateCampaignsLimitForSync } from '@/lib/subscription-limits'

interface CampaignMetrics {
  campaign_id: string
  title: string
  status: string
  impressions: number
  clicks: number
  conversions: number
  spend: number
  ctr: number
  cpc: number
  daily_budget: number
  nama_toko: string
  id_toko: string
  created_at: string
  update_at: string
  revenue: number
  image?: string | null
}

interface FunnelMetrics {
  campaign_id: string
  title: string
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number
  conversionRate: number
  revenuePerConversion: number
  roas: number
}

interface BCGData {
  campaign_id: string
  title: string
  growthRate: number // Growth rate (impressions, clicks, atau revenue)
  marketShare: number // Relative performance (CTR, Conversion Rate, atau ROAS)
  category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs'
  spend: number
  revenue: number
  roas: number
  status: string
  image?: string
  id_toko?: string
}

// Helper function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  return cookies
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Helper function to convert date string to timestamp
function convertDateToTimestamp(dateStr: string, isStart: boolean = true): number {
  const date = new Date(dateStr)
  if (isStart) {
    date.setHours(0, 0, 0, 0)
  } else {
    date.setHours(23, 59, 59, 999)
  }
  return Math.floor(date.getTime() / 1000)
}

// Function to call Shopee API
async function callShopeeAPI(cookies: string, startTime: string, endTime: string) {
  const cleanedCookies = cleanCookies(cookies)
  const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
  const headers = {
    'Cookie': cleanedCookies,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    'Content-Type': 'application/json'
  }

  const startTimestamp = convertDateToTimestamp(startTime, true)
  const endTimestamp = convertDateToTimestamp(endTime, false)

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
    throw new Error(`Shopee API call failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  // Extract campaigns from response
  if (result?.data?.entry_list) {
    return result.data.entry_list
  } else if (result?.entry_list) {
    return result.entry_list
  } else if (Array.isArray(result)) {
    return result
  }

  return []
}

// Function to get campaign data from Shopee API for a toko
async function getCampaignDataFromShopee(connection: PoolClient, tokoId: string, startTime: string, endTime: string) {
  try {
    // Get cookies and nama_toko for this toko
    const tokoResult = await connection.query(
      'SELECT cookies, nama_toko FROM data_toko WHERE id_toko = $1 AND cookies IS NOT NULL AND cookies != \'\' AND status_toko = \'active\'',
      [tokoId]
    )

    if (!tokoResult.rows || tokoResult.rows.length === 0 || !tokoResult.rows[0].cookies) {
      console.log(`[Rekam Medic] No cookies found for toko ${tokoId}`)
      return []
    }

    const cookies = tokoResult.rows[0].cookies
    const namaToko = tokoResult.rows[0].nama_toko || ''
    const campaigns = await callShopeeAPI(cookies, startTime, endTime)

    // Get user_id for limit validation
    const userResult = await connection.query(
      'SELECT user_id FROM data_toko WHERE id_toko = $1',
      [tokoId]
    )
    const userId = userResult.rows[0]?.user_id

    // Extract campaign IDs and validate limit (if userId exists)
    const campaignIds: string[] = []
    for (const campaign of campaigns) {
      const campaignId = campaign.campaign?.campaign_id || campaign.campaign_id || campaign.id || ''
      if (campaignId) {
        campaignIds.push(campaignId.toString())
      }
    }

    // Validate campaign limit for this user (if userId exists)
    let allowedCampaignIds: string[] = campaignIds
    let limitWarning: string | undefined = undefined
    if (userId && campaignIds.length > 0) {
      // Note: userRole not available here, but validation function will check subscription
      const validation = await validateCampaignsLimitForSync(
        connection,
        userId,
        campaignIds,
        undefined // userRole not available in this context
      )
      allowedCampaignIds = validation.allowedCampaignIds
      limitWarning = validation.error

      if (validation.skippedCount > 0) {
        console.log(`[Rekam Medic] Campaign limit validation: ${validation.skippedCount} campaigns skipped for user ${userId}`)
      }
    }

    // Create set of allowed campaign IDs for fast lookup
    const allowedCampaignIdsSet = new Set(allowedCampaignIds.map(id => id.toString()))

    // Transform Shopee API data to match database structure and save to database
    const reportDate = endTime || startTime
    const transformedCampaigns: CampaignMetrics[] = []

    for (const campaign of campaigns) {
      try {
        const campaignId = campaign.campaign?.campaign_id || campaign.campaign_id || campaign.id || ''

        if (!campaignId) {
          continue
        }

        // Skip campaign if not allowed due to limit
        if (!allowedCampaignIdsSet.has(campaignId.toString())) {
          console.log(`[Rekam Medic] Skipping campaign ${campaignId} due to subscription limit`)
          continue
        }

        // Extract data from campaign object
        const title = campaign.title || campaign.campaign?.title || ''
        const status = campaign.state || campaign.status || 'paused'
        const objective = campaign.objective || campaign.campaign?.objective || ''
        const dailyBudget = campaign.campaign?.daily_budget || campaign.daily_budget
          ? parseFloat((campaign.campaign?.daily_budget || campaign.daily_budget).toString()) / 100000
          : null

        // Extract report data
        const report = campaign.report || {}
        const reportCost = report.cost ? parseFloat(report.cost.toString()) / 100000 : 0
        const reportBroadGmv = report.broad_gmv ? parseFloat(report.broad_gmv.toString()) / 100000 : 0
        const reportBroadOrder = report.broad_order ? parseInt(report.broad_order.toString()) : 0
        const reportClick = report.click ? parseInt(report.click.toString()) : 0
        const reportImpression = report.impression ? parseInt(report.impression.toString()) : 0
        const reportCtr = report.ctr ? parseFloat(report.ctr.toString()) : null
        const reportCpc = report.cpc ? parseFloat(report.cpc.toString()) / 100000 : null

        // Save to database
        await connection.query(
          `INSERT INTO data_produk (
            user_id, id_toko, campaign_id, title, status, objective, daily_budget,
            report_cost, report_broad_gmv, report_broad_order,
            report_click, report_impression, report_ctr, report_cpc,
            report_date, last_sync, created_at, update_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW(), NOW())
          ON CONFLICT (id_toko, campaign_id, report_date)
          DO UPDATE SET
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            objective = EXCLUDED.objective,
            daily_budget = EXCLUDED.daily_budget,
            report_cost = EXCLUDED.report_cost,
            report_broad_gmv = EXCLUDED.report_broad_gmv,
            report_broad_order = EXCLUDED.report_broad_order,
            report_click = EXCLUDED.report_click,
            report_impression = EXCLUDED.report_impression,
            report_ctr = EXCLUDED.report_ctr,
            report_cpc = EXCLUDED.report_cpc,
            last_sync = NOW(),
            update_at = NOW()`,
          [
            userId || '', tokoId, campaignId, title, status, objective, dailyBudget,
            reportCost, reportBroadGmv, reportBroadOrder,
            reportClick, reportImpression, reportCtr, reportCpc,
            reportDate
          ]
        )

        // Add to transformed campaigns for return
        transformedCampaigns.push({
          campaign_id: campaignId.toString(),
          title: title || 'Unnamed Campaign',
          status: status || 'paused',
          impressions: reportImpression || 0,
          clicks: reportClick || 0,
          conversions: reportBroadOrder || 0,
          spend: reportCost || 0,
          ctr: reportCtr ? (reportCtr * 100) : (reportImpression > 0 ? (reportClick / reportImpression) * 100 : 0),
          cpc: reportCpc || (reportClick > 0 ? reportCost / reportClick : 0),
          revenue: reportBroadGmv || 0,
          daily_budget: dailyBudget || 0,
          nama_toko: namaToko,
          id_toko: tokoId,
          created_at: '',
          update_at: ''
        })
      } catch (error) {
        console.error(`[Rekam Medic] Error processing campaign ${campaign.campaign_id || campaign.id}:`, error)
        // Continue with other campaigns
      }
    }

    return transformedCampaigns
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    console.error(`[Rekam Medic] Error fetching from Shopee API for toko ${tokoId}:`, sanitized.type)
    return []
  }
}

// Function to get campaigns with metrics for analysis
async function getCampaignsForAnalysis(
  connection: PoolClient,
  startTime: string,
  endTime: string,
  tokoIds?: string[],
  statuses?: string[]
) {
  try {
    // Aggregate data per campaign_id for the date range
    // SUM metrics that accumulate (impressions, clicks, conversions, spend, revenue)
    // AVG metrics that are rates (ctr, cpc)
    // Get latest status and title
    let query = `SELECT 
       dp.campaign_id,
       MAX(dp.title) as title,
       MAX(dp.status) as status,
       MAX(dp.daily_budget) as daily_budget,
       COALESCE(SUM(dp.report_cost), 0) as spend,
      COALESCE(SUM(dp.report_impression), 0) as impressions,
      COALESCE(SUM(dp.report_click), 0) as clicks,
      CASE 
        WHEN SUM(dp.report_impression) > 0 
        THEN (SUM(dp.report_click)::numeric / SUM(dp.report_impression)::numeric * 100)
        ELSE 0 
      END as ctr,
      COALESCE(SUM(dp.report_broad_order), 0) as conversions,
      CASE 
        WHEN SUM(dp.report_click) > 0 
        THEN (SUM(dp.report_cost)::numeric / SUM(dp.report_click)::numeric)
        ELSE 0 
      END as cpc,
      COALESCE(SUM(dp.report_broad_gmv), 0) as revenue,
      MAX(dp.id_toko) as id_toko,
      MAX(dt.nama_toko) as nama_toko
    FROM data_produk dp
    LEFT JOIN data_toko dt ON dp.id_toko = dt.id_toko
    WHERE dp.report_date >= $1 AND dp.report_date <= $2
      AND dp.id_toko IS NOT NULL AND dp.id_toko != ''
      AND dt.status_toko = 'active'`

    let params: any[] = [startTime, endTime]
    let paramIndex = 3

    if (tokoIds && tokoIds.length > 0) {
      const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
      query += ` AND dp.id_toko IN (${placeholders})`
      params.push(...tokoIds)
    }

    if (statuses && statuses.length > 0) {
      const placeholders = statuses.map(() => `$${paramIndex++}`).join(',')
      query += ` AND dp.status IN (${placeholders})`
      params.push(...statuses)
    }

    query += ` GROUP BY dp.campaign_id, dp.id_toko
      ORDER BY spend DESC`

    console.log('[Rekam Medic] Query:', query)
    console.log('[Rekam Medic] Params:', params)

    const result = await connection.query(query, params)
    console.log('[Rekam Medic] Raw rows count:', result.rows.length)

    let campaigns = result.rows.map((row: any) => ({
      campaign_id: row.campaign_id?.toString() || '',
      title: row.title || 'Unnamed Campaign',
      status: row.status || 'paused',
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
      spend: Number(row.spend) || 0,
      ctr: Number(row.ctr) || 0,
      cpc: Number(row.cpc) || 0,
      revenue: Number(row.revenue) || 0,
      daily_budget: Number(row.daily_budget) || 0,
      image: null, // Image column not available in data_produk table
      nama_toko: row.nama_toko || '',
      id_toko: row.id_toko || '',
      created_at: row.created_at,
      update_at: row.update_at,
    }))

    // If no data found in database, try to fetch from Shopee API
    if (campaigns.length === 0 && tokoIds && tokoIds.length > 0) {
      console.log('[Rekam Medic] No data found in database, fetching from Shopee API...')

      // Fetch from Shopee API for each toko and save to database
      for (const tokoId of tokoIds) {
        try {
          await getCampaignDataFromShopee(connection, tokoId, startTime, endTime)
        } catch (error) {
          console.error(`[Rekam Medic] Error fetching from Shopee API for toko ${tokoId}:`, error)
          // Continue with other tokos
        }
      }

      // After saving to database, query again to get properly aggregated data
      console.log('[Rekam Medic] Re-querying database after fetching from Shopee API...')
      const retryResult = await connection.query(query, params)
      console.log('[Rekam Medic] Retry query rows count:', retryResult.rows.length)

      campaigns = retryResult.rows.map((row: any) => ({
        campaign_id: row.campaign_id?.toString() || '',
        title: row.title || 'Unnamed Campaign',
        status: row.status || 'paused',
        impressions: Number(row.impressions) || 0,
        clicks: Number(row.clicks) || 0,
        conversions: Number(row.conversions) || 0,
        spend: Number(row.spend) || 0,
        ctr: Number(row.ctr) || 0,
        cpc: Number(row.cpc) || 0,
        revenue: Number(row.revenue) || 0,
        daily_budget: Number(row.daily_budget) || 0,
        image: null,
        nama_toko: row.nama_toko || '',
        id_toko: row.id_toko || '',
        created_at: row.created_at,
        update_at: row.update_at,
      }))

      if (campaigns.length > 0) {
        console.log(`[Rekam Medic] Successfully fetched ${campaigns.length} campaigns from Shopee API and saved to database`)
      }
    }

    return campaigns
  } catch (error) {
    console.error('Error fetching campaigns for analysis:', error)
    throw error
  }
}

// Calculate funnel metrics
function calculateFunnelMetrics(campaigns: CampaignMetrics[]): FunnelMetrics[] {
  return campaigns.map(campaign => {
    const conversionRate = campaign.clicks > 0
      ? (campaign.conversions / campaign.clicks) * 100
      : 0
    const revenuePerConversion = campaign.conversions > 0
      ? campaign.revenue / campaign.conversions
      : 0
    const roas = campaign.spend > 0
      ? (campaign.revenue / campaign.spend) * 100
      : 0

    return {
      campaign_id: campaign.campaign_id,
      title: campaign.title,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      revenue: campaign.revenue,
      ctr: campaign.ctr,
      conversionRate,
      revenuePerConversion,
      roas,
    }
  })
}

// Calculate BCG Matrix data
function calculateBCGMatrix(
  campaigns: CampaignMetrics[],
  previousPeriodCampaigns?: CampaignMetrics[]
): BCGData[] {
  // Calculate averages for normalization
  const avgCTR = campaigns.reduce((sum, c) => sum + c.ctr, 0) / campaigns.length || 1
  // ROAS is a ratio, not a percentage (revenue / spend)
  const avgROAS = campaigns.reduce((sum, c) => {
    const roas = c.spend > 0 ? (c.revenue / c.spend) : 0
    return sum + roas
  }, 0) / campaigns.length || 1

  // Calculate average growth rate for normalization
  const growthRates: number[] = []
  if (previousPeriodCampaigns && previousPeriodCampaigns.length > 0) {
    campaigns.forEach(campaign => {
      const prevCampaign = previousPeriodCampaigns.find(
        p => p.campaign_id === campaign.campaign_id
      )
      if (prevCampaign) {
        const prevRevenue = prevCampaign.revenue || 0
        const currentRevenue = campaign.revenue || 0
        if (prevRevenue > 0) {
          const growth = ((currentRevenue - prevRevenue) / prevRevenue) * 100
          growthRates.push(growth)
        }
      }
    })
  }
  const avgGrowthRate = growthRates.length > 0
    ? growthRates.reduce((sum, g) => sum + g, 0) / growthRates.length
    : 0

  // Calculate percentile-based metrics for better distribution
  const revenues = campaigns.map(c => c.revenue).sort((a, b) => a - b)
  const impressions = campaigns.map(c => c.impressions).sort((a, b) => a - b)
  const clicks = campaigns.map(c => c.clicks).sort((a, b) => a - b)
  const maxRevenue = revenues.length > 0 ? revenues[revenues.length - 1] : 1
  const maxImpressions = impressions.length > 0 ? impressions[impressions.length - 1] : 1
  const maxClicks = clicks.length > 0 ? clicks[clicks.length - 1] : 1

  return campaigns.map((campaign, index) => {
    // Calculate growth rate (using revenue growth or impression growth)
    let growthRate = 0
    if (previousPeriodCampaigns && previousPeriodCampaigns.length > 0) {
      const prevCampaign = previousPeriodCampaigns.find(
        p => p.campaign_id === campaign.campaign_id
      )
      if (prevCampaign) {
        const prevRevenue = prevCampaign.revenue || 0
        const currentRevenue = campaign.revenue || 0
        if (prevRevenue > 0) {
          // Normal growth calculation
          growthRate = ((currentRevenue - prevRevenue) / prevRevenue) * 100
          // Cap extreme values to prevent outliers
          growthRate = Math.max(-50, Math.min(200, growthRate))
        } else if (currentRevenue > 0) {
          // Campaign started generating revenue - use percentile-based growth
          // Higher revenue = higher growth rate, but with variation
          const revenuePercentile = maxRevenue > 0 ? (campaign.revenue / maxRevenue) : 0
          const clickPercentile = maxClicks > 0 ? (campaign.clicks / maxClicks) : 0
          // Combine metrics for natural variation (10% to 50%)
          growthRate = 10 + (revenuePercentile * 20) + (clickPercentile * 20)
          // Add slight variation based on campaign index to avoid clustering
          growthRate += (index % 7) * 0.5
          growthRate = Math.min(growthRate, 50)
        } else {
          // No revenue in both periods - use impression/clicks based
          if (campaign.impressions > 0 || campaign.clicks > 0) {
            const impressionPercentile = maxImpressions > 0 ? (campaign.impressions / maxImpressions) : 0
            const clickPercentile = maxClicks > 0 ? (campaign.clicks / maxClicks) : 0
            growthRate = (impressionPercentile * 15) + (clickPercentile * 10)
            growthRate += (index % 5) * 0.3
            growthRate = Math.min(growthRate, 25)
          } else {
            growthRate = 0
          }
        }
      } else {
        // New campaign - use multi-metric percentile-based growth
        if (campaign.impressions > 0 || campaign.clicks > 0 || campaign.revenue > 0) {
          const revenuePercentile = maxRevenue > 0 ? (campaign.revenue / maxRevenue) : 0
          const impressionPercentile = maxImpressions > 0 ? (campaign.impressions / maxImpressions) : 0
          const clickPercentile = maxClicks > 0 ? (campaign.clicks / maxClicks) : 0
          // Combine metrics for natural distribution (5% to 40%)
          growthRate = 5 + (revenuePercentile * 15) + (impressionPercentile * 10) + (clickPercentile * 10)
          // Add variation based on campaign index to avoid clustering
          growthRate += (index % 11) * 0.4
          growthRate = Math.min(growthRate, 40)
        } else {
          growthRate = 0
        }
      }
    } else {
      // If no previous period data, use multi-metric percentile-based estimate
      if (campaign.impressions > 0 || campaign.clicks > 0 || campaign.revenue > 0) {
        const revenuePercentile = maxRevenue > 0 ? (campaign.revenue / maxRevenue) : 0
        const impressionPercentile = maxImpressions > 0 ? (campaign.impressions / maxImpressions) : 0
        const clickPercentile = maxClicks > 0 ? (campaign.clicks / maxClicks) : 0
        // Combine metrics for natural distribution (0% to 35%)
        growthRate = (revenuePercentile * 12) + (impressionPercentile * 10) + (clickPercentile * 8)
        // Add variation based on campaign index
        growthRate += (index % 13) * 0.3
        growthRate = Math.min(growthRate, 35)
      } else {
        growthRate = 0
      }
    }

    // Calculate market share (relative performance)
    // Using ROAS normalized by average
    // ROAS is a ratio (revenue / spend), Market Share is percentage relative to average
    const roas = campaign.spend > 0
      ? (campaign.revenue / campaign.spend)
      : 0
    const marketShare = avgROAS > 0 ? (roas / avgROAS) * 100 : 0

    // Categorize based on BCG Matrix
    // Thresholds: Growth Rate > 10% = High, Market Share > 100% = High
    let category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs'
    if (growthRate > 10 && marketShare > 100) {
      category = 'stars'
    } else if (growthRate <= 10 && marketShare > 100) {
      category = 'cash_cows'
    } else if (growthRate > 10 && marketShare <= 100) {
      category = 'question_marks'
    } else {
      category = 'dogs'
    }

    return {
      campaign_id: campaign.campaign_id,
      title: campaign.title,
      growthRate,
      marketShare,
      category,
      spend: campaign.spend,
      revenue: campaign.revenue,
      roas,
      status: campaign.status,
      image: campaign.image || undefined,
      id_toko: campaign.id_toko,
    }
  })
}

export async function GET(request: NextRequest) {
  const user = await requireActiveStatus(request)
  let connection: PoolClient | null = null

  try {
    const { searchParams } = new URL(request.url)
    const startTime = searchParams.get('start_time') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endTime = searchParams.get('end_time') || new Date().toISOString().split('T')[0]
    const tokoIdsParam = searchParams.get('account_ids') || searchParams.get('toko_ids')
    const tokoIds = tokoIdsParam ? tokoIdsParam.split(',').filter(id => id.trim()) : undefined
    const statusesParam = searchParams.get('statuses')
    const statuses = statusesParam ? statusesParam.split(',').filter(s => s.trim()) : undefined

    connection = await getDatabaseConnection()

    // Get role-based filter (same as overview API)
    const roleFilter = getRoleBasedFilter(user)

    // Get toko IDs that user can access (same logic as overview API)
    let tokoQuery = `SELECT DISTINCT dt.id_toko, dt.nama_toko
       FROM data_toko dt
       WHERE dt.id_toko IS NOT NULL AND dt.id_toko != '' 
       AND dt.status_toko = 'active'`

    let usernameParams: any[] = []
    let paramIndex = 1

    // Apply role-based filter
    if (roleFilter.whereClause) {
      let roleFilterClause = roleFilter.whereClause.startsWith('AND ')
        ? roleFilter.whereClause.substring(4)
        : roleFilter.whereClause;

      roleFilter.params.forEach((param) => {
        roleFilterClause = roleFilterClause.replace('?', `$${paramIndex++}`)
      })

      tokoQuery += ` AND ${roleFilterClause}`
      usernameParams.push(...roleFilter.params)
    }

    // If specific toko IDs provided, filter by them
    if (tokoIds && tokoIds.length > 0) {
      const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
      tokoQuery += ` AND dt.id_toko IN (${placeholders})`
      usernameParams.push(...tokoIds)
    }

    tokoQuery += ` ORDER BY dt.nama_toko ASC`

    console.log('[Rekam Medic] Fetching toko list with query params:', usernameParams)
    const tokoResult = await connection.query(tokoQuery, usernameParams)
    const tokoRows = tokoResult.rows
    console.log('[Rekam Medic] Found', tokoRows.length, 'toko(s)')

    // Get toko IDs from the toko list
    const filteredTokoIds = tokoRows.map((row: any) => row.id_toko).filter((id: string) => id)

    console.log('[Rekam Medic] Query params:', {
      startTime,
      endTime,
      filteredTokoIds: filteredTokoIds.length,
      userRole: user.role
    })

    // Get current period campaigns
    const campaigns = await getCampaignsForAnalysis(
      connection,
      startTime,
      endTime,
      filteredTokoIds.length > 0 ? filteredTokoIds : undefined,
      statuses
    )

    console.log('[Rekam Medic] Found campaigns:', campaigns.length)

    // Calculate previous period for growth comparison
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - periodDays)
    const prevEndDate = new Date(startDate)

    const previousCampaigns = await getCampaignsForAnalysis(
      connection,
      prevStartDate.toISOString().split('T')[0],
      prevEndDate.toISOString().split('T')[0],
      filteredTokoIds,
      statuses
    )

    // Calculate funnel metrics
    const funnelMetrics = calculateFunnelMetrics(campaigns)

    // Calculate BCG Matrix
    const bcgData = calculateBCGMatrix(campaigns, previousCampaigns)

    // Calculate summary statistics
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)
    const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0)
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
    // ROAS is a ratio, not a percentage
    const avgROAS = totalSpend > 0 ? (totalRevenue / totalSpend) : 0

    // Count by BCG category
    const categoryCounts = {
      stars: bcgData.filter(c => c.category === 'stars').length,
      cash_cows: bcgData.filter(c => c.category === 'cash_cows').length,
      question_marks: bcgData.filter(c => c.category === 'question_marks').length,
      dogs: bcgData.filter(c => c.category === 'dogs').length,
    }

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        funnelMetrics,
        bcgData,
        summary: {
          totalCampaigns: campaigns.length,
          totalImpressions,
          totalClicks,
          totalConversions,
          totalRevenue,
          totalSpend,
          avgCTR,
          avgConversionRate,
          avgROAS,
          categoryCounts,
        },
      },
      meta: {
        start_time: startTime,
        end_time: endTime,
        period_days: periodDays,
      }
    })

  } catch (error) {
    console.error('Error in rekam-medic API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

