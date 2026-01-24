import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'

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
  
  console.log(`[API Call] Calling Shopee API: ${endpoint}`)
  console.log(`[API Call] Payload:`, payload)
  
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
      filter_list: [{"campaign_type": "live_stream_homepage", "state": "all", "search_term": ""}],
      offset: 0,
      limit: 20
    }
    
    console.log(`[API Call] Direct call to Shopee API: ${apiUrl}`)
    console.log(`[API Call] Request payload:`, requestPayload)
    
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
    console.log('Calling Shopee API with payload:', payload)
    const campaignData = await callShopeeAPI(
      'showallcampaign',
      payload,
      cookies
    )
    
    console.log('API Response received:', JSON.stringify(campaignData, null, 2))
    
    if (campaignData) {
      // Check different possible structures based on actual response
      if (campaignData.data?.entry_list) {
        console.log('Found campaigns in data.entry_list')
        return campaignData.data.entry_list
      } else if (campaignData.entry_list) {
        console.log('Found campaigns in entry_list')
        return campaignData.entry_list
      } else if (campaignData.campaigns) {
        console.log('Found campaigns in campaigns')
        return campaignData.campaigns
      } else if (Array.isArray(campaignData)) {
        console.log('Found campaigns as array')
        return campaignData
      } else {
        console.log('No campaigns found in response structure')
        console.log('Available keys:', Object.keys(campaignData))
      }
    }
    
    return []
  } catch (error) {
    console.error('Error fetching campaign data from Shopee API:', error)
    return []
  }
}

// Function to save campaigns to database
async function saveCampaignsToDatabase(connection: PoolClient, campaigns: any[]) {
  try {
    console.log(`Processing ${campaigns.length} campaigns for database save`)
    
    for (const campaign of campaigns) {
      console.log(`Processing campaign: ${campaign.campaign_id} for user: ${campaign.username}`)
      
      // PostgreSQL: Use INSERT ... ON CONFLICT instead of REPLACE INTO
      // Try to insert, if conflict occurs (duplicate username + campaign_id), update instead
      try {
        await connection.query(
          `INSERT INTO campaigns (
            username, campaign_id, title, status, objective, daily_budget, 
            total_spend, roi_two_target, broad_gmv, broad_order, broad_roi, 
            cost_ratio, impression, view, cps, cpm, checkout_rate
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (username, campaign_id) 
          DO UPDATE SET
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            objective = EXCLUDED.objective,
            daily_budget = EXCLUDED.daily_budget,
            total_spend = EXCLUDED.total_spend,
            roi_two_target = EXCLUDED.roi_two_target,
            broad_gmv = EXCLUDED.broad_gmv,
            broad_order = EXCLUDED.broad_order,
            broad_roi = EXCLUDED.broad_roi,
            cost_ratio = EXCLUDED.cost_ratio,
            impression = EXCLUDED.impression,
            view = EXCLUDED.view,
            cps = EXCLUDED.cps,
            cpm = EXCLUDED.cpm,
            checkout_rate = EXCLUDED.checkout_rate`,
        [
          campaign.username,
          campaign.campaign_id,
          campaign.title,
          campaign.status,
          campaign.objective,
          campaign.daily_budget,
          campaign.total_spend,
          campaign.roi_two_target,
          campaign.broad_gmv,
          campaign.broad_order,
          campaign.broad_roi,
          campaign.cost_ratio,
          campaign.impression,
          campaign.view,
          campaign.cps,
          campaign.cpm,
          campaign.checkout_rate
        ]
        )
      } catch (insertError: any) {
        // If ON CONFLICT fails (no constraint), try UPDATE instead
        if (insertError.code === '42P10' || insertError.message?.includes('there is no unique constraint')) {
          // No unique constraint, try UPDATE first, then INSERT if no rows affected
          const updateResult = await connection.query(
            `UPDATE campaigns SET
              title = $3,
              status = $4,
              objective = $5,
              daily_budget = $6,
              total_spend = $7,
              roi_two_target = $8,
              broad_gmv = $9,
              broad_order = $10,
              broad_roi = $11,
              cost_ratio = $12,
              impression = $13,
              view = $14,
              cps = $15,
              cpm = $16,
              checkout_rate = $17
            WHERE username = $1 AND campaign_id = $2`,
            [
              campaign.username,
              campaign.campaign_id,
              campaign.title,
              campaign.status,
              campaign.objective,
              campaign.daily_budget,
              campaign.total_spend,
              campaign.roi_two_target,
              campaign.broad_gmv,
              campaign.broad_order,
              campaign.broad_roi,
              campaign.cost_ratio,
              campaign.impression,
              campaign.view,
              campaign.cps,
              campaign.cpm,
              campaign.checkout_rate
            ]
          )
          
          // If no rows updated, insert new record
          if (updateResult.rowCount === 0) {
            await connection.query(
              `INSERT INTO campaigns (
                username, campaign_id, title, status, objective, daily_budget, 
                total_spend, roi_two_target, broad_gmv, broad_order, broad_roi, 
                cost_ratio, impression, view, cps, cpm, checkout_rate
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
              [
                campaign.username,
                campaign.campaign_id,
                campaign.title,
                campaign.status,
                campaign.objective,
                campaign.daily_budget,
                campaign.total_spend,
                campaign.roi_two_target,
                campaign.broad_gmv,
                campaign.broad_order,
                campaign.broad_roi,
                campaign.cost_ratio,
                campaign.impression,
                campaign.view,
                campaign.cps,
                campaign.cpm,
                campaign.checkout_rate
              ]
            )
          }
        } else {
          // Other error, log and continue
          console.error(`Error saving campaign ${campaign.campaign_id}:`, insertError)
        }
      }
      console.log(`Successfully processed campaign: ${campaign.campaign_id}`)
    }
    console.log(`Completed processing all campaigns`)
  } catch (error) {
    console.error('Error saving campaigns to database:', error)
    // Don't throw error to prevent breaking the main flow
  }
}

// Function to get all accounts with cookies
async function getAccountsWithCookies(connection: PoolClient, accountIds?: string[]) {
  try {
    // First, let's check what accounts exist in the database
    console.log('Checking available accounts in database...')
    const allAccountsResult = await connection.query(
      'SELECT id_affiliate, username, email, cookies FROM data_akun WHERE cookies IS NOT NULL AND cookies != \'\' LIMIT 10'
    )
    const allAccounts = allAccountsResult.rows
    console.log('Sample accounts in database:', allAccounts)
    
    let query = `SELECT da.id_affiliate as id, da.username, da.email, da.cookies, da.kode_tim, dt.nama_tim, da.pic_akun 
                 FROM data_akun da 
                 LEFT JOIN data_tim dt ON da.kode_tim = dt.kode_tim 
                 WHERE da.cookies IS NOT NULL AND da.cookies != ''`
    
    let params: any[] = []
    let paramIndex = 1
    
    if (accountIds && accountIds.length > 0) {
      // Try both id_affiliate and username fields
      const placeholders1 = accountIds.map(() => `$${paramIndex++}`).join(',')
      const placeholders2 = accountIds.map(() => `$${paramIndex++}`).join(',')
      query += ` AND (da.id_affiliate IN (${placeholders1}) OR da.username IN (${placeholders2}))`
      params.push(...accountIds, ...accountIds) // Add accountIds twice for both fields
    }
    
    query += ` ORDER BY da.created_at DESC`
    
    console.log('Executing query:', query)
    console.log('With params:', params)
    
    const result = await connection.query(query, params)
    const rows = result.rows
    console.log('Found accounts:', rows)
    return rows
  } catch (error) {
    console.error('Error fetching accounts:', error)
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
    
    // Create database connection
    connection = await getDatabaseConnection()
    
    // Get accounts with cookies
    const accounts = await getAccountsWithCookies(connection, accountIds)
    console.log(`Found ${accounts.length} accounts with cookies`)
    
    // If no accounts found, return empty result
    if (!accounts || accounts.length === 0) {
      connection.release()
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
          console.error(`Error fetching campaigns for account ${account.username}:`, error)
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
      const report = campaign.report || {}
      const cost = report.cost || 0
      const cost_ratio = report.cost_ratio || 0
      const impression = report.impression || 0
      const view = report.view || 0
      const broad_order = report.broad_order || 0
      const broad_gmv = report.broad_gmv || 0
      
      // Extract roi_two_target from campaign data
      const roi_two_target = campaign.campaign?.roi_two_target || campaign.roi_two_target || 0
      
      // Extract cost_ratio from API data.entry_list.ratio.cost
      const cost_ratio_value = campaign.ratio?.cost || 0
      
      // Get objective from live_stream_ads or other sources and map to display text
      let objective_raw = 'N/A'
      if (campaign.live_stream_ads?.objective) {
        objective_raw = campaign.live_stream_ads.objective
      } else if (campaign.objective) {
        objective_raw = campaign.objective
      }
      
      // Map objective to display text
      let objective = 'N/A'
      switch(objective_raw) {
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
      
      return {
        id: campaign_id,
        title,
        state,
        daily_budget,
        cost,
        impression,
        view,
        broad_order,
        broad_gmv,
        objective,
        spend_percentage,
        cpc,
        conversion_rate,
        cpm,
        roas,
        roi_two_target,
        cost_ratio: cost_ratio_value,
        account_username: campaign.account_username,
        account_id: campaign.account_id,
        account_email: campaign.account_email,
        kode_tim: campaign.kode_tim,
        nama_tim: campaign.nama_tim,
        pic_akun: campaign.pic_akun
      }
    })
    
    // Save campaigns to database (only active and paused campaigns)
    try {
      const campaignsToSave = processedCampaigns
        .filter(campaign => campaign.state === 'ongoing' || campaign.state === 'paused')
        .map(campaign => {
        // Use cps from processed campaign data
        const cps = campaign.cpc || 0
        const conversion_rate = campaign.conversion_rate || 0
        
        // Calculate checkout rate (orders / views * 100)
        const checkout_rate = campaign.view > 0 ? (campaign.broad_order / campaign.view) * 100 : 0
        
        // Divide by 100000 for currency fields before saving to database
        const daily_budget_db = Math.round(campaign.daily_budget / 100000)
        const total_spend_db = Math.round(campaign.cost / 100000)
        const broad_gmv_db = Math.round(campaign.broad_gmv / 100000)
        const cost_db = Math.round(campaign.cost / 100000)
        const cps_db = Math.round(cps / 100000)
        const cpm_db = Math.round(campaign.cpm / 100000)
        const roi_two_target_db = Math.round((campaign.roi_two_target || 0) / 100000)
        
        // cost_ratio from API data.entry_list.ratio.cost (multiply by 100)
        const cost_ratio_db = Math.round((campaign.cost_ratio || 0) * 100)
        
        return {
          username: campaign.account_username || null,
          campaign_id: campaign.id || null,
          title: campaign.title || null,
          status: campaign.state || null,
          objective: campaign.objective || null,
          daily_budget: daily_budget_db || 0,
          total_spend: total_spend_db || 0,
          roi_two_target: roi_two_target_db || 0,
          broad_gmv: broad_gmv_db || 0,
          broad_order: campaign.broad_order || 0,
          broad_roi: campaign.roas || 0,
          cost_ratio: cost_ratio_db || 0,
          impression: campaign.impression || 0,
          view: campaign.view || 0,
          cps: cps_db || 0,
          cpm: cpm_db || 0,
          checkout_rate: checkout_rate || 0
        }
      })
      
      // Save to database
      if (campaignsToSave.length > 0) {
        await saveCampaignsToDatabase(connection, campaignsToSave)
        console.log(`Successfully saved ${campaignsToSave.length} active/paused campaigns to database`)
      } else {
        console.log('No active or paused campaigns to save to database')
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
    
  } catch (error) {
    console.error('Error in campaigns shopee API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch campaigns data from Shopee API',
        details: error instanceof Error ? error.message : 'Unknown error'
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
