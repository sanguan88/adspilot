import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { calculateDiscount } from '@/lib/payment-calculator'

/**
 * Calculate addon price with pro-rata
 * GET /api/addons/calculate-price?quantity=1
 */
export async function GET(request: NextRequest) {
    let connection = null

    try {
        // 1. Auth check
        const user = await requireActiveStatus(request)
        const userId = user.userId || (user as any).user_id

        // 2. Get query params
        const searchParams = request.nextUrl.searchParams
        const quantity = parseInt(searchParams.get('quantity') || '1')
        const durationMode = searchParams.get('duration_mode') || 'following_subscription'
        const voucherCode = searchParams.get('voucher_code')

        if (quantity < 1 || quantity > 20) {
            return NextResponse.json(
                { success: false, error: 'Quantity harus antara 1-20' },
                { status: 400 }
            )
        }

        connection = await getDatabaseConnection()

        // 3. Get active subscription
        const subscriptionResult = await connection.query(
            `SELECT plan_id, end_date, start_date
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
            [userId]
        )

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
        let remainingDays = 0
        let effectiveEndDate = new Date()
        const subscriptionEndDate = new Date(subscription.end_date)
        const today = new Date()

        // Calculate based on mode
        const PRICE_PER_ACCOUNT_PER_MONTH = 99000
        let pricePerAccount = 0

        if (durationMode === 'fixed_30_days') {
            remainingDays = 30
            effectiveEndDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
            pricePerAccount = PRICE_PER_ACCOUNT_PER_MONTH
        } else {
            const timeDiff = subscriptionEndDate.getTime() - today.getTime()
            remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24))

            if (remainingDays < 7) {
                connection.release()
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Subscription Anda akan berakhir dalam kurang dari 7 hari. Perpanjang subscription atau pilih opsi durasi 30 hari.',
                        remainingDays
                    },
                    { status: 400 }
                )
            }

            const prorataMultiplier = remainingDays / 30
            pricePerAccount = Math.round(PRICE_PER_ACCOUNT_PER_MONTH * prorataMultiplier)
        }

        const totalPrice = pricePerAccount * quantity

        // Voucher Logic
        let discountAmount = 0
        let voucherApplied = null
        let voucherError = null

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

            if (voucherResult.rows.length > 0) {
                const voucher = voucherResult.rows[0]
                const now = new Date()

                if (!voucher.is_active) voucherError = 'Voucher tidak aktif'
                else if (voucher.expiry_date && new Date(voucher.expiry_date) < now) voucherError = 'Voucher kadaluarsa'
                else if (voucher.start_date && new Date(voucher.start_date) > now) voucherError = 'Voucher belum berlaku'
                else if (voucher.minimum_purchase && totalPrice < parseFloat(voucher.minimum_purchase)) voucherError = `Min. pembelian Rp ${parseFloat(voucher.minimum_purchase)}`
                else {
                    // Check Applicable Type
                    const applicableType = voucher.applicable_type || 'all'
                    if (applicableType !== 'all' && applicableType !== 'addon') {
                        voucherError = 'Voucher tidak berlaku untuk addon'
                    } else {
                        // Apply Discount
                        discountAmount = calculateDiscount(
                            totalPrice,
                            voucher.discount_type,
                            parseFloat(voucher.discount_value),
                            voucher.maximum_discount ? parseFloat(voucher.maximum_discount) : null
                        )
                        voucherApplied = {
                            code: voucher.code,
                            discount: discountAmount
                        }
                    }
                }
            } else {
                voucherError = 'Kode voucher tidak ditemukan'
            }
        }

        const baseAmountAfterDiscount = Math.max(0, totalPrice - discountAmount)
        const ppnAmount = Math.round(baseAmountAfterDiscount * 0.11)
        const grandTotal = baseAmountAfterDiscount + ppnAmount

        connection.release()

        return NextResponse.json({
            success: true,
            data: {
                quantity,
                durationMode,
                pricePerMonth: PRICE_PER_ACCOUNT_PER_MONTH,
                remainingDays,
                pricePerAccount,
                subtotal: totalPrice,

                voucherCode: voucherApplied?.code || null,
                discountAmount,
                voucherError,

                baseAmountAfterDiscount,
                ppn: ppnAmount,
                total: grandTotal,
                subscriptionEndDate: subscriptionEndDate.toISOString().split('T')[0],
                addonEndDate: effectiveEndDate.toISOString().split('T')[0],
                planId: subscription.plan_id,
            },
        })
    } catch (error: any) {
        if (connection) {
            connection.release()
        }
        console.error('Calculate addon price error:', error)
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat menghitung harga addon' },
            { status: 500 }
        )
    }
}
