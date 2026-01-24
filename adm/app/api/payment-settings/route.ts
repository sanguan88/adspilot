import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requirePermission } from '@/lib/auth-helper'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

/**
 * GET - Get payment settings
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin permission
    await requirePermission(request, 'canManageSettings')

    const connection = await getDatabaseConnection()

    try {
      // Get active payment method
      const paymentSettingsResult = await connection.query(
        `SELECT active_method, confirmation_email, default_voucher_enabled, default_voucher_id, updated_at 
         FROM payment_settings 
         ORDER BY id DESC 
         LIMIT 1`
      )

      let activeMethod = null
      let confirmationEmail = null
      let defaultVoucherEnabled = false
      let defaultVoucherId = null
      let defaultVoucher = null

      if (paymentSettingsResult.rows.length > 0) {
        activeMethod = paymentSettingsResult.rows[0].active_method
        confirmationEmail = paymentSettingsResult.rows[0].confirmation_email
        defaultVoucherEnabled = paymentSettingsResult.rows[0].default_voucher_enabled || false
        defaultVoucherId = paymentSettingsResult.rows[0].default_voucher_id
      }

      // Get default voucher details if enabled and voucher_id exists
      if (defaultVoucherEnabled && defaultVoucherId) {
        const voucherResult = await connection.query(
          `SELECT id, code, name, discount_type, discount_value, maximum_discount, is_active, expiry_date
           FROM vouchers
           WHERE id = $1`,
          [defaultVoucherId]
        )

        if (voucherResult.rows.length > 0) {
          const v = voucherResult.rows[0]
          defaultVoucher = {
            id: v.id,
            code: v.code,
            name: v.name,
            discountType: v.discount_type,
            discountValue: parseFloat(v.discount_value),
            maximumDiscount: v.maximum_discount ? parseFloat(v.maximum_discount) : null,
            isActive: v.is_active,
            expiryDate: v.expiry_date,
          }
        }
      }

      // Get bank accounts (always fetch, even if not active)
      const bankAccountsResult = await connection.query(
        `SELECT id, bank_name, account_number, account_name, is_active, display_order
         FROM bank_accounts
         ORDER BY display_order ASC, id ASC`
      )

      // Get payment gateway config (always fetch, even if not active)
      const gatewayConfigResult = await connection.query(
        `SELECT id, provider, environment, server_key, client_key, webhook_url, is_active
         FROM payment_gateway_config
         ORDER BY id DESC
         LIMIT 1`
      )

      let gatewayConfig = null
      if (gatewayConfigResult.rows.length > 0) {
        const config = gatewayConfigResult.rows[0]
        gatewayConfig = {
          id: config.id,
          provider: config.provider,
          environment: config.environment,
          clientKey: config.client_key,
          webhookUrl: config.webhook_url,
          isActive: config.is_active,
          hasServerKey: !!config.server_key, // Indikator apakah server_key (API Token) sudah di-set
        }
      }

      connection.release()

      return NextResponse.json({
        success: true,
        data: {
          activeMethod,
          confirmationEmail,
          defaultVoucherEnabled,
          defaultVoucherId,
          defaultVoucher,
          bankAccounts: bankAccountsResult.rows,
          gatewayConfig,
        },
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Get payment settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil payment settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update payment settings
 */
export async function PUT(request: NextRequest) {
  try {
    // Require admin permission
    const adminUser = await requirePermission(request, 'canManageSettings')

    const body = await request.json()
    const { activeMethod, confirmationEmail, defaultVoucherEnabled, defaultVoucherId } = body

    // Validate activeMethod if provided
    if (activeMethod && !['manual', 'gateway'].includes(activeMethod)) {
      return NextResponse.json(
        { success: false, error: 'activeMethod harus manual atau gateway' },
        { status: 400 }
      )
    }

    // Validate defaultVoucherId if defaultVoucherEnabled is true
    if (defaultVoucherEnabled !== undefined && defaultVoucherEnabled && !defaultVoucherId) {
      return NextResponse.json(
        { success: false, error: 'defaultVoucherId diperlukan jika defaultVoucherEnabled adalah true' },
        { status: 400 }
      )
    }

    const connection = await getDatabaseConnection()

    // Validate voucher exists and is active if defaultVoucherEnabled is true
    if (defaultVoucherEnabled !== undefined && defaultVoucherEnabled && defaultVoucherId) {
      try {
        const voucherCheck = await connection.query(
          `SELECT id, is_active, expiry_date FROM vouchers WHERE id = $1`,
          [defaultVoucherId]
        )

        if (voucherCheck.rows.length === 0) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Voucher tidak ditemukan' },
            { status: 404 }
          )
        }

        const voucher = voucherCheck.rows[0]
        if (!voucher.is_active) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Voucher tidak aktif' },
            { status: 400 }
          )
        }

        if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Voucher sudah kadaluarsa' },
            { status: 400 }
          )
        }
      } catch (error) {
        connection.release()
        throw error
      }
    }

    try {
      // Check if payment_settings exists
      const existingResult = await connection.query(
        `SELECT id, active_method, confirmation_email, default_voucher_enabled, default_voucher_id 
         FROM payment_settings ORDER BY id DESC LIMIT 1`
      )

      if (existingResult.rows.length === 0) {
        // Insert new - activeMethod is required for new record
        if (!activeMethod) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'activeMethod diperlukan untuk membuat payment settings baru' },
            { status: 400 }
          )
        }
        await connection.query(
          `INSERT INTO payment_settings (
            active_method, confirmation_email, 
            default_voucher_enabled, default_voucher_id, 
            updated_at
          )
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            activeMethod,
            confirmationEmail || null,
            defaultVoucherEnabled !== undefined ? defaultVoucherEnabled : false,
            (defaultVoucherEnabled && defaultVoucherId) ? defaultVoucherId : null,
          ]
        )

        // Log audit for creation
        await logAudit({
          userId: adminUser.userId,
          userEmail: adminUser.email,
          userRole: adminUser.role,
          action: AuditActions.SETTINGS_UPDATE,
          resourceType: ResourceTypes.SETTINGS,
          resourceId: 'payment_settings',
          description: 'Created initial payment settings',
          newValues: { activeMethod, confirmationEmail, defaultVoucherEnabled, defaultVoucherId },
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
        })
      } else {
        // Update existing - update only provided fields
        const current = existingResult.rows[0]
        const newActiveMethod = activeMethod !== undefined ? activeMethod : current.active_method
        const newConfirmationEmail = confirmationEmail !== undefined ? (confirmationEmail || null) : current.confirmation_email
        const newDefaultVoucherEnabled = defaultVoucherEnabled !== undefined ? defaultVoucherEnabled : (current.default_voucher_enabled || false)
        const newDefaultVoucherId = (defaultVoucherEnabled !== undefined && defaultVoucherId !== undefined)
          ? (defaultVoucherEnabled ? defaultVoucherId : null)
          : current.default_voucher_id

        await connection.query(
          `UPDATE payment_settings 
           SET active_method = $1, 
               confirmation_email = $2, 
               default_voucher_enabled = $3,
               default_voucher_id = $4,
               updated_at = NOW()
           WHERE id = (SELECT id FROM payment_settings ORDER BY id DESC LIMIT 1)`,
          [newActiveMethod, newConfirmationEmail, newDefaultVoucherEnabled, newDefaultVoucherId]
        )

        // Log audit for update
        await logAudit({
          userId: adminUser.userId,
          userEmail: adminUser.email,
          userRole: adminUser.role,
          action: AuditActions.SETTINGS_UPDATE,
          resourceType: ResourceTypes.SETTINGS,
          resourceId: 'payment_settings',
          description: 'Updated payment settings',
          oldValues: {
            activeMethod: current.active_method,
            confirmationEmail: current.confirmation_email,
            defaultVoucherEnabled: current.default_voucher_enabled,
            defaultVoucherId: current.default_voucher_id
          },
          newValues: {
            activeMethod: newActiveMethod,
            confirmationEmail: newConfirmationEmail,
            defaultVoucherEnabled: newDefaultVoucherEnabled,
            defaultVoucherId: newDefaultVoucherId
          },
          ipAddress: getIpAddress(request),
          userAgent: getUserAgent(request),
        })

        // --- NEW: Process Moota Config if provided ---
        const { mootaConfig } = body
        if (mootaConfig) {
          const { enabled, apiToken, webhookSecret } = mootaConfig

          // Check if moota config exists
          const mootaCheck = await connection.query(
            `SELECT id FROM payment_gateway_config WHERE provider = 'moota' LIMIT 1`
          )

          if (mootaCheck.rows.length === 0) {
            // Insert new Moota config
            await connection.query(
              `INSERT INTO payment_gateway_config (
                provider, environment, server_key, client_key, is_active, updated_at
              ) VALUES ('moota', 'production', $1, $2, $3, NOW())`,
              [apiToken || '', webhookSecret || '', enabled]
            )
          } else {
            // Update existing Moota config
            // Only update apiToken if it was provided (not undefined)
            if (apiToken !== undefined) {
              await connection.query(
                `UPDATE payment_gateway_config 
                 SET server_key = $1, client_key = $2, is_active = $3, updated_at = NOW()
                 WHERE provider = 'moota'`,
                [apiToken, webhookSecret, enabled]
              )
            } else {
              await connection.query(
                `UPDATE payment_gateway_config 
                 SET client_key = $1, is_active = $2, updated_at = NOW()
                 WHERE provider = 'moota'`,
                [webhookSecret, enabled]
              )
            }
          }
        }
      }

      connection.release()

      return NextResponse.json({
        success: true,
        message: 'Payment settings berhasil diupdate',
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Update payment settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate payment settings' },
      { status: 500 }
    )
  }
}

