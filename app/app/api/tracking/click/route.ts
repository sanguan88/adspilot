import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const { referralCode } = await request.json()

        if (!referralCode) {
            return NextResponse.json({ success: false, error: 'Missing referral code' }, { status: 400 })
        }

        const connection = await getDatabaseConnection()

        try {
            // 1. Verify affiliate exists and is active
            const affiliateResult = await connection.query(
                'SELECT affiliate_id FROM affiliates WHERE affiliate_code = $1 AND status = $2',
                [referralCode, 'active']
            )

            if (affiliateResult.rows.length === 0) {
                // We log it anyway or just return success but do nothing? 
                // Better to return success so the frontend doesn't show an error, but don't log if it's fake.
                return NextResponse.json({ success: true, message: 'Invalid or inactive referral code' })
            }

            const affiliateId = affiliateResult.rows[0].affiliate_id

            // 2. Log the click (optional, but good for analytics)
            // I need to create affiliate_clicks table or just add to existing if I want.
            // For now, let's just create it if not exists.
            await connection.query(`
        CREATE TABLE IF NOT EXISTS affiliate_clicks (
          click_id SERIAL PRIMARY KEY,
          affiliate_id VARCHAR(50) NOT NULL,
          referral_code VARCHAR(50) NOT NULL,
          ip_address VARCHAR(50),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id)
        );
      `)

            const ip = request.headers.get('x-forwarded-for') || 'unknown'
            const ua = request.headers.get('user-agent') || 'unknown'

            await connection.query(
                'INSERT INTO affiliate_clicks (affiliate_id, referral_code, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
                [affiliateId, referralCode, ip, ua]
            )

            return NextResponse.json({ success: true })
        } finally {
            connection.release()
        }
    } catch (error) {
        console.error('Tracking click error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
