import { NextResponse, NextRequest } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'
import { getRoleBasedFilter } from '@/lib/role-filter'

// Function to get campaign images from Shopee API
async function getCampaignImagesFromShopee(
  campaignIds: string[],
  tokoIds: string[]
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>()
  
  // TODO: Implement Shopee API call to fetch campaign images
  // For now, return empty map as image is not available in database
  // This would require:
  // 1. Get cookies for each toko
  // 2. Call Shopee API homepage/query/ with campaign_ids
  // 3. Extract image from response
  
  return imageMap
}

export async function POST(request: NextRequest) {
  const user = await requireActiveStatus(request)
  let connection = null
  
  try {
    const body = await request.json()
    const { campaign_ids, toko_ids } = body
    
    if (!campaign_ids || !Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'campaign_ids is required and must be an array' },
        { status: 400 }
      )
    }
    
    if (!toko_ids || !Array.isArray(toko_ids) || toko_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'toko_ids is required and must be an array' },
        { status: 400 }
      )
    }
    
    connection = await getDatabaseConnection()
    
    // Get role-based filter
    const roleFilter = getRoleBasedFilter(user)
    
    // Get toko IDs that user can access
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
    
    // Filter by provided toko IDs
    if (toko_ids.length > 0) {
      const placeholders = toko_ids.map(() => `$${paramIndex++}`).join(',')
      tokoQuery += ` AND dt.id_toko IN (${placeholders})`
      usernameParams.push(...toko_ids)
    }
    
    const tokoResult = await connection.query(tokoQuery, usernameParams)
    const allowedTokoIds = tokoResult.rows.map((row: any) => row.id_toko)
    
    // Get images from Shopee API
    const images = await getCampaignImagesFromShopee(campaign_ids, allowedTokoIds)
    
    return NextResponse.json({
      success: true,
      data: Object.fromEntries(images)
    })
    
  } catch (error) {
    console.error('Error fetching campaign images:', error)
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

