import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { randomUUID } from 'crypto'

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
  
  // pauseads, resumeads, stopads, editbudget - semua menggunakan endpoint yang sama
  if (endpoint === 'pauseads' || endpoint === 'resumeads' || endpoint === 'stopads' || endpoint === 'editbudget') {
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/live_stream/edit/'
    const headers = {
      'Cookie': cleanedCookies,
      'Content-Type': 'application/json'
    }
    
    let requestPayload: any = {
      campaign_id: parseInt(payload.campaign || payload.campaign_id),
      header: {}
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
        daily_budget: parseInt(payload.new_budget),
        page: 'page_after_creation'
      }
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
      status: 200,
      data: result?.data || result,
      message: result?.message || `Success ${endpoint}`
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
    
    // Get current timestamp untuk start_time (midnight today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMidnightTimestamp = Math.floor(today.getTime() / 1000)
    
    let campaignPayload: any = {
      daily_budget: parseInt(payload.budget),
      start_time: todayMidnightTimestamp,
      end_time: 0,
      time_slot_list: [
        {
          start_time: 0,
          end_time: 0
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
      // Untuk max_view, time_slot_list berbeda
      campaignPayload.time_slot_list = [
        {
          start_time: 0,
          end_time: 86340 // 23:59:00 dalam detik
        }
      ]
    }
    
    const requestPayload = {
      campaign: campaignPayload,
      reference_id: uuid,
      header: {}
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
      status: 200,
      data: result?.data || result,
      message: result?.message || `Success ${endpoint}`
    }
  }
  
  // Jika endpoint tidak dikenali
  throw new Error(`Unknown endpoint: ${endpoint}. Supported endpoints: pauseads, resumeads, stopads, editbudget, gmvmax, iklanautogmvmax, iklanview`)
}

// Function to get account cookies by username
async function getAccountCookies(connection: PoolClient, username: string) {
  try {
    const result = await connection.query(
      'SELECT cookies FROM data_akun WHERE username = $1 AND cookies IS NOT NULL AND cookies != \'\'',
      [username]
    )
    
    const accounts = result.rows
    return accounts.length > 0 ? accounts[0].cookies : null
  } catch (error) {
    console.error('Error fetching account cookies:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null
  
  try {
    const body = await request.json()
    const { action, campaign_id, account_username, new_budget } = body
    
    if (!action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'action is required' 
        },
        { status: 400 }
      )
    }

    // For create_campaign, we don't need campaign_id and account_username
    if (action !== 'create_campaign' && (!campaign_id || !account_username)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'campaign_id and account_username are required for this action' 
        },
        { status: 400 }
      )
    }
    
    // Create database connection
    connection = await getDatabaseConnection()
    
    // Get account cookies (not needed for create_campaign)
    let cookies = null
    if (action !== 'create_campaign') {
      cookies = await getAccountCookies(connection, account_username)
      
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
        const { title, objective, daily_budget, account_username, roas } = body
        
        if (!title || !objective || !daily_budget || !account_username) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'title, objective, daily_budget, and account_username are required' 
            },
            { status: 400 }
          )
        }

        // Validate ROAS for GMV MAX objective
        if (objective === 'max_gmv_roi_two' && (!roas || roas <= 0)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'ROAS is required and must be greater than 0 for GMV MAX objective' 
            },
            { status: 400 }
          )
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
        
        // Validate objective
        const validObjectives = ['max_gmv_roi_two', 'max_gmv', 'max_view']
        if (!validObjectives.includes(objective)) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid objective. Must be one of: max_gmv_roi_two, max_gmv, max_view' 
            },
            { status: 400 }
          )
        }
        
        // Get account cookies for the selected account
        const accountCookies = await getAccountCookies(connection, account_username)
        if (!accountCookies) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Account cookies not found or account not connected' 
            },
            { status: 404 }
          )
        }
        
        // Map objective to correct API endpoint
        switch (objective) {
          case 'max_gmv_roi_two':
            apiEndpoint = 'gmvmax'
            payload = {
              budget: daily_budget,
              roas: roas, // ROAS sudah dikali 100000 di frontend
              unique_title: title
            }
            break
          case 'max_gmv':
            apiEndpoint = 'iklanautogmvmax'
            payload = {
              budget: daily_budget,
              unique_title: title
            }
            break
          case 'max_view':
            apiEndpoint = 'iklanview'
            payload = {
              budget: daily_budget,
              unique_title: title
            }
            break
          default:
            return NextResponse.json(
              { 
                success: false, 
                error: 'Invalid objective for campaign creation' 
              },
              { status: 400 }
            )
        }
        const budgetInThousandsCreate = daily_budget / 100000
        const roasInOriginalFormat = objective === 'max_gmv_roi_two' && roas ? roas / 100000 : 0
        const roasText = objective === 'max_gmv_roi_two' && roas ? ` dengan ROAS ${roasInOriginalFormat}` : ''
        const endpointText = objective === 'max_gmv_roi_two' ? 'GMV MAX' : 
                           objective === 'max_gmv' ? 'AUTO GMV' : 'VIEW'
        successMessage = `Campaign "${title}" (${endpointText}) berhasil dibuat dengan budget Rp${budgetInThousandsCreate.toLocaleString('id-ID')}${roasText} untuk akun ${account_username}`
        
        // Update cookies for API call
        cookies = accountCookies
        break
        
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
      (result?.success === "true") ||
      (result?.message && !result.message.toLowerCase().includes('error')) ||
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
          account_username,
          new_budget: action === 'edit_budget' ? new_budget : undefined
        }
      })
    } else {
      // Error from API
      const errorMsg = result?.error || 
                     result?.message || 
                     result?.data?.error ||
                     result?.data?.message ||
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
    console.error('Error in campaign actions API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform campaign action',
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
