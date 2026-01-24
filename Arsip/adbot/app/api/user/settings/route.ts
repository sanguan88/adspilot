import { NextRequest, NextResponse } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'

export async function GET(request: NextRequest) {
  let connection = null
  try {
    const user = await requireActiveStatus(request)
    
    connection = await getDatabaseConnection()
    
    // Get user settings from database
    const result = await connection.query(
      `SELECT 
        nama_lengkap,
        email,
        photo_profile,
        status_user
      FROM data_user 
      WHERE user_id = $1`,
      [user.userId]
    )
    
    if (!result.rows || result.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      )
    }
    
    const userData = result.rows[0]
    
    // Get notification preferences (if exists in future table)
    // For now, return default values
    const notificationSettings = {
      emailNotifications: true,
      telegramNotifications: false
    }
    
    connection.release()
    
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          nama_lengkap: userData.nama_lengkap,
          email: userData.email,
          photo_profile: userData.photo_profile,
        },
        notifications: notificationSettings
      }
    })
  } catch (error: any) {
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch user settings',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  let connection = null
  try {
    const user = await requireActiveStatus(request)
    const body = await request.json()
    
    connection = await getDatabaseConnection()
    
    // Build update query dynamically based on provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    // Profile updates
    if (body.nama_lengkap !== undefined) {
      updates.push(`nama_lengkap = $${paramIndex++}`)
      values.push(body.nama_lengkap)
    }
    
    if (body.email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      values.push(body.email)
    }
    
    // Notification preferences (if we have a table for this in the future)
    // For now, we'll just update profile fields
    
    if (updates.length === 0) {
      connection.release()
      return NextResponse.json(
        {
          success: false,
          error: 'No fields to update',
        },
        { status: 400 }
      )
    }
    
    // Add user_id as last parameter
    values.push(user.userId)
    const whereClause = `WHERE user_id = $${paramIndex}`
    
    const updateQuery = `
      UPDATE data_user 
      SET ${updates.join(', ')}
      ${whereClause}
      RETURNING nama_lengkap, email, photo_profile
    `
    
    const result = await connection.query(updateQuery, values)
    
    if (!result.rows || result.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        {
          success: false,
          error: 'User not found or update failed',
        },
        { status: 404 }
      )
    }
    
    connection.release()
    
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          nama_lengkap: result.rows[0].nama_lengkap,
          email: result.rows[0].email,
          photo_profile: result.rows[0].photo_profile,
        }
      },
      message: 'Settings updated successfully'
    })
  } catch (error: any) {
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
    }
    
    console.error('Update user settings error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to update user settings',
      },
      { status: 500 }
    )
  }
}

