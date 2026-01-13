import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/tracking/pixels/log
 * Log pixel firing events for health monitoring
 * 
 * Body: {
 *   affiliateCode: string,
 *   platform: 'facebook' | 'tiktok' | 'google',
 *   eventName: string (e.g., 'Purchase', 'PageView'),
 *   pixelId: string,
 *   payload?: object (optional context data)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { affiliateCode, platform, eventName, pixelId, payload } = body

        // Validation
        if (!affiliateCode || !platform || !eventName) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: affiliateCode, platform, eventName' },
                { status: 400 }
            )
        }

        const connection = await getDatabaseConnection()

        try {
            // Normalize code (handle variations like ADSPILOT_IG -> ADSPILOT)
            const baseCode = affiliateCode.includes('_')
                ? affiliateCode.split('_')[0]
                : affiliateCode

            // Get affiliate ID
            const affiliateRes = await connection.query(
                `SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1`,
                [baseCode]
            )

            if (affiliateRes.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Affiliate not found' },
                    { status: 404 }
                )
            }

            const affiliateId = affiliateRes.rows[0].affiliate_id

            // Insert log
            await connection.query(
                `INSERT INTO affiliate_pixel_logs 
                (affiliate_id, platform, pixel_id, event_name, event_status, payload, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [
                    affiliateId,
                    platform.toLowerCase(),
                    pixelId || null,
                    eventName,
                    'success', // Default to success, can be 'failed' if error
                    payload ? JSON.stringify(payload) : null
                ]
            )

            return NextResponse.json({
                success: true,
                message: 'Pixel event logged successfully'
            })

        } finally {
            connection.release()
        }

    } catch (error: any) {
        console.error('Pixel logging error:', error)

        // Try to log the error to database if possible
        try {
            const body = await request.json()
            const connection = await getDatabaseConnection()

            if (body.affiliateCode) {
                const baseCode = body.affiliateCode.includes('_')
                    ? body.affiliateCode.split('_')[0]
                    : body.affiliateCode

                const affiliateRes = await connection.query(
                    `SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1`,
                    [baseCode]
                )

                if (affiliateRes.rows.length > 0) {
                    await connection.query(
                        `INSERT INTO affiliate_pixel_logs 
                        (affiliate_id, platform, pixel_id, event_name, event_status, error_message, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                        [
                            affiliateRes.rows[0].affiliate_id,
                            body.platform || 'unknown',
                            body.pixelId || null,
                            body.eventName || 'unknown',
                            'failed',
                            error.message
                        ]
                    )
                }

                connection.release()
            }
        } catch (logError) {
            console.error('Failed to log error to database:', logError)
        }

        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
