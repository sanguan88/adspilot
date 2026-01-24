import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireAffiliateAuth } from '@/lib/auth-helper'

export const dynamic = 'force-dynamic'

// GET /api/pixels - List all pixels for the affiliate
export async function GET(request: NextRequest) {
    try {
        const { authorized, response, affiliate } = await requireAffiliateAuth(request)
        if (!authorized || !affiliate) return response

        const { searchParams } = new URL(request.url)
        const platform = searchParams.get('platform')

        const connection = await getDatabaseConnection()

        try {
            let query = `
        SELECT id, platform, pixel_id as "pixelId", name, is_active as "isActive", created_at as "createdAt"
        FROM affiliate_pixels 
        WHERE affiliate_id = $1
      `
            const params: any[] = [affiliate.affiliateId]

            if (platform) {
                query += ` AND platform = $2`
                params.push(platform)
            }

            query += ` ORDER BY created_at DESC`

            const result = await connection.query(query, params)

            return NextResponse.json({
                success: true,
                data: result.rows
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Get pixels error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/pixels - Add a new pixel
export async function POST(request: NextRequest) {
    try {
        const { authorized, response, affiliate } = await requireAffiliateAuth(request)
        if (!authorized || !affiliate) return response

        const body = await request.json()
        const { platform, pixelId, name } = body

        if (!platform || !['facebook', 'tiktok', 'google'].includes(platform)) {
            return NextResponse.json({ success: false, error: 'Invalid platform' }, { status: 400 })
        }
        if (!pixelId) {
            return NextResponse.json({ success: false, error: 'Pixel ID is required' }, { status: 400 })
        }

        const connection = await getDatabaseConnection()

        try {
            // Limit check (max 5 pixels per platform to prevent abuse)
            const countCheck = await connection.query(
                `SELECT COUNT(*) as count FROM affiliate_pixels WHERE affiliate_id = $1 AND platform = $2`,
                [affiliate.affiliateId, platform]
            )

            if (parseInt(countCheck.rows[0].count) >= 5) {
                return NextResponse.json(
                    { success: false, error: `Maximum limit of 5 ${platform} pixels reached` },
                    { status: 400 }
                )
            }

            const result = await connection.query(
                `INSERT INTO affiliate_pixels (affiliate_id, platform, pixel_id, name, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, platform, pixel_id as "pixelId", name, is_active as "isActive", created_at as "createdAt"`,
                [affiliate.affiliateId, platform, pixelId, name || `${platform} Pixel`]
            )

            return NextResponse.json({
                success: true,
                data: result.rows[0]
            })
        } finally {
            connection.release()
        }
    } catch (error: any) {
        console.error('Add pixel error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
