import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'

// Function to call Shopee API get_ads_data to verify session
async function verifyShopeeSession(cookies: string) {
    try {
        const cleanedCookies = cookies.replace(/\s+/g, ' ').replace(/[\r\n\t]/g, ' ').trim()
        const apiUrl = 'https://seller.shopee.co.id/api/pas/v1/meta/get_ads_data/'

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Cookie': cleanedCookies,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                info_type_list: ["ads_toggle"] // Lightest request
            })
        })

        if (response.status === 403) {
            return { valid: false, reason: '403 Forbidden - Session Expired' }
        }

        if (!response.ok) {
            return { valid: false, reason: `HTTP ${response.status}` }
        }

        const data = await response.json()
        // Shopee usually returns code: 0 for success
        if (data && data.code === 0) {
            return { valid: true }
        }

        return { valid: false, reason: data.msg || 'API returned error code' }
    } catch (error) {
        return { valid: false, reason: error instanceof Error ? error.message : 'Unknown network error' }
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireActiveStatus(request)
        const body = await request.json()
        const { id_toko } = body

        if (!id_toko) {
            return NextResponse.json({ success: false, error: 'Missing id_toko' }, { status: 400 })
        }

        const connection = await getDatabaseConnection()

        try {
            // 1. Get cookies
            const cookieQuery = 'SELECT cookies, nama_toko FROM data_toko WHERE id_toko = $1'
            const cookieResult = await connection.query(cookieQuery, [id_toko])

            if (cookieResult.rows.length === 0) {
                return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
            }

            const { cookies, nama_toko } = cookieResult.rows[0]

            if (!cookies) {
                // No cookies at all
                await connection.query(
                    "UPDATE data_toko SET status_cookies = 'no_cookies', update_at = CURRENT_TIMESTAMP WHERE id_toko = $1",
                    [id_toko]
                )
                return NextResponse.json({ success: true, health: 'no_cookies', message: 'No cookies found' })
            }

            // 2. Live Check with Shopee
            const session = await verifyShopeeSession(cookies)

            if (session.valid) {
                // Update database to 'aktif'
                await connection.query(
                    "UPDATE data_toko SET status_cookies = 'aktif', update_at = CURRENT_TIMESTAMP WHERE id_toko = $1",
                    [id_toko]
                )
                return NextResponse.json({
                    success: true,
                    health: 'healthy',
                    message: `Cookie for ${nama_toko} is VALID`
                })
            } else {
                // Update database to 'expire'
                await connection.query(
                    "UPDATE data_toko SET status_cookies = 'expire', update_at = CURRENT_TIMESTAMP WHERE id_toko = $1",
                    [id_toko]
                )
                return NextResponse.json({
                    success: true,
                    health: 'expired',
                    reason: session.reason,
                    message: `Cookie for ${nama_toko} is EXPIRED`
                })
            }

        } finally {
            connection.release()
        }

    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        )
    }
}
