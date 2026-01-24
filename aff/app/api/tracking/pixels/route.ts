import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')

        if (!code) {
            return NextResponse.json(
                { success: false, error: 'Affiliate code is required' },
                { status: 400 }
            )
        }

        const connection = await getDatabaseConnection()

        try {
            // Normalize code to handle variations (e.g. ADSPILOT_IG -> ADSPILOT)
            // If the code contains an underscore, we assume the part before it is the affiliate code
            const baseCode = code.includes('_') ? code.split('_')[0] : code

            // First get affiliate ID
            const affiliateRes = await connection.query(
                `SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1`,
                [baseCode]
            )

            if (affiliateRes.rows.length === 0) {
                return NextResponse.json({ success: true, data: null })
            }

            const affiliateId = affiliateRes.rows[0].affiliate_id

            // Get active pixels
            const pixelsRes = await connection.query(
                `SELECT platform, pixel_id FROM affiliate_pixels 
                 WHERE affiliate_id = $1 AND is_active = true`,
                [affiliateId]
            )

            const pixels = {
                fbPixelIds: [] as string[],
                tiktokPixelIds: [] as string[],
                googlePixelIds: [] as string[]
            }

            pixelsRes.rows.forEach(row => {
                if (row.platform === 'facebook') pixels.fbPixelIds.push(row.pixel_id)
                if (row.platform === 'tiktok') pixels.tiktokPixelIds.push(row.pixel_id)
                if (row.platform === 'google') pixels.googlePixelIds.push(row.pixel_id)
            })

            return NextResponse.json({
                success: true,
                data: pixels
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
