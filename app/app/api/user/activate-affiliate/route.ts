import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // 1. Auth Check
        const user = await requireAuth(request)

        // 2. Get user full data (password hash) from DB
        const connection = await getDatabaseConnection()
        let userData = null

        try {
            // Query full user data needed for affiliate registration
            const result = await connection.query(
                'SELECT nama_lengkap, email, password, no_whatsapp FROM data_user WHERE user_id = $1',
                [user.userId]
            )

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Data user tidak ditemukan' },
                    { status: 404 }
                )
            }

            userData = result.rows[0]
        } finally {
            connection.release()
        }

        // 3. Call Affiliate Internal API
        const affiliateServiceUrl = process.env.AFFILIATE_SERVICE_URL || 'http://localhost:3003'
        const secret = process.env.INTERNAL_API_SECRET

        if (!secret) {
            console.error('INTERNAL_API_SECRET is not set in env')
            return NextResponse.json(
                { success: false, error: 'Configuration error' },
                { status: 500 }
            )
        }

        // Call the affiliate service
        console.log(`Calling affiliate service at ${affiliateServiceUrl}...`)

        const response = await fetch(`${affiliateServiceUrl}/api/internal/create-affiliate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal-secret': secret
            },
            body: JSON.stringify({
                name: userData.nama_lengkap,
                email: userData.email,
                password_hash: userData.password,
                whatsapp: userData.no_whatsapp,
                telegram: null // Telegram username is optional or not available in data_user
            })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Affiliate service error:', data)
            return NextResponse.json(
                { success: false, error: data.error || 'Gagal mengaktifkan akun affiliate' },
                { status: response.status }
            )
        }

        return NextResponse.json(data)

    } catch (error: any) {
        console.error('Activate affiliate error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Terjadi kesalahan sistem' },
            { status: 500 }
        )
    }
}
