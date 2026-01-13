import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { randomUUID } from 'crypto'

// Function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  
  return cookies
    .replace(/[\r\n\t]+/g, ' ')  // Replace newlines, carriage returns, tabs with space
    .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
    .trim()                      // Remove leading/trailing spaces
}

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null
  
  try {
    // Authenticate user and check active status
    await requireActiveStatus(request)
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const id_toko = searchParams.get('id_toko')
    const search = searchParams.get('search') || ''
    const last_token = searchParams.get('last_token') || ''
    
    if (!id_toko) {
      return NextResponse.json(
        { success: false, error: 'id_toko is required' },
        { status: 400 }
      )
    }
    
    // Get database connection
    connection = await getDatabaseConnection()
    
    // Get cookies for the account
    const cookiesResult = await connection.query(
      'SELECT cookies FROM data_toko WHERE id_toko = $1 AND cookies IS NOT NULL AND cookies != \'\'',
      [id_toko]
    )
    
    if (cookiesResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cookies not found for this account' },
        { status: 404 }
      )
    }
    
    const accountCookies = cookiesResult.rows[0].cookies
    
    // Generate UUID for reference_id
    const uuid = randomUUID()
    
    // Fixed timestamps for start_time and end_time
    const startTime = 1
    const endTime = 2767632399
    
    const payload: any = {
      pagination: {
        last_token: last_token,
        limit: 50
      },
      order: null,
      show_all_item: false,
      filter: {
        recommendation_type: null
      },
      ads_information: {
        product_placement: "all",
        end_time: endTime,
        start_time: startTime,
        bidding_strategy: "roi_two"
      },
      reference_id: uuid,
      header: {}
    }
    
    // If search query exists, add it to filter
    if (search.trim()) {
      payload.filter = {
        ...payload.filter,
        search_term: search.trim()
      }
    }
    
    // Call Shopee API
    const cleanedCookies = cleanCookies(accountCookies)
    const apiResponse = await fetch('https://seller.shopee.co.id/api/pas/v1/setup_helper/product_selector/query/', {
      method: 'POST',
      headers: {
        'Cookie': cleanedCookies,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    })
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      let errorMessage = `API call failed: ${apiResponse.status}`
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.msg || errorJson.error_msg || errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: apiResponse.status }
      )
    }
    
    const data = await apiResponse.json()
    
    // Check if response indicates an error
    if (data.code !== 0 || data.error || data.error_msg) {
      return NextResponse.json(
        { success: false, error: data.msg || data.error_msg || data.error || 'API returned an error' },
        { status: 400 }
      )
    }
    
    // Shopee API returns products in data.entry_list
    const productListData = data.data?.entry_list || []
    const nextPageToken = data.data?.next_page_token || ""
    
    // Transform products to match frontend format
    const products = productListData.map((product: any) => {
      // Convert price from Shopee format (multiplied by 100000) to normal format
      const price = product.price_lower_bound || product.price_upper_bound || product.taxable_price_lower_bound || product.taxable_price_upper_bound || 0
      const priceInRupiah = price / 100000
      
      // Convert listing_date (Unix timestamp) to readable date
      let dateAdded = ''
      if (product.listing_date) {
        const date = new Date(product.listing_date * 1000)
        dateAdded = date.toLocaleDateString('id-ID')
      }
      
      // Build image URL (add prefix if image doesn't start with http)
      let imageUrl = product.image || ''
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `https://down-id.img.susercontent.com/${imageUrl}`
      }
      
      // Check if product has ongoing promotion
      const hasOngoingPromotion = product.trait_list?.includes('has_ongoing_promotion') || false
      
      return {
        product_id: product.item_id?.toString() || '',
        name: product.name || '',
        image: imageUrl,
        price: priceInRupiah,
        stock: product.stock || 0,
        monthly_sales: product.monthly_sales || 0,
        rating: product.rating || 0,
        date_added: dateAdded,
        selectable: product.selectable !== false, // Default to true if not specified
        has_ongoing_promotion: hasOngoingPromotion // Flag untuk produk yang sudah di iklan
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        products: products,
        pagination: {
          last_token: nextPageToken,
          has_more: nextPageToken ? true : false
        }
      }
    })
    
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch products'
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

