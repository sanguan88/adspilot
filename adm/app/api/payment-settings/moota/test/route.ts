import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'

/**
 * POST - Test Moota connection
 */
export async function POST(request: NextRequest) {
    try {
        // Require admin permission
        await requirePermission(request, 'canManageSettings')

        const connection = await getDatabaseConnection()

        try {
            // Get Moota config from database
            const result = await connection.query(
                `SELECT server_key, is_active FROM payment_gateway_config WHERE provider = 'moota' LIMIT 1`
            )

            connection.release()

            if (result.rows.length === 0 || !result.rows[0].server_key) {
                return NextResponse.json(
                    { success: false, error: 'Konfigurasi Moota tidak ditemukan' },
                    { status: 404 }
                )
            }

            const apiToken = result.rows[0].server_key

            // Call Moota API to check profile/balance
            const response = await fetch('https://app.moota.co/api/v2/profile', {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Accept': 'application/json'
                }
            })

            const data = await response.json()

            if (!response.ok) {
                return NextResponse.json({
                    success: false,
                    error: data.message || 'Gagal terhubung ke Moota. Pastikan API Token benar.',
                    status: response.status
                })
            }

            // Success! Return useful info
            return NextResponse.json({
                success: true,
                data: {
                    name: data.name,
                    email: data.email,
                    points: data.points, // Moota points/balance
                    membership: data.membership_name,
                }
            })

        } catch (error: any) {
            if (connection) connection.release()
            throw error
        }
    } catch (error: any) {
        console.error('Test Moota connection error:', error)
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan sistem saat mencoba koneksi' },
            { status: 500 }
        )
    }
}
