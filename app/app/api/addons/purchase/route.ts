import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { calculateDiscount } from '@/lib/payment-calculator'

/**
 * Purchase addon (create transaction)
 * POST /api/addons/purchase
 * 
 * Body: {
 *   quantity: number,
 *   addonType: 'extra_accounts'
 * }
 */
export async function POST(request: NextRequest) {
    let connection = null

    try {
        // 1. Auth check
        const user = await requireActiveStatus(request)
        const userId = user.userId || (user as any).user_id

        // 2. Parse request body
        const body = await request.json()
        const { quantity, addonType = 'extra_accounts', durationMode = 'following_subscription', voucherCode } = body

        if (!quantity || quantity < 1 || quantity > 20) {
            return NextResponse.json(
                { success: false, error: 'Quantity harus antara 1-20' },
                { status: 400 }
            )
        }

        connection = await getDatabaseConnection()

        // 3. Get active subscription
        const subscriptionResult = await connection.query(
            `SELECT id, plan_id, end_date, start_date
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
            [userId]
        )

        // User must have subscription to buy addon (even if fixed duration, account status depends on sub)
        if (subscriptionResult.rows.length === 0) {
            connection.release()
            return NextResponse.json(
                {
                    success: false,
                    error: 'Anda belum memiliki subscription aktif. Silakan subscribe terlebih dahulu.'
                },
                { status: 400 }
            )
        }

        const subscription = subscriptionResult.rows[0]
        const subscriptionEndDate = new Date(subscription.end_date)
        const today = new Date()

        let remainingDays = 0
        let effectiveEndDate = new Date()
        let pricePerAccount = 0
        const PRICE_PER_ACCOUNT_PER_MONTH = 99000

        // 4. Calculate effective end date and price based on mode
        if (durationMode === 'fixed_30_days') {
            remainingDays = 30
            effectiveEndDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
            pricePerAccount = PRICE_PER_ACCOUNT_PER_MONTH
        } else {
            // Pro-rata logic
            const timeDiff = subscriptionEndDate.getTime() - today.getTime()
            remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24))

            // Check minimum days
            if (remainingDays < 7) {
                connection.release()
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Subscription Anda akan berakhir dalam kurang dari 7 hari. Durasi "Ikuti Sisa Subscription" tidak tersedia.',
                        remainingDays
                    },
                    { status: 400 }
                )
            }

            const prorataMultiplier = remainingDays / 30
            pricePerAccount = Math.round(PRICE_PER_ACCOUNT_PER_MONTH * prorataMultiplier)
            effectiveEndDate = subscriptionEndDate // Should end same time as subscription
        }

        const subtotal = pricePerAccount * quantity

        // Voucher Logic
        let discountAmount = 0
        let voucherData = null

        if (voucherCode) {
            const voucherResult = await connection.query(
                `SELECT 
                    id, code, discount_type, discount_value, 
                    minimum_purchase, maximum_discount,
                    expiry_date, start_date, is_active, applicable_type
                 FROM vouchers 
                 WHERE UPPER(code) = UPPER($1)`,
                [voucherCode]
            )

            if (voucherResult.rows.length === 0) {
                connection.release()
                return NextResponse.json({ success: false, error: 'Kode voucher tidak valid' }, { status: 400 })
            }

            const voucher = voucherResult.rows[0]
            const now = new Date()

            if (!voucher.is_active) {
                connection.release()
                return NextResponse.json({ success: false, error: 'Voucher tidak aktif' }, { status: 400 })
            }

            if (voucher.expiry_date && new Date(voucher.expiry_date) < now) {
                connection.release()
                return NextResponse.json({ success: false, error: 'Voucher sudah kadaluarsa' }, { status: 400 })
            }

            if (voucher.start_date && new Date(voucher.start_date) > now) {
                connection.release()
                return NextResponse.json({ success: false, error: 'Voucher belum berlaku' }, { status: 400 })
            }

            if (voucher.minimum_purchase && subtotal < parseFloat(voucher.minimum_purchase)) {
                connection.release()
                return NextResponse.json({ success: false, error: `Minimum pembelian Rp ${parseFloat(voucher.minimum_purchase)}` }, { status: 400 })
            }

            // Check Applicable Type
            const applicableType = voucher.applicable_type || 'all'
            if (applicableType !== 'all' && applicableType !== 'addon') {
                connection.release()
                return NextResponse.json({ success: false, error: 'Voucher tidak berlaku untuk addon' }, { status: 400 })
            }

            discountAmount = calculateDiscount(
                subtotal,
                voucher.discount_type,
                parseFloat(voucher.discount_value),
                voucher.maximum_discount ? parseFloat(voucher.maximum_discount) : null
            )

            voucherData = voucher
        }

        const baseAmountAfterDiscount = Math.max(0, subtotal - discountAmount)
        const ppnAmount = Math.round(baseAmountAfterDiscount * 0.11)

        // Generate Unique Code (Random 3 digits: 100-999)
        const uniqueCode = Math.floor(Math.random() * (999 - 100 + 1) + 100)

        const totalPrice = baseAmountAfterDiscount + ppnAmount + uniqueCode

        // 7. Generate transaction ID
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
        const transactionId = `ADDON-${timestamp}-${randomStr}`

        // Plan ID schema: addon-{type}-{qty}-{mode}
        // Simplified to addon for analytics
        const planId = `addon-${addonType}-${quantity}-${durationMode === 'fixed_30_days' ? 'fixed' : 'prorata'}`

        // 8. Create transaction record
        const transactionResult = await connection.query(
            `INSERT INTO transactions (
        transaction_id, user_id, plan_id,
        base_amount, ppn_amount, unique_code, total_amount,
        payment_method, payment_status,
        voucher_code, discount_amount,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
            [
                transactionId,
                userId,
                planId,
                subtotal,
                ppnAmount,
                uniqueCode,
                totalPrice,
                'manual', // 'bank_transfer' is not standard in schema, using 'manual'
                'pending',
                voucherCode || null,
                discountAmount
            ]
        )

        // 9. Record voucher usage if applied
        if (voucherData) {
            const totalBeforeDiscount = subtotal + Math.round(subtotal * 0.11) + uniqueCode

            await connection.query(
                `INSERT INTO voucher_usage (
                    voucher_id, voucher_code, transaction_id, user_id,
                    discount_type, discount_value, discount_amount,
                    plan_id, base_amount, 
                    total_amount_before_discount, total_amount_after_discount,
                    used_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
                [
                    voucherData.id,
                    voucherData.code,
                    transactionId,
                    userId,
                    voucherData.discount_type,
                    parseFloat(voucherData.discount_value),
                    discountAmount,
                    planId,
                    subtotal,
                    totalBeforeDiscount,
                    totalPrice
                ]
            )
        }

        connection.release()

        // 10. Return payment instructions and redirect details
        return NextResponse.json({
            success: true,
            message: 'Transaksi addon berhasil dibuat. Silakan lakukan pembayaran.',
            data: {
                transactionId,
                // addonId removed as it is created after payment
                quantity,
                addonType,
                durationMode,
                pricing: {
                    pricePerAccount,
                    subtotal,
                    discountAmount,
                    ppn: ppnAmount,
                    uniqueCode,
                    total: totalPrice,
                    voucherCode: voucherCode || null,
                },
                subscription: {
                    endDate: effectiveEndDate.toISOString().split('T')[0],
                    remainingDays,
                },
                paymentInstructions: {
                    method: 'bank_transfer',
                    bankName: 'BCA',
                    accountNumber: '1234567890',
                    accountName: 'AdsPilot',
                    amount: totalPrice,
                    note: `Transfer dengan berita: ${transactionId}`,
                },
                status: 'pending',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            },
        })
    } catch (error: any) {
        if (connection) {
            connection.release()
        }
        console.error('Purchase addon error:', error)
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat membuat transaksi addon' },
            { status: 500 }
        )
    }
}
