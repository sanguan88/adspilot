import { NextRequest, NextResponse } from 'next/server'
import { requireActiveStatus } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'

export async function GET(request: NextRequest) {
  let connection = null
  try {
    const user = await requireActiveStatus(request)

    connection = await getDatabaseConnection()

    // Get user settings with subscription info (LEFT JOIN)
    const result = await connection.query(
      `SELECT 
        u.nama_lengkap,
        u.email,
        u.photo_profile,
        u.status_user,
        u.no_whatsapp,
        u.settings,
        s.status as subscription_status,
        s.end_date as subscription_end_date,
        s.start_date as subscription_start_date,
        sp.name as plan_name,
        sp.plan_id,
        sp.duration_months,
        sp.max_accounts,
        sp.max_automation_rules
      FROM data_user u
      LEFT JOIN subscriptions s ON u.user_id = s.user_id AND s.status = 'active'
      LEFT JOIN subscription_plans sp ON s.plan_id = sp.plan_id
      WHERE u.user_id = $1`,
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
    const userSettings = userData.settings || {}

    // Get notification preferences from settings column
    const notificationSettings = {
      emailNotifications: userSettings.emailNotifications ?? true,
      telegramNotifications: userSettings.telegramNotifications ?? false
    }

    connection.release()

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          nama_lengkap: userData.nama_lengkap,
          email: userData.email,
          photo_profile: userData.photo_profile,
          no_whatsapp: userData.no_whatsapp,
        },
        subscription: userData.subscription_status ? {
          status: userData.subscription_status,
          plan_name: userData.plan_name,
          plan_id: userData.plan_id,
          start_date: userData.subscription_start_date,
          end_date: userData.subscription_end_date,
          duration_months: userData.duration_months,
          max_accounts: userData.max_accounts,
          max_automation_rules: userData.max_automation_rules,
        } : null,
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
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        connection.release()
        return NextResponse.json(
          {
            success: false,
            error: 'Format email tidak valid',
          },
          { status: 400 }
        )
      }
      updates.push(`email = $${paramIndex++}`)
      values.push(body.email)
    }

    if (body.no_whatsapp !== undefined) {
      // Validate WhatsApp number format (Indonesian)
      const cleanedNumber = body.no_whatsapp.replace(/\s/g, '')
      if (cleanedNumber && !cleanedNumber.match(/^(\+62|62|0)8[0-9]{8,11}$/)) {
        connection.release()
        return NextResponse.json(
          {
            success: false,
            error: 'Format nomor WhatsApp tidak valid. Gunakan format: +62xxx atau 08xxx',
          },
          { status: 400 }
        )
      }
      updates.push(`no_whatsapp = $${paramIndex++}`)
      values.push(cleanedNumber || null)
    }

    // Notification preferences
    const settingsUpdate: any = {}
    let hasSettingsUpdate = false

    if (body.emailNotifications !== undefined) {
      settingsUpdate.emailNotifications = body.emailNotifications
      hasSettingsUpdate = true
    }

    if (body.telegramNotifications !== undefined) {
      settingsUpdate.telegramNotifications = body.telegramNotifications
      hasSettingsUpdate = true
    }

    if (hasSettingsUpdate) {
      updates.push(`settings = COALESCE(settings, '{}'::jsonb) || $${paramIndex++}::jsonb`)
      values.push(JSON.stringify(settingsUpdate))
    }

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
      RETURNING nama_lengkap, email, photo_profile, no_whatsapp
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
          no_whatsapp: result.rows[0].no_whatsapp,
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

