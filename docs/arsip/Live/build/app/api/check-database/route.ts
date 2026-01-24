import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/check-database - Check responsedata table
export const GET = async (request: NextRequest) => {
  try {
    // Check if responsedata table exists
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'responsedata'
    `
    
    const tableExists = await db.query(tableCheckQuery)
    
    if (!tableExists || tableExists.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Table responsedata tidak ditemukan',
        tableExists: false
      })
    }
    
    // Get table structure
    const columnsQuery = `
      SELECT 
        column_name, 
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'responsedata'
      ORDER BY ordinal_position
    `
    
    const columns = await db.query(columnsQuery)
    
    // Count total rows
    const countQuery = `SELECT COUNT(*) as total_rows FROM responsedata`
    const countResult = await db.getOne(countQuery)
    
    // Get sample data - simple query first
    let samples = []
    let usernames = []
    
    try {
      // Try to get usernames first
      const usernamesQuery = `SELECT * FROM responsedata LIMIT 5`
      const rawSamples = await db.query(usernamesQuery)
      
      if (rawSamples && rawSamples.length > 0) {
        // Extract usernames from samples
        const firstRow = rawSamples[0]
        const usernameKey = Object.keys(firstRow).find(key => key.toLowerCase() === 'username')
        
        if (usernameKey) {
          usernames = rawSamples.map((row: any) => row[usernameKey]).filter(Boolean)
        }
        
        // Create summary of sample data
        samples = rawSamples.map((row: any) => {
          const summary: any = {}
          Object.keys(row).forEach(key => {
            if (key.toLowerCase() === 'username') {
              summary.username = row[key]
            } else {
              const value = row[key]
              summary[key] = {
                has_data: value !== null && value !== '',
                data_length: typeof value === 'string' ? value.length : 0,
                preview: typeof value === 'string' && value.length > 0 
                  ? value.substring(0, 100) + (value.length > 100 ? '...' : '')
                  : null
              }
            }
          })
          return summary
        })
      }
    } catch (err: any) {
      console.error('Error fetching sample data:', err.message)
    }
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      columns: columns || [],
      totalRows: countResult?.total_rows || 0,
      samples: samples || [],
      usernames: usernames?.map((u: any) => u.username) || [],
      message: 'Table responsedata ditemukan'
    })

  } catch (error: any) {
    console.error('Error checking database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        tableExists: false,
        columns: [],
        totalRows: 0,
        samples: [],
        usernames: []
      },
      { status: 500 }
    )
  }
}

