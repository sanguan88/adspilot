import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

/**
 * POST - Process payment action for a transaction
 * Actions: 'confirm', 'reject', 'request_proof'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params
    const body = await request.json()
    const { action, notes } = body

    // Validate action
    if (!action || !['confirm', 'reject', 'request_proof'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action harus: confirm, reject, atau request_proof' },
        { status: 400 }
      )
    }

    // Validate notes for reject and request_proof
    if ((action === 'reject' || action === 'request_proof') && !notes?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Catatan wajib diisi untuk action reject atau request_proof' },
        { status: 400 }
      )
    }

    // Get authenticated admin user
    let adminUser
    try {
      adminUser = await getAdminUser(request)
      if (!adminUser) {
        console.error('Admin user not found or unauthorized')
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
      console.log('Admin user authenticated:', { userId: adminUser.userId, role: adminUser.role })
    } catch (authError: any) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }

    console.log('Processing payment confirmation:', { orderId, action, notes: notes?.substring(0, 50) })

    const result = await withDatabaseConnection(async (connection) => {
      // Get transaction with full details
      const transactionResult = await connection.query(
        `SELECT 
          id, transaction_id, user_id, payment_status, plan_id,
          base_amount, ppn_amount, total_amount, discount_amount, voucher_affiliate_id
        FROM transactions 
        WHERE transaction_id = $1`,
        [orderId]
      )

      if (transactionResult.rows.length === 0) {
        console.error('Transaction not found:', orderId)
        return { error: 'Transaksi tidak ditemukan' }
      }

      const transaction = transactionResult.rows[0]
      console.log('Transaction found:', {
        transactionId: transaction.transaction_id,
        userId: transaction.user_id,
        planId: transaction.plan_id,
        currentStatus: transaction.payment_status,
      })

      // Check if already processed (allow confirm/reject from waiting_confirmation)
      if (!['pending', 'waiting_confirmation'].includes(transaction.payment_status)) {
        return { error: `Transaksi sudah diproses dengan status: ${transaction.payment_status}` }
      }

      // Start transaction
      await connection.query('BEGIN')

      try {
        let newStatus: string
        let updateUserStatus = false
        let message: string

        switch (action) {
          case 'confirm':
            newStatus = 'paid'
            updateUserStatus = true
            message = 'Pembayaran berhasil dikonfirmasi'
            break
          case 'reject':
            newStatus = 'rejected'
            updateUserStatus = false
            message = 'Pembayaran ditolak'
            break
          case 'request_proof':
            newStatus = 'pending' // Tetap pending
            updateUserStatus = false
            message = 'Request bukti pembayaran berhasil dikirim'
            break
          default:
            throw new Error('Invalid action')
        }

        const confirmedAt = action === 'confirm' || action === 'reject' ? new Date() : null

        // Update transaction status
        if (action === 'confirm' || action === 'reject') {
          // Handle payment_confirmed_by: column is INTEGER, so we need to:
          // 1. For bypass-admin: use NULL (can't convert UUID to INTEGER)
          // 2. For real admin: try to find admin user_id from data_user table, or use NULL
          let confirmedBy: number | null = null

          if (adminUser.userId !== 'bypass-admin') {
            // Try to find admin user_id from data_user table
            // Admin user_id might be stored as INTEGER (no) or VARCHAR (user_id)
            // We'll try to find by username or email first
            try {
              const adminUserResult = await connection.query(
                `SELECT no, user_id FROM data_user 
                 WHERE user_id = $1 OR username = $2 
                 LIMIT 1`,
                [adminUser.userId, adminUser.userId]
              )

              if (adminUserResult.rows.length > 0) {
                // Use 'no' (INTEGER) if available, otherwise NULL
                confirmedBy = adminUserResult.rows[0].no || null
              }
            } catch (err) {
              console.error('Error finding admin user_id:', err)
              // Continue with NULL if error
            }
          }
          // For bypass-admin or if admin not found, confirmedBy remains NULL

          await connection.query(
            `UPDATE transactions 
             SET payment_status = $1,
                 payment_confirmed_at = $2,
                 payment_confirmed_by = $3,
                 payment_notes = $4,
                 updated_at = NOW()
             WHERE transaction_id = $5`,
            [
              newStatus,
              confirmedAt,
              confirmedBy,
              notes || null,
              orderId
            ]
          )
        } else {
          // request_proof: hanya update notes, status tetap pending
          await connection.query(
            `UPDATE transactions 
             SET payment_notes = $1,
                 updated_at = NOW()
             WHERE transaction_id = $2`,
            [notes, orderId]
          )
        }

        // Update user status based on action
        if (action === 'confirm') {
          // Set to 'active' when payment confirmed
          await connection.query(
            `UPDATE data_user 
             SET status_user = 'active',
                 update_at = NOW()
             WHERE user_id = $1`,
            [transaction.user_id]
          )
          console.log('User status updated to active:', transaction.user_id)
        } else if (action === 'reject') {
          // Set to 'pending_payment' when payment rejected (if not already)
          await connection.query(
            `UPDATE data_user 
             SET status_user = 'pending_payment',
                 update_at = NOW()
             WHERE user_id = $1 AND status_user != 'pending_payment'`,
            [transaction.user_id]
          )
          console.log('User status updated to pending_payment:', transaction.user_id)
        }

        // Auto-create subscription when payment is confirmed
        if (updateUserStatus) {
          // 1. Expire existing active subscription (if any)
          await connection.query(
            `UPDATE subscriptions 
             SET status = 'expired',
                 updated_at = NOW()
             WHERE user_id = $1 AND status = 'active'`,
            [transaction.user_id]
          )

          // 2. Calculate subscription period based on plan_id
          const planDuration: { [key: string]: number } = {
            '1-month': 1,
            '3-month': 3,
            '6-month': 6,
          }
          const months = planDuration[transaction.plan_id] || 1

          // Ensure confirmedAt is a valid Date
          const startDate = confirmedAt ? new Date(confirmedAt) : new Date()
          const endDate = new Date(startDate)
          endDate.setMonth(endDate.getMonth() + months)

          // 3. Determine billing cycle
          const billingCycleMap: { [key: string]: string } = {
            '1-month': 'monthly',
            '3-month': 'quarterly',
            '6-month': 'semi-annual',
          }
          const billingCycle = billingCycleMap[transaction.plan_id] || 'monthly'

          // Format dates as YYYY-MM-DD
          const startDateStr = startDate.toISOString().split('T')[0]
          const endDateStr = endDate.toISOString().split('T')[0]

          // 4. Create new subscription
          await connection.query(
            `INSERT INTO subscriptions (
              user_id, plan_id, transaction_id,
              status, start_date, end_date, billing_cycle,
              base_amount, ppn_amount, total_amount,
              auto_renew, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
            [
              transaction.user_id,
              transaction.plan_id,
              transaction.transaction_id,
              'active',
              startDateStr,
              endDateStr,
              billingCycle,
              parseFloat(String(transaction.base_amount)),
              parseFloat(String(transaction.ppn_amount)),
              parseFloat(String(transaction.total_amount)),
              false, // auto_renew default false
            ]
          )

          // 5. AFFILIATE COMMISSION PROCESSING
          // Priority: Voucher-based attribution > Cookie-based attribution
          try {
            let affiliateId: string | null = null
            let affiliateCode: string | null = null
            let attributionSource = ''

            // PRIORITY 1: Check if transaction used an affiliate voucher
            if (transaction.voucher_affiliate_id) {
              affiliateId = transaction.voucher_affiliate_id
              attributionSource = 'voucher'
              console.log(`[Affiliate] Attribution via voucher, affiliate_id: ${affiliateId}`)
            } else {
              // PRIORITY 2: Check if user was referred by an affiliate (cookie)
              const userResult = await connection.query(
                'SELECT referred_by_affiliate FROM data_user WHERE user_id = $1',
                [transaction.user_id]
              )

              affiliateCode = userResult.rows[0]?.referred_by_affiliate
              if (affiliateCode) {
                attributionSource = 'referral_cookie'
                console.log(`[Affiliate] Attribution via cookie, affiliate_code: ${affiliateCode}`)
              }
            }

            // Process commission if we have an affiliate
            if (affiliateId || affiliateCode) {
              let affiliateResult

              if (affiliateId) {
                // Get by affiliate_id (from voucher)
                affiliateResult = await connection.query(
                  `SELECT affiliate_id, commission_rate FROM affiliates WHERE affiliate_id = $1 AND status = 'active'`,
                  [affiliateId]
                )
              } else {
                // Get by affiliate_code (from cookie)
                affiliateResult = await connection.query(
                  `SELECT affiliate_id, commission_rate FROM affiliates WHERE affiliate_code = $1 AND status = 'active'`,
                  [affiliateCode]
                )
              }

              // Process commission if affiliate found
              if (affiliateResult.rows.length > 0) {
                const affiliate = affiliateResult.rows[0]
                const finalAffiliateId = affiliate.affiliate_id

                // Get default commission rate from settings if not set for affiliate
                let commissionRate = parseFloat(affiliate.commission_rate)
                if (isNaN(commissionRate) || commissionRate === 0) {
                  const settingsResult = await connection.query(
                    "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'default_commission_rate'"
                  )
                  commissionRate = parseFloat(settingsResult.rows[0]?.setting_value || '10')
                }

                // Determine commission type (first_payment vs recurring)
                const previousCommissions = await connection.query(
                  'SELECT commission_id FROM affiliate_commissions WHERE user_id = $1 AND status = $2',
                  [transaction.user_id, 'paid']
                )

                const type = previousCommissions.rows.length === 0 ? 'first_payment' : 'recurring'

                // Calculate amount (commission on discounted price)
                const baseAmount = parseFloat(String(transaction.base_amount))
                const discountAmount = parseFloat(String(transaction.discount_amount || 0))
                const amountForCommission = baseAmount - discountAmount
                const commissionAmount = (amountForCommission * commissionRate) / 100

                // Insert Commission Record
                if (commissionAmount > 0) {
                  await connection.query(
                    `INSERT INTO affiliate_commissions (
                      affiliate_id, user_id, transaction_id, order_id,
                      type, amount, commission_rate, status, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                    [
                      finalAffiliateId,
                      transaction.user_id,
                      transaction.transaction_id,
                      transaction.transaction_id,
                      type,
                      commissionAmount,
                      commissionRate,
                      'pending'
                    ]
                  )

                  // Update referral record with first_payment_date if it's the first one
                  if (type === 'first_payment') {
                    await connection.query(
                      `UPDATE affiliate_referrals 
                       SET first_payment_date = NOW(), status = 'converted'
                       WHERE user_id = $1 AND affiliate_id = $2`,
                      [transaction.user_id, finalAffiliateId]
                    )
                  }

                  console.log(`[Affiliate] Commission of ${commissionAmount} recorded for affiliate ${finalAffiliateId} (source: ${attributionSource})`)
                }
              }
            }
          } catch (affError) {
            console.error('[Affiliate] Error processing commission:', affError)
            // We don't want to break the entire order confirmation if affiliate processing fails
          }
        }

        await connection.query('COMMIT')

        return {
          success: true,
          message,
          data: {
            newStatus,
            action,
          },
        }
      } catch (error: any) {
        await connection.query('ROLLBACK')
        console.error('Transaction error in confirm payment:', {
          message: error?.message,
          stack: error?.stack,
          code: error?.code,
          detail: error?.detail,
          hint: error?.hint,
          orderId,
          action,
        })
        throw error
      }
    })

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Pembayaran berhasil dikonfirmasi',
    })
  } catch (error: any) {
    console.error('Confirm payment error:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
    })

    // Return more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Terjadi kesalahan: ${error?.message || 'Unknown error'}`
      : 'Terjadi kesalahan saat mengonfirmasi pembayaran'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            code: error?.code,
            message: error?.message,
            detail: error?.detail,
            hint: error?.hint,
          }
        })
      },
      { status: 500 }
    )
  }
}

