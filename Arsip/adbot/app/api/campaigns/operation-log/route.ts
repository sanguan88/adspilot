import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { sanitizeErrorForLogging } from '@/lib/db-errors'

// Helper function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  return cookies
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  const user = await requireActiveStatus(request)
  let connection: PoolClient | null = null
  
  try {
    const body = await request.json()
    const { campaign_id, account_username, start_time, end_time } = body
    
    if (!campaign_id) {
      return NextResponse.json(
        { success: false, error: 'campaign_id is required' },
        { status: 400 }
      )
    }
    
    if (!account_username) {
      return NextResponse.json(
        { success: false, error: 'account_username is required' },
        { status: 400 }
      )
    }
    
    connection = await getDatabaseConnection()
    
    // Get cookies for the account
    const tokoResult = await connection.query(
      'SELECT cookies FROM data_toko WHERE id_toko = $1 AND cookies IS NOT NULL AND cookies != \'\' AND status_toko = \'active\'',
      [account_username]
    )
    
    if (!tokoResult.rows || tokoResult.rows.length === 0 || !tokoResult.rows[0].cookies) {
      return NextResponse.json(
        { success: false, error: 'No cookies found for this account' },
        { status: 404 }
      )
    }
    
    const cookies = tokoResult.rows[0].cookies
    const cleanedCookies = cleanCookies(cookies)
    
    // Default to today if not provided
    const now = new Date()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    
    const startTimestamp = start_time || Math.floor(startOfDay.getTime() / 1000)
    const endTimestamp = end_time || Math.floor(endOfDay.getTime() / 1000)
    
    // Call Shopee API
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/operation_log/query/'
    const headers = {
      'Cookie': cleanedCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Content-Type': 'application/json'
    }
    
    const payload = {
      offset: 0,
      limit: 100,
      campaign_id: parseInt(campaign_id),
      filter: {
        operator_list: [],
        event_type_list: [],
        device_list: []
      },
      start_time: startTimestamp,
      end_time: endTimestamp,
      language: "id"
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Operation Log] API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { success: false, error: `API call failed: ${response.status}` },
        { status: response.status }
      )
    }
    
    const result = await response.json()
    
    if (result.code !== 0) {
      return NextResponse.json(
        { success: false, error: result.msg || 'API returned error' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.data || { operation_list: [] }
    })
    
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    console.error(`[Operation Log] Error:`, sanitized.type)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operation log' },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

