import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // Auth Check
        const user = await requireAuth(request)

        // Get user email from database
        const connection = await getDatabaseConnection()
        let userEmail = null

        try {
            const result = await connection.query(
                'SELECT email FROM data_user WHERE user_id = $1',
                [user.userId]
            )

            if (result.rows.length === 0) {
                return NextResponse.json({
                    success: true,
                    isAffiliate: false
                })
            }

            userEmail = result.rows[0].email
        } finally {
            connection.release()
        }

        // Call affiliate service to check status
        const affiliateServiceUrl = process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3003'
        const secret = process.env.INTERNAL_API_SECRET

        if (!secret) {
            console.error('INTERNAL_API_SECRET is not set')
            return NextResponse.json({
                success: true,
                isAffiliate: false
            })
        }

        try {
            const response = await fetch(`${affiliateServiceUrl}/api/internal/check-affiliate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-secret': secret
                },
                body: JSON.stringify({ email: userEmail })
            })

            if (!response.ok) {
                // If affiliate service returns error, assume not an affiliate
                return NextResponse.json({
                    success: true,
                    isAffiliate: false
                })
            }

            const data = await response.json()

            if (data.success && data.isAffiliate) {
                return NextResponse.json({
                    success: true,
                    isAffiliate: true,
                    data: {
                        affiliateCode: data.data?.affiliateCode,
                        commissionRate: data.data?.commissionRate,
                        status: data.data?.status
                    }
                })
            }

            return NextResponse.json({
                success: true,
                isAffiliate: false
            })
        } catch (fetchError) {
            console.error('Error calling affiliate service:', fetchError)
            // If affiliate service is down, assume not an affiliate
            return NextResponse.json({
                success: true,
                isAffiliate: false
            })
        }

    } catch (error: any) {
        console.error('Check affiliate status error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan sistem' },
            { status: 500 }
        )
    }
}
