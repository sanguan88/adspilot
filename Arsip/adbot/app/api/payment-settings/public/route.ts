import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

/**
 * GET - Get public payment settings (for payment confirmation page)
 * No authentication required
 */
export async function GET() {
  try {
    const connection = await getDatabaseConnection()

    try {
      // Get active payment method and default voucher
      const paymentSettingsResult = await connection.query(
        `SELECT active_method, confirmation_email, default_voucher_enabled, default_voucher_id
         FROM payment_settings 
         ORDER BY id DESC 
         LIMIT 1`
      )

      let activeMethod = null
      let confirmationEmail = null
      let defaultVoucherCode = null
      
      if (paymentSettingsResult.rows.length > 0) {
        activeMethod = paymentSettingsResult.rows[0].active_method
        confirmationEmail = paymentSettingsResult.rows[0].confirmation_email
        
        // Get default voucher code if enabled
        if (paymentSettingsResult.rows[0].default_voucher_enabled && paymentSettingsResult.rows[0].default_voucher_id) {
          const voucherResult = await connection.query(
            `SELECT code FROM vouchers WHERE id = $1 AND is_active = true 
             AND (expiry_date IS NULL OR expiry_date > NOW())`,
            [paymentSettingsResult.rows[0].default_voucher_id]
          )
          if (voucherResult.rows.length > 0) {
            defaultVoucherCode = voucherResult.rows[0].code
          }
        }
      }

      // Get active bank accounts (only if manual is active)
      let bankAccounts: any[] = []
      if (activeMethod === 'manual') {
        const bankAccountsResult = await connection.query(
          `SELECT id, bank_name, account_number, account_name
           FROM bank_accounts
           WHERE is_active = true
           ORDER BY display_order ASC, id ASC`
        )
        bankAccounts = bankAccountsResult.rows
      }

      connection.release()

      return NextResponse.json({
        success: true,
        data: {
          activeMethod,
          confirmationEmail,
          defaultVoucherCode,
          bankAccounts,
        },
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Get public payment settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil payment settings' },
      { status: 500 }
    )
  }
}

