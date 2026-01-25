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
        const dbSettings: Record<string, string> = {}
        result.rows.forEach((row: any) => {
            dbSettings[row.setting_key] = row.setting_value
        })

        // Fetch default voucher discount if enabled
        let voucherDiscountRate = parseFloat(dbSettings.voucher_discount_rate || '50')

        try {
            const defaultVoucherResult = await connection.query(
                `SELECT v.discount_value 
                 FROM payment_settings ps
                 JOIN vouchers v ON ps.default_voucher_id = v.id
                 WHERE ps.default_voucher_enabled = true 
                 ORDER BY ps.id DESC LIMIT 1`
            )

            if (defaultVoucherResult.rows.length > 0) {
                voucherDiscountRate = parseFloat(defaultVoucherResult.rows[0].discount_value)
            }
        } catch (vError) {
            console.error('Error fetching default voucher for affiliate settings:', vError)
        }

        return NextResponse.json({
            success: true,
            data: {
                defaultCommissionRate: parseFloat(dbSettings.default_commission_rate || '30'),
                voucherDiscountRate: voucherDiscountRate,
                minWithdrawalAmount: parseFloat(dbSettings.min_withdrawal_amount || '100000'),
                cookieExpirationDays: parseInt(dbSettings.cookie_expiration_days || '90')
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
