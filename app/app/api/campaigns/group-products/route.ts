import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { sanitizeErrorForLogging, isDatabaseConnectionError, getGenericDatabaseErrorMessage } from '@/lib/db-errors'

// Function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  
  return cookies
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null
  
  try {
    // Authenticate user
    const user = await requireActiveStatus(request)
    
    // Parse request body
    const body = await request.json()
    const { campaign_id, account_username, start_time, end_time } = body
    
    // Validate required fields
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
    
    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get cookies for the account
    let query = `SELECT cookies FROM data_toko WHERE id_toko = $1 AND cookies IS NOT NULL AND cookies != '' AND status_toko = 'active'`
    let params: any[] = [account_username]
    
    // User isolation: Filter by user_id (unless admin/superadmin)
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      query += ` AND user_id = $2`
      params.push(user.userId)
    }
    
    const tokoResult = await connection.query(query, params)
    
    if (!tokoResult.rows || tokoResult.rows.length === 0 || !tokoResult.rows[0].cookies) {
      return NextResponse.json(
        { success: false, error: 'No cookies found for this account' },
        { status: 404 }
      )
    }
    
    const cookies = tokoResult.rows[0].cookies
    const cleanedCookies = cleanCookies(cookies)
    
    // Convert dates to timestamps
    const startTimestamp = start_time ? convertDateToTimestamp(start_time, true) : Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
    const endTimestamp = end_time ? convertDateToTimestamp(end_time, false) : Math.floor(new Date().setHours(23, 59, 59, 999) / 1000)
    
    // Call Shopee API for product performance
    const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/product/mpd/list_item_product_performance/'
    const headers = {
      'Cookie': cleanedCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Content-Type': 'application/json'
    }
    
    const requestPayload = {
      campaign_id: parseInt(campaign_id.toString()),
      start_time: startTimestamp,
      end_time: endTimestamp,
      header: {}
    }
    
    console.log(`[Group Products API] Fetching products for campaign ${campaign_id}`)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Group Products API] ✗ HTTP ${response.status}: ${errorText}`)
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const result = await response.json()
    
    if (result.code !== 0) {
      throw new Error(`API returned error: ${result.msg || 'Unknown error'}`)
    }
    
    // Process and return product data
    const products = result.data?.result_list || []
    
    // Transform product data to match frontend needs
    const processedProducts = products.map((product: any) => {
      const report = product.report || {}
      const ratio = product.ratio || {}
      
      // Calculate metrics
      const cost = report.cost || 0
      const impression = report.impression || 0
      const click = report.click || 0
      const view = report.view || 0
      const broad_order = report.broad_order || 0
      const broad_gmv = report.broad_gmv || 0
      
      const ctr = impression > 0 ? (click / impression) * 100 : 0
      const cpc = click > 0 ? (cost / click) : 0
      const cpm = impression > 0 ? (cost / impression) * 1000 : 0
      const roas = cost > 0 ? (broad_gmv / cost) : 0
      const conversion_rate = (report.checkout_rate || 0) * 100
      
      // Calculate ACOS: (spend / sales) * 100
      const productSpend = cost / 100000
      const productSales = broad_gmv / 100000
      const acos = productSales > 0 ? (productSpend / productSales) * 100 : 0
      
      return {
        item_id: product.item_id,
        name: product.name || 'N/A',
        image: product.image || null,
        cost,
        impression,
        click,
        view,
        broad_order,
        broad_gmv,
        ctr,
        cpc,
        cpm,
        roas,
        conversion_rate,
        avg_rank: report.avg_rank || 0,
        location_in_ads: report.location_in_ads || 0,
        acos
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        products: processedProducts,
        total: result.data?.total || processedProducts.length
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
    
    // Check if it's a database connection error
    const isConnectionError = isDatabaseConnectionError(error) ||
      error?.message?.includes('Connection terminated') ||
      error?.message?.includes('connection') ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.isDatabaseError
    
    if (isConnectionError) {
      console.error(`[${timestamp}] Database connection error in group products API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
      return NextResponse.json(
        { success: false, error: getGenericDatabaseErrorMessage() },
        { status: 503 }
      )
    }
    
    // Handle authentication errors
    if (error?.message?.includes('Authentication required') || error?.message?.includes('Access denied')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Authentication required',
        },
        { status: 401 }
      )
    }
    
    console.error(`[${timestamp}] Error in group products API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Gagal mengambil data produk. Silakan coba lagi.'
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

