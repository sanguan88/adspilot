import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}

export async function POST(request: NextRequest) {
    try {
        const { referralCode } = await request.json()

        if (!referralCode) {
            return NextResponse.json(
                { success: false, error: 'Missing referral code' },
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            )
        }

        const connection = await getDatabaseConnection()

        try {
            // 1. Verify affiliate exists and is active
            const affiliateResult = await connection.query(
                'SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1 AND status = $2',
                [referralCode.split('_')[0], 'active'] // Handle custom ref format like CODE_VAR
            )

            // If main code not found, try exact match (just in case)
            let affiliateId = null;

            if (affiliateResult.rows.length > 0) {
                affiliateId = affiliateResult.rows[0].affiliate_id
            } else {
                // Try exact match
                const exactMatch = await connection.query(
                    'SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1 AND status = $2',
                    [referralCode, 'active']
                )
                if (exactMatch.rows.length > 0) {
                    affiliateId = exactMatch.rows[0].affiliate_id
                }
            }

            if (!affiliateId) {
                return NextResponse.json(
                    { success: true, message: 'Invalid or inactive referral code' },
                    { headers: { 'Access-Control-Allow-Origin': '*' } }
                )
            }

            // Ensure link_id column exists
            await connection.query(`
                ALTER TABLE affiliate_clicks 
                ADD COLUMN IF NOT EXISTS link_id INTEGER;
            `);

            // Try to find matching tracking link
            const linkResult = await connection.query(
                `SELECT link_id FROM tracking_links WHERE url LIKE $1 ORDER BY created_at DESC LIMIT 1`,
                [`%ref=${referralCode}%`]
            );

            const linkId = linkResult.rows.length > 0 ? linkResult.rows[0].link_id : null;

            const ip = request.headers.get('x-forwarded-for') || 'unknown'
            const ua = request.headers.get('user-agent') || 'unknown'

            await connection.query(
                'INSERT INTO affiliate_clicks (affiliate_id, referral_code, link_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
                [affiliateId, referralCode, linkId, ip, ua]
            )

            return NextResponse.json(
                { success: true },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
            )
        } finally {
            connection.release()
        }
    } catch (error) {
        console.error('Tracking click error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        )
    }
}
