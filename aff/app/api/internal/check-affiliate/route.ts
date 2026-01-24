import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // Verify internal secret
        const secret = request.headers.get('x-internal-secret')
        const expectedSecret = process.env.INTERNAL_API_SECRET

        if (!secret || secret !== expectedSecret) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { email } = body

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            )
        }

        // Check if user exists in affiliate_users
        const connection = await getDatabaseConnection()

        try {
            const result = await connection.query(
                'SELECT affiliate_code, commission_rate, status FROM affiliates WHERE email = $1',
                [email]
            )

            if (result.rows.length === 0) {
                return NextResponse.json({
                    success: true,
                    isAffiliate: false
                })
            }

            const affiliate = result.rows[0]

            return NextResponse.json({
                success: true,
                isAffiliate: true,
                data: {
                    affiliateCode: affiliate.affiliate_code,
                    commissionRate: affiliate.commission_rate,
                    status: affiliate.status
                }
            })
        } finally {
            connection.release()
        }

    } catch (error: any) {
        console.error('Check affiliate error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
