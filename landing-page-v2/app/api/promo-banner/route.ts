import { NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

// GET - Get promo banner for public landing page (no auth required)
export async function GET() {
    try {
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

        return NextResponse.json(
            {
                success: false,
                error: 'Terjadi kesalahan',
                // Return default data on error so landing page still works
                data: {
                    isEnabled: false,
                    badgeText: '',
                    title: '',
                    description: '',
                    ctaText: '',
                }
            },
            { status: 500 }
        )
    }
}
