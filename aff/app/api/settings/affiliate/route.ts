import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

/**
 * GET - Fetch affiliate settings (public endpoint for display purposes)
 * Returns discount rate, commission rate, etc from affiliate_settings table
 */
export async function GET(request: NextRequest) {
    let connection = null
    try {
        connection = await getDatabaseConnection()

        // Fetch settings from affiliate_settings table
        const result = await connection.query(
            `SELECT setting_key, setting_value FROM affiliate_settings`
        )

        // Convert rows to object
        const settings: Record<string, string> = {}
        result.rows.forEach((row: any) => {
            settings[row.setting_key] = row.setting_value
        })

        return NextResponse.json({
            success: true,
            data: {
                defaultCommissionRate: parseFloat(settings.default_commission_rate || '30'),
                voucherDiscountRate: parseFloat(settings.voucher_discount_rate || '50'),
                minWithdrawalAmount: parseFloat(settings.min_withdrawal_amount || '100000'),
                cookieExpirationDays: parseInt(settings.cookie_expiration_days || '90')
            }
        })
    } catch (error: any) {
        console.error('Error fetching affiliate settings:', error)
        // Return default values on error
        return NextResponse.json({
            success: true,
            data: {
                defaultCommissionRate: 30,
                voucherDiscountRate: 50,
                minWithdrawalAmount: 100000,
                cookieExpirationDays: 90
            }
        })
    } finally {
        if (connection) connection.release()
    }
}
