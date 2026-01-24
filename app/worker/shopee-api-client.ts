/**
 * Shopee API Client
 * 
 * Client untuk fetch data campaign dari Shopee API dengan rate limiting
 */

import { SHOPEE_API_RATE_LIMIT, API_TIMEOUT, RETRY_CONFIG } from './config'
import { logger } from './logger'

interface RateLimiter {
  requests: number[]
  maxRequests: number
  windowMs: number
}

// Rate limiter per toko
const rateLimiters = new Map<string, RateLimiter>()

/**
 * Get or create rate limiter for toko
 */
function getRateLimiter(tokoId: string): RateLimiter {
  if (!rateLimiters.has(tokoId)) {
    rateLimiters.set(tokoId, {
      requests: [],
      maxRequests: SHOPEE_API_RATE_LIMIT,
      windowMs: 1000, // 1 second window
    })
  }
  return rateLimiters.get(tokoId)!
}

/**
 * Wait if rate limit is reached
 */
async function waitForRateLimit(tokoId: string): Promise<void> {
  const limiter = getRateLimiter(tokoId)
  const now = Date.now()

  // Remove old requests outside the window
  limiter.requests = limiter.requests.filter(timestamp => now - timestamp < limiter.windowMs)

  // If at limit, wait until oldest request expires
  if (limiter.requests.length >= limiter.maxRequests) {
    const oldestRequest = limiter.requests[0]
    const waitTime = limiter.windowMs - (now - oldestRequest)
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime))
      return waitForRateLimit(tokoId) // Recursive check
    }
  }

  // Record this request
  limiter.requests.push(now)
}

/**
 * Fetch campaign data from Shopee API with retry
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryCount: number = 0
): Promise<any> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    if (retryCount < RETRY_CONFIG.MAX_RETRIES) {
      const delay = RETRY_CONFIG.RETRY_DELAY_MS * (retryCount + 1)
      logger.warn(`API call failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, retryCount + 1)
    }
    throw error
  }
}

/**
 * Get toko name from database
 */
export async function getTokoName(tokoId: string): Promise<string | null> {
  const { getDatabaseConnection } = await import('@/lib/db')
  const connection = await getDatabaseConnection()

  try {
    const result = await connection.query(
      `SELECT nama_toko FROM data_toko WHERE id_toko = $1`,
      [tokoId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0].nama_toko
  } finally {
    connection.release()
  }
}

/**
 * Get cookies for toko from database
 */
export async function getCookiesForToko(tokoId: string): Promise<string | null> {
  const { getDatabaseConnection } = await import('@/lib/db')
  const connection = await getDatabaseConnection()

  try {
    const result = await connection.query(
      `SELECT cookies FROM data_toko WHERE id_toko = $1 AND status_cookies = 'aktif'`,
      [tokoId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0].cookies
  } finally {
    connection.release()
  }
}

/**
 * Get saldo (ad balance) for toko from Shopee API
 * 
 * @param tokoId - Toko ID
 * @param cookies - Cookies for authentication (optional, will fetch if not provided)
 * @returns Saldo in Rupiah (already divided by 100000)
 */
export async function getSaldoForToko(
  tokoId: string,
  cookies?: string
): Promise<number> {
  try {
    // Wait for rate limit
    await waitForRateLimit(tokoId)

    // Get cookies if not provided
    let authCookies: string | undefined = cookies
    if (!authCookies) {
      const fetchedCookies = await getCookiesForToko(tokoId)
      if (!fetchedCookies) {
        logger.warn(`No active cookies found for toko ${tokoId}`)
        return 0
      }
      authCookies = fetchedCookies
    }

    // Clean cookies
    const cleanedCookies = cleanCookies(authCookies)

    // Call Shopee API get_ads_data
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/meta/get_ads_data/'
    const headers = {
      'Cookie': cleanedCookies,
      'Content-Type': 'application/json'
    }

    const requestPayload = {
      info_type_list: ["ads_expense", "ads_credit", "campaign_day", "has_ads", "incentive", "ads_toggle"]
    }

    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
    })

    // Extract saldo from response
    // Saldo ada di data.ads_credit.total (dalam format * 100000, perlu dibagi 100000)
    const saldoValue = response.data?.ads_credit?.total || response.ads_credit?.total || 0
    const saldoInRupiah = saldoValue / 100000

    logger.debug(`Fetched saldo for toko ${tokoId}: Rp${saldoInRupiah.toLocaleString('id-ID')}`)
    return saldoInRupiah
  } catch (error) {
    logger.error(`Error fetching saldo for toko ${tokoId}`, error)
    return 0
  }
}

/**
 * Convert date string to timestamp (Unix timestamp in seconds)
 */
function convertDateToTimestamp(dateStr: string, isStart: boolean = true): number {
  const date = new Date(dateStr)
  if (isStart) {
    date.setHours(0, 0, 0, 0) // Start of day
  } else {
    date.setHours(23, 59, 59, 999) // End of day
  }
  return Math.floor(date.getTime() / 1000)
}

/**
 * Clean cookies string
 */
function cleanCookies(cookies: string): string {
  return cookies
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(';')
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .join('; ')
}

/**
 * Fetch all campaigns data from Shopee API for a toko
 * 
 * @param tokoId - Toko ID
 * @param cookies - Cookies for authentication (optional, will fetch if not provided)
 * @returns Map of campaign_id to campaign data with metrics
 */
export async function fetchAllCampaignsData(
  tokoId: string,
  cookies?: string
): Promise<Map<string, {
  campaign_id: string
  campaign_name: string
  daily_budget?: number
  saldo?: number
  broad_gmv?: number
  broad_order?: number
  broad_roi?: number
  click?: number
  cost?: number
  cpc?: number
  ctr?: number
  impression?: number
  view?: number
  cpm?: number
}>> {
  const campaignDataMap = new Map<string, any>()

  try {
    // Wait for rate limit
    await waitForRateLimit(tokoId)

    // Get cookies if not provided
    let authCookies: string | undefined = cookies
    if (!authCookies) {
      const fetchedCookies = await getCookiesForToko(tokoId)
      if (!fetchedCookies) {
        logger.warn(`No active cookies found for toko ${tokoId}`)
        return campaignDataMap
      }
      authCookies = fetchedCookies
    }

    // Clean cookies
    const cleanedCookies = cleanCookies(authCookies)

    // Get today's date range (start and end of today)
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)

    const startTime = convertDateToTimestamp(startOfDay.toISOString(), true)
    const endTime = convertDateToTimestamp(endOfDay.toISOString(), false)

    // Call Shopee API with new endpoint
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
    const headers = {
      'Cookie': cleanedCookies,
      'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
      'Content-Type': 'application/json',
    }

    const payload = {
      start_time: startTime,
      end_time: endTime,
      filter_list: [{
        campaign_type: "product_homepage",
        state: "all",
        search_term: "",
        product_placement_list: ["all", "search_product", "targeting"],
        npa_filter: "exclude_npa",
        is_valid_rebate_only: false
      }],
      offset: 0,
      limit: 10000
    }

    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    // Parse response - look for entry_list
    const entryList = response.data?.entry_list || response.entry_list || []

    if (!Array.isArray(entryList)) {
      logger.warn(`Unexpected response structure. entry_list is not an array. Response keys: ${Object.keys(response).join(', ')}`)
      return campaignDataMap
    }

    // Get saldo for this toko (saldo is per toko, not per campaign)
    let saldo = 0
    try {
      saldo = await getSaldoForToko(tokoId, authCookies)
    } catch (error) {
      logger.warn(`Failed to fetch saldo for toko ${tokoId}, continuing without saldo`, error)
    }

    // Process each entry in entry_list
    for (const entry of entryList) {
      const campaign = entry.campaign
      const report = entry.report

      if (!campaign || !campaign.campaign_id) {
        continue
      }

      const campaignId = campaign.campaign_id.toString()

      // Extract metrics from report
      const metrics: any = {
        campaign_id: campaignId,
        campaign_name: campaign.name || campaign.campaign_name || '', // Use name or campaign_name
        daily_budget: campaign.daily_budget || 0, // Current budget from campaign data
        saldo: saldo, // Saldo is per toko, same for all campaigns in the same toko
        broad_gmv: report?.broad_gmv || report?.gmv || 0,
        broad_order: report?.broad_order || report?.order || report?.broad_order_count || 0,
        broad_roi: report?.broad_roi || report?.roi || 0,
        click: report?.click || report?.clicks || report?.click_count || 0,
        cost: report?.cost || report?.spend || report?.total_cost || 0,
        cpc: report?.cpc || report?.cost_per_click || 0,
        ctr: report?.ctr || report?.click_through_rate || 0,
        impression: report?.impression || report?.impressions || report?.impression_count || 0,
        view: report?.view || report?.views || report?.view_count || 0,
      }

      // Calculate CPM: cost / impression * 1000
      if (metrics.impression && metrics.cost) {
        metrics.cpm = (metrics.cost / metrics.impression) * 1000
      }

      campaignDataMap.set(campaignId, metrics)
    }

    logger.debug(`Fetched ${campaignDataMap.size} campaigns data for toko ${tokoId} (saldo: Rp${saldo.toLocaleString('id-ID')})`)
    return campaignDataMap
  } catch (error) {
    logger.error(`Error fetching campaigns data for toko ${tokoId}`, error)
    return campaignDataMap
  }
}

/**
 * Fetch campaign data from Shopee API
 * 
 * @param tokoId - Toko ID
 * @param campaignId - Campaign ID
 * @param cookies - Cookies for authentication (optional, will fetch if not provided)
 * @returns Campaign data with metrics
 */
export async function fetchCampaignData(
  tokoId: string,
  campaignId: string,
  cookies?: string
): Promise<{
  campaign_id: string
  broad_gmv?: number
  broad_order?: number
  broad_roi?: number
  click?: number
  cost?: number
  cpc?: number
  ctr?: number
  impression?: number
  view?: number
  cpm?: number
} | null> {
  try {
    // Use fetchAllCampaignsData and get specific campaign
    const allCampaignsData = await fetchAllCampaignsData(tokoId, cookies)
    const campaignData = allCampaignsData.get(campaignId)

    if (!campaignData) {
      logger.warn(`Campaign ${campaignId} not found in API response for toko ${tokoId}`)
      return null
    }

    return campaignData
  } catch (error) {
    logger.error(`Error fetching campaign data for campaign ${campaignId}`, error)
    return null
  }
}

/**
 * Manage Shopee Ads (Pause, Resume, Stop, Edit Budget)
 * Direct call to Shopee API, used by background worker to bypass internal API auth
 */
export async function manageShopeeAds(
  tokoId: string,
  action: 'pause' | 'resume' | 'stop' | 'edit_budget',
  campaignId: string | number,
  additionalData?: { new_budget?: number },
  cookies?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // Wait for rate limit
    await waitForRateLimit(tokoId)

    // Get cookies if not provided
    let authCookies: string | undefined = cookies
    if (!authCookies) {
      const fetchedCookies = await getCookiesForToko(tokoId)
      if (!fetchedCookies) {
        throw new Error(`No active cookies found for toko ${tokoId}`)
      }
      authCookies = fetchedCookies
    }

    const cleanedCookies = cleanCookies(authCookies)
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/mass_edit/'
    const headers = {
      'Cookie': cleanedCookies,
      'Content-Type': 'application/json',
      'User-Agent': 'ShopeeID/3.15.24 (com.beeasy.shopee.id; build:3.15.24; iOS 16.7.2) Alamofire/5.0.5 language=id app_type=1',
    }

    const campaignIdInt = typeof campaignId === 'string' ? parseInt(campaignId, 10) : campaignId
    let requestPayload: any = {
      campaign_id_list: [campaignIdInt]
    }

    if (action === 'pause') {
      requestPayload.type = 'pause'
    } else if (action === 'resume') {
      requestPayload.type = 'resume'
    } else if (action === 'stop') {
      requestPayload.type = 'stop'
    } else if (action === 'edit_budget') {
      if (additionalData?.new_budget === undefined) {
        throw new Error('new_budget is required for edit_budget action')
      }
      requestPayload.type = 'change_budget'
      requestPayload.change_budget = {
        daily_budget: additionalData.new_budget
      }
    } else {
      throw new Error(`Unsupported action: ${action}`)
    }

    const response = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
    })

    // Shopee API returns code 0 for success
    if (response.code !== 0) {
      const errorMessage = response.msg || response.message || 'API returned error'
      throw new Error(errorMessage)
    }

    return {
      success: true,
      message: `${action} successful`,
      data: response.data || response
    }
  } catch (error) {
    logger.error(`Error managing Shopee ads for toko ${tokoId}, action ${action}`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


