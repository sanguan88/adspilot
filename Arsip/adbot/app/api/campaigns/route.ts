import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus, UserPayload } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { canAccessAllData, getTokoFilter } from '@/lib/role-filter'

// Function to get campaigns data from database
async function getCampaignsFromDB(connection: PoolClient, startTime: string, endTime: string, user: UserPayload, tokoIds?: string[]) {
  try {
    let query = `SELECT 
      dp.campaign_id,
      dp.title,
      dp.status,
      dp.objective,
      dp.daily_budget,
      dp.report_cost as spend,
      dp.report_impression as impressions,
      dp.report_click as clicks,
      dp.report_ctr as ctr,
      dp.report_broad_order as conversions,
      dp.report_cpc as cpc,
      dp.created_at,
      dp.update_at,
      dp.id_toko,
      dt.nama_toko
    FROM data_produk dp
    LEFT JOIN data_toko dt ON dp.id_toko = dt.id_toko
    WHERE dp.created_at >= $1 AND dp.created_at <= $2`
    
    let params: any[] = [startTime, endTime]
    let paramIndex = 3
    
    // User isolation: Filter by user's toko (unless admin/superadmin)
    if (!canAccessAllData(user)) {
      query += ` AND dp.id_toko IN (SELECT id_toko FROM data_toko WHERE user_id = $${paramIndex})`
      params.push(user.userId)
      paramIndex++
    }
    
    // Add toko filter if provided (must be validated against user's toko)
    if (tokoIds && tokoIds.length > 0) {
      // For non-admin users, validate that tokoIds belong to them
      if (!canAccessAllData(user)) {
        const allowedTokoIds = await getAllowedUsernames(user)
        const validTokoIds = tokoIds.filter(id => allowedTokoIds.includes(id))
        if (validTokoIds.length === 0) {
          return [] // No valid toko IDs, return empty
        }
        tokoIds = validTokoIds
      }
      
      const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
      query += ` AND dp.id_toko IN (${placeholders})`
      params.push(...tokoIds)
    }
    
    query += ` ORDER BY dp.created_at DESC`
    
    const result = await connection.query(query, params)
    const rows = result.rows
    
    if (rows && rows.length > 0) {
      return rows.map((campaign: any) => ({
        id: campaign.campaign_id.toString(),
        name: campaign.title || 'Unnamed Campaign',
        status: campaign.status || 'paused',
        type: 'image', // Default type
        headline: campaign.title || 'Campaign',
        objective: campaign.objective || 'Reach',
        budget: parseFloat(campaign.daily_budget) || 0,
        spend: parseFloat(campaign.spend) || 0,
        impressions: parseInt(campaign.impressions) || 0,
        clicks: parseInt(campaign.clicks) || 0,
        ctr: parseFloat(campaign.ctr) || 0,
        conversions: parseInt(campaign.conversions) || 0,
        cpc: parseFloat(campaign.cpc) || 0,
        startDate: campaign.created_at ? new Date(campaign.created_at).toISOString().split('T')[0] : '',
        endDate: null,
        createdAt: campaign.created_at,
        updatedAt: campaign.update_at,
        accountId: campaign.id_toko,
        accountUsername: campaign.nama_toko || campaign.id_toko
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error fetching campaigns from database:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  // Authenticate user and check active status
  const user = await requireActiveStatus(request);
  let connection: PoolClient | null = null
  
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const startTime = searchParams.get('start_time') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default: 30 days ago
    const endTime = searchParams.get('end_time') || new Date().toISOString().split('T')[0] // Default: today
    const tokoIdsParam = searchParams.get('account_ids') || searchParams.get('toko_ids')
    const tokoIds = tokoIdsParam ? tokoIdsParam.split(',').filter(id => id.trim()) : undefined
    
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
    
    // Get campaigns data from database (with user filtering)
    const campaigns = await getCampaignsFromDB(connection, startTime, endTime, user, tokoIds)
    
    return NextResponse.json({
      success: true,
      data: campaigns,
      meta: {
        start_time: startTime,
        end_time: endTime,
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter(c => c.status === 'active').length,
        total_spend: campaigns.reduce((sum, c) => sum + c.spend, 0),
        total_budget: campaigns.reduce((sum, c) => sum + c.budget, 0)
      }
    })
    
  } catch (error) {
    console.error('Error in campaigns API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch campaigns data',
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

export async function POST(request: NextRequest) {
  // Authenticate user and check active status
  const user = await requireActiveStatus(request);
  let connection: PoolClient | null = null
  
  try {
    const body = await request.json()
    const { start_time, end_time, account_ids, toko_ids } = body
    const tokoIds = toko_ids || account_ids
    
    if (!start_time || !end_time) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'start_time and end_time are required' 
        },
        { status: 400 }
      )
    }
    
    // Validate date format
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date format. Please use YYYY-MM-DD format' 
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
    
    // Get campaigns data from database (with user filtering)
    const campaigns = await getCampaignsFromDB(connection, start_time, end_time, user, tokoIds)
    
    return NextResponse.json({
      success: true,
      data: campaigns,
      meta: {
        start_time,
        end_time,
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter(c => c.status === 'active').length,
        total_spend: campaigns.reduce((sum, c) => sum + c.spend, 0),
        total_budget: campaigns.reduce((sum, c) => sum + c.budget, 0)
      }
    })
    
  } catch (error) {
    console.error('Error in campaigns API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch campaigns data',
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
