import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

// GET - Get promo banner settings
export async function GET(request: NextRequest) {
    try {
        // Require admin permission
        await requirePermission(request, 'canManageSettings')

        const connection = await getDatabaseConnection()

        try {
            const result = await connection.query(
                `SELECT setting_key, setting_value, setting_type 
         FROM system_settings 
         WHERE category = 'promo'
         ORDER BY setting_key`
            )

            const promoBanner: Record<string, any> = {
                isEnabled: true,
                badgeText: '',
                title: '',
                description: '',
                ctaText: '',
            }

            result.rows.forEach((row: any) => {
                const key = row.setting_key.replace('promo.', '')
                let value = row.setting_value

                // Parse boolean
                if (row.setting_type === 'boolean') {
                    value = value === 'true' || value === '1'
                }

                // Map to camelCase
                const keyMap: Record<string, string> = {
                    'is_enabled': 'isEnabled',
                    'badge_text': 'badgeText',
                    'cta_text': 'ctaText',
                }

                const mappedKey = keyMap[key] || key
                promoBanner[mappedKey] = value
            })

            return NextResponse.json({
                success: true,
                data: promoBanner,
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Get promo banner error:', error)

        if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: error.message?.includes('Unauthorized') ? 401 : 403 }
            )
        }

        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil promo banner' },
            { status: 500 }
        )
    }
}

// PUT - Update promo banner settings
export async function PUT(request: NextRequest) {
    try {
        const user = await requirePermission(request, 'canManageSettings')

        const body = await request.json()
        const { isEnabled, badgeText, title, description, ctaText } = body

        const connection = await getDatabaseConnection()

        try {
            // Fetch old values for audit
            const oldResult = await connection.query(
                `SELECT setting_key, setting_value FROM system_settings WHERE category = 'promo'`
            )
            const oldValues: Record<string, string> = {}
            oldResult.rows.forEach((row: any) => {
                oldValues[row.setting_key] = row.setting_value
            })

            await connection.query('START TRANSACTION')

            // Update each setting
            const updates = [
                { key: 'promo.is_enabled', value: String(isEnabled) },
                { key: 'promo.badge_text', value: badgeText || '' },
                { key: 'promo.title', value: title || '' },
                { key: 'promo.description', value: description || '' },
                { key: 'promo.cta_text', value: ctaText || '' },
            ]

            for (const update of updates) {
                await connection.query(
                    `UPDATE system_settings 
           SET setting_value = $1, updated_at = NOW(), updated_by = $2
           WHERE setting_key = $3`,
                    [update.value, user.userId, update.key]
                )
            }

            await connection.query('COMMIT')

            // Log audit
            await logAudit({
                userId: user.userId,
                userEmail: user.email,
                userRole: user.role,
                action: AuditActions.SETTINGS_UPDATE,
                resourceType: ResourceTypes.SETTINGS,
                description: 'Updated promo banner settings',
                oldValues,
                newValues: Object.fromEntries(updates.map(u => [u.key, u.value])),
                ipAddress: getIpAddress(request),
                userAgent: getUserAgent(request),
            })

            return NextResponse.json({
                success: true,
                message: 'Promo banner berhasil diupdate',
            })
        } catch (error) {
            await connection.query('ROLLBACK')
            throw error
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Update promo banner error:', error)

        if (error.message?.includes('Unauthorized') || error.message?.includes('permission')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: error.message?.includes('Unauthorized') ? 401 : 403 }
            )
        }

        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengupdate promo banner' },
            { status: 500 }
        )
    }
}
