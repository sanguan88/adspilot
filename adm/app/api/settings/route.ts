import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

// Helper function to parse setting value based on type
function parseSettingValue(value: string, type: string): any {
  switch (type) {
    case 'boolean':
      return value === 'true' || value === '1'
    case 'number':
      return parseFloat(value) || 0
    case 'json':
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    default:
      return value
  }
}

// Helper function to stringify setting value
function stringifySettingValue(value: any): string {
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// GET - Get system settings
export async function GET(request: NextRequest) {
  try {
    // Require admin permission
    await requirePermission(request, 'canManageSettings')

    const connection = await getDatabaseConnection()

    try {
      // Fetch all settings from database
      const result = await connection.query(
        'SELECT setting_key, setting_value, setting_type, category FROM system_settings ORDER BY category, setting_key'
      )

      const rows = result.rows || []

      // Group settings by category
      const settings: Record<string, any> = {
        system: {},
        email: {},
        payment: {},
        security: {},
        notifications: {},
        affiliate: {},
      }

      rows.forEach((row: any) => {
        const category = row.category
        const key = row.setting_key.split('.')[1] // Remove category prefix
        const value = parseSettingValue(row.setting_value, row.setting_type)

        if (settings[category]) {
          settings[category][key] = value
        }
      })

      // Hide sensitive values
      if (settings.security.jwtSecret) {
        settings.security.jwtSecret = '***'
      }

      return NextResponse.json({
        success: true,
        data: settings,
      })
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Get settings error:', error)

    // If auth error, return 401/403
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message?.includes('Unauthorized') ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil settings' },
      { status: 500 }
    )
  }
}

// PUT - Update system settings
export async function PUT(request: NextRequest) {
  try {
    // Require admin permission
    const user = await requirePermission(request, 'canManageSettings')

    const body = await request.json()
    const connection = await getDatabaseConnection()

    try {
      // 1. Fetch CURRENT settings for comparison (Audit)
      const currentResult = await connection.query(
        'SELECT setting_key, setting_value FROM system_settings'
      )
      const oldRawValues: Record<string, string> = {}
      currentResult.rows.forEach((r: any) => {
        oldRawValues[r.setting_key] = r.setting_value
      })

      // Start transaction
      await connection.query('START TRANSACTION')

      const auditChanges: Record<string, { old: any, new: any }> = {}
      let updatedCount = 0

      // Update each category
      for (const [category, values] of Object.entries(body)) {
        if (typeof values !== 'object' || values === null) continue

        for (const [key, value] of Object.entries(values as Record<string, any>)) {
          const settingKey = `${category}.${key}`

          // Skip JWT secret (read-only)
          if (settingKey === 'security.jwtSecret') continue

          // Get setting type and current value
          const typeResult = await connection.query(
            'SELECT setting_type, setting_value FROM system_settings WHERE setting_key = $1',
            [settingKey]
          )

          if (typeResult.rows && typeResult.rows.length > 0) {
            const settingType = typeResult.rows[0].setting_type
            const oldVal = typeResult.rows[0].setting_value
            const stringValue = stringifySettingValue(value)

            // Only update if changed
            if (stringValue !== oldVal) {
              // Update setting
              await connection.query(
                `UPDATE system_settings 
                 SET setting_value = $1, updated_at = NOW(), updated_by = $2
                 WHERE setting_key = $3`,
                [stringValue, user.userId, settingKey]
              )

              auditChanges[settingKey] = {
                old: parseSettingValue(oldVal, settingType),
                new: value
              }
              updatedCount++
            }
          }
        }
      }

      // Commit transaction
      await connection.query('COMMIT')

      // Log audit if anything changed
      if (updatedCount > 0) {
        const oldValuesGrouped: Record<string, any> = {}
        const newValuesGrouped: Record<string, any> = {}

        Object.entries(auditChanges).forEach(([key, change]) => {
          oldValuesGrouped[key] = change.old
          newValuesGrouped[key] = change.new
        })

        await logAudit({
          userId: user.userId,
          userEmail: user.email,
          userRole: user.role,
          action: AuditActions.SETTINGS_UPDATE,
          resourceType: ResourceTypes.SETTINGS,
          description: `Updated ${updatedCount} system settings`,
          oldValues: oldValuesGrouped,
          newValues: newValuesGrouped,
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
        })
      }

      return NextResponse.json({
        success: true,
        message: `${updatedCount} settings updated successfully`,
        data: body,
      })
    } catch (error) {
      // Rollback on error
      await connection.query('ROLLBACK')
      throw error
    } finally {
      connection.release()
    }
  } catch (error: any) {
    console.error('Update settings error:', error)

    // If auth error, return 401/403
    if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message?.includes('Unauthorized') ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate settings' },
      { status: 500 }
    )
  }
}
