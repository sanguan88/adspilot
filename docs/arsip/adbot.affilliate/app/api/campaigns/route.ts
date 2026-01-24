import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'

// Function to get campaigns data from database
async function getCampaignsFromDB(connection: PoolClient, startTime: string, endTime: string, accountIds?: string[]) {
  try {
    let query = `SELECT 
      c.id,
      c.campaign_name,
      c.status,
      c.campaign_type,
      c.objective,
      c.budget,
      c.spend,
      c.impressions,
      c.clicks,
      c.ctr,
      c.conversions,
      c.cpc,
      c.start_date,
      c.end_date,
      c.created_at,
      c.updated_at,
      c.account_id,
      sa.username as account_username
    FROM campaigns c
    LEFT JOIN shopee_accounts sa ON c.account_id = sa.id
    WHERE c.start_date >= $1 AND c.end_date <= $2`
    
    let params: any[] = [startTime, endTime]
    let paramIndex = 3
    
    // Add account filter if provided
    if (accountIds && accountIds.length > 0) {
      const placeholders = accountIds.map(() => `$${paramIndex++}`).join(',')
      query += ` AND c.account_id IN (${placeholders})`
      params.push(...accountIds)
    }
    
    query += ` ORDER BY c.created_at DESC`
    
    const result = await connection.query(query, params)
    const rows = result.rows
    
    if (rows && rows.length > 0) {
      return rows.map((campaign: any) => ({
        id: campaign.id.toString(),
        name: campaign.campaign_name || 'Unnamed Campaign',
        status: campaign.status || 'paused',
        type: campaign.campaign_type || 'image',
        headline: campaign.campaign_name || 'Campaign',
        objective: campaign.objective || 'Reach',
        budget: parseFloat(campaign.budget) || 0,
        spend: parseFloat(campaign.spend) || 0,
        impressions: parseInt(campaign.impressions) || 0,
        clicks: parseInt(campaign.clicks) || 0,
        ctr: parseFloat(campaign.ctr) || 0,
        conversions: parseInt(campaign.conversions) || 0,
        cpc: parseFloat(campaign.cpc) || 0,
        startDate: campaign.start_date ? new Date(campaign.start_date).toISOString().split('T')[0] : '',
        endDate: campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : null,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        accountId: campaign.account_id?.toString(),
        accountUsername: campaign.account_username
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error fetching campaigns from database:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  // Authenticate user
  const user = requireAuth(request);
  let connection: PoolClient | null = null
  
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const startTime = searchParams.get('start_time') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default: 30 days ago
    const endTime = searchParams.get('end_time') || new Date().toISOString().split('T')[0] // Default: today
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
    
    // Get campaigns data from database
    const campaigns = await getCampaignsFromDB(connection, startTime, endTime, accountIds)
    
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
  // Authenticate user
  const user = requireAuth(request);
  let connection: PoolClient | null = null
  
  try {
    const body = await request.json()
    const { start_time, end_time, account_ids } = body
    
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
    
    // Get campaigns data from database
    const campaigns = await getCampaignsFromDB(connection, start_time, end_time, account_ids)
    
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
