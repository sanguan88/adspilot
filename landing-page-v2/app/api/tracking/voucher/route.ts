import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
    host: process.env.DB_HOST || '154.19.37.198',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'soroboti_db',
    password: process.env.DB_PASSWORD || '123qweASD!@#!@#',
    database: process.env.DB_NAME || 'soroboti_ads',
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
})

/**
 * GET - Lookup affiliate's voucher by ref code
 * Returns voucher_code if affiliate has an active voucher
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const refCode = searchParams.get('ref')

        if (!refCode) {
            return NextResponse.json(
                { success: false, error: 'ref parameter required' },
                { status: 400 }
            )
        }

        // Handle campaign suffix: RIZKI_IG → RIZKI
        const baseCode = refCode.includes('_')
            ? refCode.split('_')[0]
            : refCode

        const client = await pool.connect()

        try {
            // Find affiliate by code and get their voucher
            const result = await client.query(
                `SELECT av.voucher_code, av.discount_value
        FROM affiliates a
        JOIN affiliate_vouchers av ON a.affiliate_id = av.affiliate_id
        WHERE a.affiliate_code = $1 
          AND a.status = 'active'
          AND av.is_active = true
        LIMIT 1`,
                [baseCode]
            )

            if (result.rows.length === 0) {
                return NextResponse.json({
                    success: true,
                    data: null,
                    message: 'No active voucher found for this affiliate'
                })
            }

            return NextResponse.json({
                success: true,
                data: {
                    voucherCode: result.rows[0].voucher_code,
                    discountValue: result.rows[0].discount_value
                }
            })
        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('Error looking up affiliate voucher:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to lookup voucher' },
            { status: 500 }
        )
    }
}
