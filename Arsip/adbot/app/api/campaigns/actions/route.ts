import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { randomUUID } from 'crypto'
import { sanitizeErrorForLogging } from '@/lib/db-errors'

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
  
  // pauseads, resumeads, stopads, editbudget - semua menggunakan endpoint homepage/mass_edit/
  if (endpoint === 'pauseads' || endpoint === 'resumeads' || endpoint === 'stopads' || endpoint === 'editbudget') {
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/mass_edit/'
    const headers = {
      'Cookie': cleanedCookies,
      'Content-Type': 'application/json'
    }
    
    const campaignId = parseInt(payload.campaign || payload.campaign_id)
    let requestPayload: any = {
      campaign_id_list: [campaignId]
    }
    
    if (endpoint === 'pauseads') {
      requestPayload.type = 'pause'
    } else if (endpoint === 'resumeads') {
      requestPayload.type = 'resume'
    } else if (endpoint === 'stopads') {
      requestPayload.type = 'stop'
    } else if (endpoint === 'editbudget') {
      requestPayload.type = 'change_budget'
      requestPayload.change_budget = {
        daily_budget: parseInt(payload.new_budget)
      }
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload)
    })
    
    const responseText = await response.text()
    let result: any = {}
    
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${responseText}`)
    }
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`)
    }
    
    // Check if response indicates error even with 200 status
    if (result.code && result.code !== 0) {
      throw new Error(`API returned error: ${result.msg || 'Unknown error'} - ${JSON.stringify(result.validation_error_list || [])}`)
    }
    
    // Transform response to match expected format
    return {
      success: true,
      status: 200,
      data: result?.data || result,
      message: result?.message || result?.msg || `Success ${endpoint}`
    }
  }
  
  // gmvmax, iklanautogmvmax, iklanview - semua menggunakan endpoint publish
  if (endpoint === 'gmvmax' || endpoint === 'iklanautogmvmax' || endpoint === 'iklanview') {
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/live_stream/publish/'
    const headers = {
      'Cookie': cleanedCookies,
      'Content-Type': 'application/json'
    }
    
    // Generate UUID untuk reference_id
    const uuid = randomUUID()
    
    // Get start_time from payload (timestamp) atau default ke midnight today
    let startTimeTimestamp: number
    if (payload.start_time !== undefined && payload.start_time !== null) {
      startTimeTimestamp = parseInt(payload.start_time)
    } else {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
      startTimeTimestamp = Math.floor(today.getTime() / 1000)
    }
    
    // Get end_time from payload (timestamp untuk periode custom, atau detik untuk time slot)
    // Jika start_time dan end_time adalah timestamp (periode custom), gunakan sebagai end_time campaign
    // Jika end_time adalah detik (time slot), gunakan untuk time_slot_list
    let endTimeTimestamp = 0
    let endTimeInSeconds = 0
    
    if (payload.end_time !== undefined && payload.end_time !== null) {
      const endTimeValue = parseInt(payload.end_time)
      
      // Jika end_time adalah timestamp besar (lebih dari 86400 = 1 hari dalam detik), 
      // berarti ini adalah periode custom (timestamp)
      if (endTimeValue > 86400) {
        endTimeTimestamp = endTimeValue
        endTimeInSeconds = 86340 // Default time slot untuk periode custom
      } else {
        // Jika end_time kecil, berarti ini adalah time slot dalam detik
        endTimeInSeconds = endTimeValue
      }
    } else {
    // Untuk iklanview, jika end_time tidak di-set, gunakan default 86340
      if (endpoint === 'iklanview') {
      endTimeInSeconds = 86340 // Default 23:59:00 untuk max_view
      }
    }
    
    let campaignPayload: any = {
      daily_budget: parseInt(payload.budget),
      start_time: startTimeTimestamp,
      end_time: endTimeTimestamp, // 0 untuk unlimited, atau timestamp untuk custom periode
      time_slot_list: [
        {
          start_time: 0,
          end_time: endTimeInSeconds // Gunakan end_time dari payload atau default
        }
      ],
      name: payload.unique_title || payload.title
    }
    
    if (endpoint === 'gmvmax') {
      campaignPayload.objective = 'max_gmv_roi_two'
      campaignPayload.roi_two_target = parseInt(payload.roas) // ROAS sudah dalam format yang benar
    } else if (endpoint === 'iklanautogmvmax') {
      campaignPayload.objective = 'max_gmv'
      campaignPayload.target_broad_roi = 0
    } else if (endpoint === 'iklanview') {
      campaignPayload.objective = 'max_view'
    }
    
    const requestPayload = {
      campaign: campaignPayload,
      reference_id: uuid,
      header: {}
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
    
    const result = await response.json()
    
    // Transform response to match expected format
    return {
      success: true,
      status: 200,
      data: result?.data || result,
      message: result?.message || `Success ${endpoint}`
    }
  }
  
  // Jika endpoint tidak dikenali
  throw new Error(`Unknown endpoint: ${endpoint}. Supported endpoints: pauseads, resumeads, stopads, editbudget, gmvmax, iklanautogmvmax, iklanview`)
}

// Function to call Shopee product/publish/ API (for single product manual mode)
async function callShopeeProductPublish(cookies: string, dailyBudget: number, roiTwoTarget: number, startTime: number, endTime: number, itemId: string, rapidBoost: boolean = false) {
  const cleanedCookies = cleanCookies(cookies)
  const uuid = randomUUID()
  
  const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/product/publish/'
  const headers = {
    'Cookie': cleanedCookies,
    'Content-Type': 'application/json'
  }
  
  // If start_time is 0 (unlimited), set to current timestamp (midnight today WIB)
  let finalStartTime = startTime
  let finalEndTime = endTime
  if (startTime === 0) {
    // Get current date in WIB (UTC+7)
    // Method: Get UTC time, calculate WIB time, find midnight WIB, convert back to UTC timestamp
    const now = new Date()
    const utcTime = now.getTime()
    const wibOffset = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
    
    // Get current WIB time (UTC + 7 hours)
    const currentWibTime = utcTime + wibOffset
    
    // Calculate milliseconds since midnight in WIB
    const msPerDay = 24 * 60 * 60 * 1000
    const msSinceMidnightWib = currentWibTime % msPerDay
    
    // Subtract to get midnight WIB timestamp (in milliseconds)
    const midnightWibTime = currentWibTime - msSinceMidnightWib
    
    // Convert back to UTC timestamp by subtracting the offset
    const midnightWibUtc = midnightWibTime - wibOffset
    
    finalStartTime = Math.floor(midnightWibUtc / 1000)
    // For unlimited, end_time = 0
    finalEndTime = 0
  }
  
  const requestPayload = {
    reference_id: uuid,
    campaign: {
      daily_budget: dailyBudget,
      product_placement: "all",
      roi_two_target: roiTwoTarget,
      bidding_strategy: "roi_two",
      product_selection: "manual",
      start_time: finalStartTime,
      end_time: finalEndTime,
      is_npa: false,
      potential_product: {
        is_good_potential: false,
        is_low_price: false
      },
      rapid_boost: rapidBoost && roiTwoTarget > 0 // Only true if rapidBoost is enabled AND roiTwoTarget > 0 (GMV Max ROAS)
    },
    ads_list: [
      {
        item_id: parseInt(itemId)
      }
    ],
    header: {}
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestPayload)
  })
  
  const responseText = await response.text()
  let result: any = {}
  
  try {
    result = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${responseText}`)
  }
  
  // Log Shopee API response
  console.log('========================================')
  console.log('[Shopee API Response] Manual Mode (Single Product) - product/publish/')
  console.log('Request Payload:', JSON.stringify(requestPayload, null, 2))
  console.log('Response Status:', response.status)
  console.log('Response Body:', JSON.stringify(result, null, 2))
  console.log('========================================')
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`)
  }
  
  // Check if response indicates error even with 200 status
  if (result.code && result.code !== 0) {
    throw new Error(`API returned error: ${result.msg || 'Unknown error'} - ${JSON.stringify(result.validation_error_list || [])}`)
  }
  
  return {
    success: true,
    status: 200,
    data: result?.data || result,
    message: result?.message || result?.msg || 'Success product/publish/'
  }
}

// Function to call Shopee product/mass_create/ API (for multiple products manual mode)
async function callShopeeProductMassCreate(cookies: string, dailyBudget: number, roiTwoTarget: number, startTime: number, endTime: number, itemIds: string[], rapidBoost: boolean = false) {
  const cleanedCookies = cleanCookies(cookies)
  const uuid = randomUUID()
  
  const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/product/mass_create/'
  const headers = {
    'Cookie': cleanedCookies,
    'Content-Type': 'application/json'
  }
  
  // If start_time is 0 (unlimited), set to current timestamp (midnight today WIB)
  let finalStartTime = startTime
  let finalEndTime = endTime
  if (startTime === 0) {
    // Get current date in WIB (UTC+7)
    // Method: Get UTC time, calculate WIB time, find midnight WIB, convert back to UTC timestamp
    const now = new Date()
    const utcTime = now.getTime()
    const wibOffset = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
    
    // Get current WIB time (UTC + 7 hours)
    const currentWibTime = utcTime + wibOffset
    
    // Calculate milliseconds since midnight in WIB
    const msPerDay = 24 * 60 * 60 * 1000
    const msSinceMidnightWib = currentWibTime % msPerDay
    
    // Subtract to get midnight WIB timestamp (in milliseconds)
    const midnightWibTime = currentWibTime - msSinceMidnightWib
    
    // Convert back to UTC timestamp by subtracting the offset
    const midnightWibUtc = midnightWibTime - wibOffset
    
    finalStartTime = Math.floor(midnightWibUtc / 1000)
    // For unlimited, end_time = 0
    finalEndTime = 0
  }
  
  // Create campaign_list with same settings for each product
  const campaignList = itemIds.map(itemId => ({
    item_id: parseInt(itemId),
    daily_budget: dailyBudget,
    product_selection: "manual",
    start_time: finalStartTime,
    end_time: finalEndTime,
    bidding_strategy: "roi_two",
    creative: false,
    is_npa: false,
    roi_two_target: {
      target_value: roiTwoTarget,
      log_key: null
    },
    potential_product: {
      is_good_potential: false,
      is_low_price: false
    },
    rapid_boost: rapidBoost && roiTwoTarget > 0 // Only true if rapidBoost is enabled AND roiTwoTarget > 0 (GMV Max ROAS)
  }))
  
  const requestPayload = {
    reference_id: uuid,
    campaign_list: campaignList,
    header: {}
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestPayload)
  })
  
  const responseText = await response.text()
  let result: any = {}
  
  try {
    result = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${responseText}`)
  }
  
  // Log Shopee API response
  console.log('========================================')
  console.log('[Shopee API Response] Manual Mode (Multiple Products) - product/mass_create/')
  console.log('Request Payload:', JSON.stringify(requestPayload, null, 2))
  console.log('Response Status:', response.status)
  console.log('Response Body:', JSON.stringify(result, null, 2))
  console.log('========================================')
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`)
  }
  
  // Check if response indicates error even with 200 status
  if (result.code && result.code !== 0) {
    throw new Error(`API returned error: ${result.msg || 'Unknown error'} - ${JSON.stringify(result.validation_error_list || [])}`)
  }
  
  return {
    success: true,
    status: 200,
    data: result?.data || result,
    message: result?.message || result?.msg || 'Success product/mass_create/'
  }
}

// Function to get existing automatic campaign_id from Shopee API
async function getExistingAutomaticCampaignId(cookies: string): Promise<number | null> {
  try {
    const cleanedCookies = cleanCookies(cookies)
    
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/homepage/query/'
    const headers = {
      'Cookie': cleanedCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Content-Type': 'application/json'
    }
    
    // Use very wide date range to catch all campaigns including ended ones
    // Use same date range logic as shopee/route.ts (convertDateToTimestamp)
    const now = new Date()
    const oneYearAgo = new Date(now)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    oneYearAgo.setHours(0, 0, 0, 0) // Start of day
    
    const oneYearFuture = new Date(now)
    oneYearFuture.setFullYear(oneYearFuture.getFullYear() + 1)
    oneYearFuture.setHours(23, 59, 59, 999) // End of day
    
    const startTimestamp = Math.floor(oneYearAgo.getTime() / 1000)
    const endTimestamp = Math.floor(oneYearFuture.getTime() / 1000)
    
    console.log(`[getExistingAutomaticCampaignId] Searching campaigns from ${oneYearAgo.toISOString()} to ${oneYearFuture.toISOString()}`)
    
    // Try multiple filter configurations to find the campaign
    const filterConfigs = [
      {
        campaign_type: "product_homepage",
        state: "all", // Include all states: ongoing, ended, paused, etc.
        search_term: "",
        product_placement_list: ["all", "search_product", "targeting"],
        npa_filter: "all", // Include all NPA to catch all campaigns
        is_valid_rebate_only: false
      },
      {
        campaign_type: "product_homepage",
        state: "all",
        search_term: "iklan produk otomatis", // Try with search term
        product_placement_list: ["all", "search_product", "targeting"],
        npa_filter: "all",
        is_valid_rebate_only: false
      },
      {
        campaign_type: "product_homepage",
        state: "all",
        search_term: "",
        product_placement_list: ["all"],
        npa_filter: "all",
        is_valid_rebate_only: false
      }
    ]
    
    for (const filterConfig of filterConfigs) {
      const payload = {
        start_time: startTimestamp,
        end_time: endTimestamp,
        filter_list: [filterConfig],
        offset: 0,
        limit: 1000
      }
      
      console.log(`[getExistingAutomaticCampaignId] Trying filter config: state=${filterConfig.state}, search_term="${filterConfig.search_term}"`)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        console.log(`[getExistingAutomaticCampaignId] Failed to fetch campaigns with filter: ${response.status}`)
        continue // Try next filter config
      }
      
      const result = await response.json()
      const entryList = result.data?.entry_list || result.entry_list || []
      
      console.log(`[getExistingAutomaticCampaignId] Found ${entryList.length} campaigns in response`)
      
      // Log first few campaigns for debugging
      if (entryList.length > 0) {
        console.log(`[getExistingAutomaticCampaignId] Sample campaigns (first 10):`)
        entryList.slice(0, 10).forEach((entry: any, index: number) => {
          const title = entry.title || 'N/A'
          const state = entry.state || 'N/A'
          const campaignId = entry.campaign?.campaign_id || entry.campaign_id || 'N/A'
          console.log(`  [${index + 1}] ID: ${campaignId}, Title: "${title}", State: ${state}`)
        })
      }
      
      // Find campaign with title containing "iklan produk otomatis" (case-insensitive, any status)
      for (const entry of entryList) {
        const title = entry.title || ''
        const state = entry.state || ''
        const titleLower = title.toLowerCase()
        
        // Check for variations of "iklan produk otomatis"
        if (titleLower.includes('iklan produk otomatis') || 
            titleLower.includes('iklan produk automatis') ||
            titleLower.includes('iklan otomatis') ||
            titleLower.includes('produk otomatis')) {
          const campaignId = entry.campaign?.campaign_id || entry.campaign_id
          if (campaignId) {
            console.log(`[getExistingAutomaticCampaignId] ✓ Found existing automatic campaign: ${campaignId}, title: "${title}", state: "${state}"`)
            return parseInt(campaignId.toString())
          }
        }
      }
      
      console.log(`[getExistingAutomaticCampaignId] No campaign matching "iklan produk otomatis" found in ${entryList.length} campaigns`)
    }
    
    console.log('[getExistingAutomaticCampaignId] No automatic campaign found after trying all filter configs')
    return null
  } catch (error) {
    console.error('[getExistingAutomaticCampaignId] Error:', error)
    return null
  }
}

// Function to call Shopee product/publish/ API (for automatic mode)
async function callShopeeProductPublishAuto(cookies: string, dailyBudget: number, roiTwoTarget: number, startTime: number, endTime: number) {
  const cleanedCookies = cleanCookies(cookies)
  const uuid = randomUUID()
  
  const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/product/publish/'
  const headers = {
    'Cookie': cleanedCookies,
    'Content-Type': 'application/json'
  }
  
  // If start_time is 0 (unlimited), set to current timestamp (midnight today WIB)
  let finalStartTime = startTime
  let finalEndTime = endTime
  if (startTime === 0) {
    // Get current date in WIB (UTC+7)
    // Method: Get UTC time, calculate WIB time, find midnight WIB, convert back to UTC timestamp
    const now = new Date()
    const utcTime = now.getTime()
    const wibOffset = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
    
    // Get current WIB time (UTC + 7 hours)
    const currentWibTime = utcTime + wibOffset
    
    // Calculate milliseconds since midnight in WIB
    const msPerDay = 24 * 60 * 60 * 1000
    const msSinceMidnightWib = currentWibTime % msPerDay
    
    // Subtract to get midnight WIB timestamp (in milliseconds)
    const midnightWibTime = currentWibTime - msSinceMidnightWib
    
    // Convert back to UTC timestamp by subtracting the offset
    const midnightWibUtc = midnightWibTime - wibOffset
    
    finalStartTime = Math.floor(midnightWibUtc / 1000)
    // For unlimited, end_time = 0
    finalEndTime = 0
  }
  
  const requestPayload = {
    reference_id: uuid,
    campaign: {
      start_time: finalStartTime,
      end_time: finalEndTime,
      daily_budget: dailyBudget,
      campaign_id: null,
      bidding_strategy: "roi_two",
      product_selection: "auto",
      product_placement: "all",
      roi_two_target: roiTwoTarget
    },
    ads_list: [],
    header: {}
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestPayload)
  })
  
  const responseText = await response.text()
  let result: any = {}
  
  try {
    result = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${responseText}`)
  }
  
  // Log Shopee API response
  console.log('========================================')
  console.log('[Shopee API Response] Automatic Mode - product/publish/')
  console.log('Request Payload:', JSON.stringify(requestPayload, null, 2))
  console.log('Response Status:', response.status)
  console.log('Response Body:', JSON.stringify(result, null, 2))
  console.log('========================================')
  
  // Check for error code 496000011: "has existing product gms campaign" BEFORE checking response.ok
  // This error can occur even with HTTP 500 status
  const hasExistingCampaignError = result.data?.result_list?.some((item: any) => 
    item.code === 496000011 || 
    (item.msg && item.msg.includes('has existing product gms campaign'))
  )
  
  if (hasExistingCampaignError) {
    console.log('[callShopeeProductPublishAuto] Error: has existing product gms campaign, attempting to get campaign_id...')
    
    // Get existing campaign_id from "Iklan produk otomatis"
    const existingCampaignId = await getExistingAutomaticCampaignId(cookies)
    
    if (existingCampaignId) {
      console.log(`[callShopeeProductPublishAuto] Retrying with campaign_id: ${existingCampaignId}`)
      
      // Retry with campaign_id
      const retryPayload = {
        ...requestPayload,
        campaign: {
          ...requestPayload.campaign,
          campaign_id: existingCampaignId
        }
      }
      
      const retryResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(retryPayload)
      })
      
      const retryResponseText = await retryResponse.text()
      let retryResult: any = {}
      
      try {
        retryResult = JSON.parse(retryResponseText)
      } catch (e) {
        throw new Error(`Retry API call failed: ${retryResponse.status} ${retryResponse.statusText} - ${retryResponseText}`)
      }
      
      // Log retry response
      console.log('========================================')
      console.log('[Shopee API Response] Automatic Mode - product/publish/ (RETRY with campaign_id)')
      console.log('Request Payload:', JSON.stringify(retryPayload, null, 2))
      console.log('Response Status:', retryResponse.status)
      console.log('Response Body:', JSON.stringify(retryResult, null, 2))
      console.log('========================================')
      
      if (!retryResponse.ok) {
        throw new Error(`Retry API call failed: ${retryResponse.status} ${retryResponse.statusText} - ${JSON.stringify(retryResult)}`)
      }
      
      if (retryResult.code && retryResult.code !== 0) {
        throw new Error(`Retry API returned error: ${retryResult.msg || 'Unknown error'} - ${JSON.stringify(retryResult.validation_error_list || [])}`)
      }
      
      return {
        success: true,
        status: 200,
        data: retryResult?.data || retryResult,
        message: retryResult?.message || retryResult?.msg || 'Success product/publish/ (auto) - retry with campaign_id'
      }
    } else {
      console.log('[callShopeeProductPublishAuto] Could not find existing automatic campaign_id')
    }
  }
  
  // Check response status after handling retry logic
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`)
  }
  
  // Check if response indicates error even with 200 status
  if (result.code && result.code !== 0) {
    throw new Error(`API returned error: ${result.msg || 'Unknown error'} - ${JSON.stringify(result.validation_error_list || [])}`)
  }
  
  return {
    success: true,
    status: 200,
    data: result?.data || result,
    message: result?.message || result?.msg || 'Success product/publish/ (auto)'
  }
}

// Function to get account cookies by id_toko
async function getAccountCookies(connection: PoolClient, idToko: string) {
  try {
    const result = await connection.query(
      'SELECT cookies FROM data_toko WHERE id_toko = $1 AND cookies IS NOT NULL AND cookies != \'\'',
      [idToko]
    )
    
    const toko = result.rows
    return toko.length > 0 ? toko[0].cookies : null
  } catch (error) {
    throw error
  }
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null
  
  try {
    const body = await request.json()
    const { action, campaign_id, account_username, id_toko, new_budget } = body
    
    if (!action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'action is required' 
        },
        { status: 400 }
      )
    }

    // Use id_toko if provided, otherwise fallback to account_username
    const tokoId = id_toko || account_username

    // For create_campaign, we don't need campaign_id and toko_id
    if (action !== 'create_campaign' && (!campaign_id || !tokoId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'campaign_id and id_toko are required for this action' 
        },
        { status: 400 }
      )
    }
    
    // Create database connection
    connection = await getDatabaseConnection()
    
    // Get account cookies (not needed for create_campaign)
    let cookies = null
    if (action !== 'create_campaign') {
      cookies = await getAccountCookies(connection, tokoId)
      
      if (!cookies) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Account cookies not found or invalid' 
          },
          { status: 404 }
        )
      }
    }
    
    let apiEndpoint = ''
    let payload: any = {}
    let successMessage = ''
    
    // Determine API endpoint and payload based on action
    switch (action) {
      case 'pause':
        apiEndpoint = 'pauseads'
        payload = { campaign: campaign_id }
        successMessage = 'Campaign berhasil di-pause!'
        break
        
      case 'resume':
        apiEndpoint = 'resumeads'
        payload = { campaign: campaign_id }
        successMessage = 'Campaign berhasil di-resume!'
        break
        
      case 'stop':
        apiEndpoint = 'stopads'
        payload = { campaign: campaign_id }
        successMessage = 'Campaign berhasil di-stop!'
        break
        
      case 'edit_budget':
        if (!new_budget || new_budget <= 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'new_budget is required and must be greater than 0' 
            },
            { status: 400 }
          )
        }
        
        // Validate budget is multiple of 500000 (5000 * 100000)
        if (new_budget % 500000 !== 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Budget harus kelipatan Rp5.000' 
            },
            { status: 400 }
          )
        }
        
        apiEndpoint = 'editbudget'
        payload = { 
          campaign: campaign_id,
          new_budget: new_budget
        }
        // Convert back to thousands for display message
        const budgetInThousands = new_budget / 100000
        successMessage = `Budget campaign ${campaign_id} berhasil diupdate ke Rp${budgetInThousands.toLocaleString('id-ID')}`
        break
        
      case 'create_campaign':
        const { mode, strategi, daily_budget, account_username, id_toko, roas, start_time, end_time, selected_products, periode_type, rapid_boost } = body
        const createTokoId = id_toko || account_username
        
        // Validate required fields (daily_budget can be 0, so check for undefined/null)
        if (!mode || !strategi || (daily_budget === undefined || daily_budget === null) || !createTokoId) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'mode, strategi, daily_budget, and id_toko are required' 
            },
            { status: 400 }
          )
        }

        // Validate mode manual requires products
        if (mode === 'manual' && (!selected_products || selected_products.length === 0)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'selected_products is required for manual mode' 
            },
            { status: 400 }
          )
        }

        // Validate ROAS for GMV Max ROAS strategi
        if (strategi === 'max_gmv_roi_two' && (roas === undefined || roas === null)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'ROAS is required for GMV Max ROAS strategi' 
            },
            { status: 400 }
          )
        }
        
        if (strategi === 'max_gmv_roi_two' && roas !== undefined && roas < 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'ROAS tidak boleh negatif' 
            },
            { status: 400 }
          )
        }
        
        // Validate budget berbeda per objective
        if (daily_budget < 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Budget tidak boleh negatif' 
            },
            { status: 400 }
          )
        }
        
        // Validasi budget minimal berdasarkan mode (hanya jika budget > 0)
        if (daily_budget > 0) {
          if (mode === 'automatic') {
            // Mode otomatis: minimal Rp50.000
            if (daily_budget < 5000000) {
              // 50000 * 100000 = 5000000
              return NextResponse.json(
                { 
                  success: false, 
                  error: 'Budget minimal Rp50.000 atau 0 (tak terbatas) untuk mode otomatis' 
                },
                { status: 400 }
              )
            }
          } else {
            // Mode manual: minimal Rp25.000
            if (daily_budget < 2500000) {
              // 25000 * 100000 = 2500000
              return NextResponse.json(
                { 
                  success: false, 
                  error: 'Budget minimal Rp25.000 atau 0 (tak terbatas)' 
                },
                { status: 400 }
              )
            }
          }
          
          // Validate budget is multiple of 500000 (5000 * 100000)
          // Budget sudah dikali 100000 di frontend, jadi validasi tetap 500000
          if (daily_budget % 500000 !== 0) {
            return NextResponse.json(
              { 
                success: false, 
                error: 'Budget harus kelipatan Rp5.000' 
              },
              { status: 400 }
            )
          }
        }
        
        // Validate strategi
        const validStrategi = ['max_gmv_roi_two', 'max_gmv']
        if (!validStrategi.includes(strategi)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid strategi. Must be one of: max_gmv_roi_two, max_gmv' 
            },
            { status: 400 }
          )
        }
        
        // Get account cookies for the selected toko
        const accountCookies = await getAccountCookies(connection, createTokoId)
        if (!accountCookies) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Account cookies not found or account not connected' 
            },
            { status: 404 }
          )
        }
        
        // Determine ROI target based on strategi
        // Frontend sends roi_two_target already multiplied by 100000
        let roiTwoTarget = 0
        if (strategi === 'max_gmv_roi_two') {
          // Prefer roi_two_target from payload (already multiplied by 100000)
          if (body.roi_two_target !== undefined && body.roi_two_target !== null) {
            roiTwoTarget = typeof body.roi_two_target === 'number' ? body.roi_two_target : parseInt(String(body.roi_two_target))
          } else if (roas !== undefined && roas !== null) {
            // Fallback: multiply roas by 100000 if roi_two_target not provided
            const roasNum = typeof roas === 'number' ? roas : parseFloat(String(roas))
            roiTwoTarget = Math.floor(roasNum * 100000)
          }
        }
        // If strategi is 'max_gmv', roiTwoTarget = 0 (already set)
        
        // Determine start_time and end_time based on periode_type
        // Frontend already sends correct start_time and end_time:
        // - For unlimited: start_time = hari ini (midnight WIB), end_time = 0
        // - For custom: start_time and end_time from user input
        let startTime = 0
        let endTime = 0
        if (start_time !== undefined && end_time !== undefined) {
          startTime = parseInt(start_time)
          endTime = parseInt(end_time)
        }
        
        // Determine rapid_boost value
        // rapid_boost should only be true if:
        // 1. rapid_boost is explicitly set to true in request
        // 2. roiTwoTarget > 0 (GMV Max ROAS, not GMV Max Auto)
        const shouldRapidBoost = rapid_boost === true && roiTwoTarget > 0
        
        // Handle manual mode with different APIs based on product count
        if (mode === 'manual') {
          // Call different API based on product count
          if (selected_products.length === 1) {
            // Single product - use product/publish/
            const result = await callShopeeProductPublish(
              accountCookies,
              daily_budget,
              roiTwoTarget,
              startTime,
              endTime,
              selected_products[0],
              shouldRapidBoost
            )
            return NextResponse.json(result)
          } else {
            // Multiple products - use product/mass_create/
            const result = await callShopeeProductMassCreate(
              accountCookies,
              daily_budget,
              roiTwoTarget,
              startTime,
              endTime,
              selected_products,
              shouldRapidBoost
            )
            return NextResponse.json(result)
          }
        } else {
          // Automatic mode - use product/publish/ with auto product_selection
          const result = await callShopeeProductPublishAuto(
            accountCookies,
            daily_budget,
            roiTwoTarget,
            startTime,
            endTime
          )
          return NextResponse.json(result)
        }
        
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Supported actions: pause, resume, stop, edit_budget' 
          },
          { status: 400 }
        )
    }
    
    // Call Shopee API
    const result = await callShopeeAPI(apiEndpoint, payload, cookies)
    
    // Check for success in multiple possible response structures
    const isSuccess = (
      (result && result.status === 200) ||
      (result?.success === true) ||
      (typeof result?.success === 'string' && result.success === "true") ||
      (result?.message && typeof result.message === 'string' && !result.message.toLowerCase().includes('error')) ||
      (result?.data && result.data.success === true)
    )
    
    if (isSuccess) {
      const message = result?.message || result?.data?.message || successMessage
      
      return NextResponse.json({
        success: true,
        message,
        data: {
          action,
          campaign_id,
          id_toko: tokoId,
          account_username: tokoId, // For backward compatibility
          new_budget: action === 'edit_budget' ? new_budget : undefined
        }
      })
    } else {
      // Error from API
      const errorMsg = (result && typeof result === 'object' && 'error' in result ? result.error : null) || 
                     result?.message || 
                     (result?.data && typeof result.data === 'object' && 'error' in result.data ? result.data.error : null) ||
                     (result?.data && typeof result.data === 'object' && 'message' in result.data ? result.data.message : null) ||
                     `Gagal ${action} campaign`
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMsg 
        },
        { status: 400 }
      )
    }
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform campaign action'
      },
      { status: 500 }
    )
  } finally {
    // Close database connection
    if (connection) {
      connection.release()
    }
  }
}
