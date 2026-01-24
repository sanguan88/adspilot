import { NextResponse, NextRequest } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus, UserPayload } from '@/lib/auth'
import { getAllowedUsernames } from '@/lib/role-accounts'
import { getRoleBasedFilter } from '@/lib/role-filter'
import { sanitizeErrorForLogging } from '@/lib/db-errors'

// Function to clean cookies
function cleanCookies(cookies: string): string {
  if (!cookies) return ''
  
  return cookies
    .replace(/[\r\n\t]+/g, ' ')  // Replace newlines, carriage returns, tabs with space
    .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
    .trim()                      // Remove leading/trailing spaces
}

// Function to get all toko with cookies (with user filtering)
async function getAccountsWithCookies(connection: PoolClient, user: UserPayload, tokoIds?: string[]) {
  try {
    let query = `SELECT dt.id_toko as id, dt.id_toko as username, dt.email_toko as email, dt.cookies, dt.nama_toko
                 FROM data_toko dt 
                 WHERE dt.cookies IS NOT NULL AND dt.cookies != '' AND dt.status_toko = 'active'`
    
    let params: any[] = []
    let paramIndex = 1
    
    // User isolation: Filter by user_id (unless admin/superadmin)
    const roleFilter = getRoleBasedFilter(user)
    if (roleFilter.whereClause) {
      let filterClause = roleFilter.whereClause.startsWith('AND ') 
        ? roleFilter.whereClause.substring(4) 
        : roleFilter.whereClause
      
      // Replace ? with $1 for PostgreSQL
      filterClause = filterClause.replace('?', `$${paramIndex++}`)
      query += ` AND ${filterClause}`
      params.push(...roleFilter.params)
    }
    
    if (tokoIds && tokoIds.length > 0) {
      // Validate tokoIds belong to user (unless admin/superadmin)
      if (user.role !== 'superadmin' && user.role !== 'admin') {
        const allowedTokoIds = await getAllowedUsernames(user)
        tokoIds = tokoIds.filter(id => allowedTokoIds.includes(id))
        if (tokoIds.length === 0) {
          return [] // No valid toko IDs
        }
      }
      
      const placeholders = tokoIds.map(() => `$${paramIndex++}`).join(',')
      query += ` AND dt.id_toko IN (${placeholders})`
      params.push(...tokoIds)
    }
    
    query += ` ORDER BY dt.created_at DESC`
    
    // Don't log query, params, or rows (may contain sensitive data like cookies)
    const result = await connection.query(query, params)
    return result.rows
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error fetching toko: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    throw error
  }
}

// Function removed - data_gmv table no longer exists
// GMV data is now calculated on-the-fly from API responses

export async function GET(request: NextRequest) {
  // Authenticate user
  const user = await requireActiveStatus(request);
  let connection: PoolClient | null = null
  
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const tokoIdsParam = searchParams.get('account_ids') || searchParams.get('toko_ids')
    const tokoIds = tokoIdsParam ? tokoIdsParam.split(',').filter(id => id.trim()) : undefined
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    
    // Create database connection
    connection = await getDatabaseConnection()
    
    // Get toko with cookies (with user filtering)
    const accounts = await getAccountsWithCookies(connection, user, tokoIds)
    console.log(`Found ${accounts.length} toko with cookies`)
    
    // Note: GMV data from creator.shopee.co.id is no longer used
    // This endpoint now returns empty data as the API is deprecated
    const allGMVData: any[] = []
    
    console.log(`[GMV Daily] Creator.shopee.co.id API is deprecated, returning empty data`)
    
    return NextResponse.json({
      success: true,
      data: allGMVData,
      meta: {
        today: todayString,
        total_records: 0,
        total_gmv: 0,
        accounts_processed: accounts.length,
        note: 'Creator.shopee.co.id API is no longer used'
      }
    })
    
  } catch (error) {
    const sanitized = sanitizeErrorForLogging(error)
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] Error in GMV daily API: ${sanitized.type}${sanitized.code ? ` (${sanitized.code})` : ''}`)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch GMV data from Shopee API',
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

// POST method untuk manual trigger
export async function POST(request: NextRequest) {
  // Authenticate user
  const user = await requireActiveStatus(request);
  return GET(request)
}
