import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { calculateDiscount } from '@/lib/payment-calculator'

/**
 * POST /api/vouchers/validate
 * Validate voucher code dan return discount calculation
 */
// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  })
}

export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    const body = await request.json()
    const { voucherCode, planId, baseAmount, context = 'subscription' } = body

    // Validate input
    if (!voucherCode || typeof voucherCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Voucher code diperlukan' },
        { status: 400 }
      )
    }

    // For subscription, planId is required
    if (context === 'subscription' && (!planId || typeof planId !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'Plan ID diperlukan untuk subscription' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Get base amount
    let finalBaseAmount = baseAmount

    if (context === 'subscription') {
      // For subscription, fetch from DB if not provided
      if (!finalBaseAmount || finalBaseAmount <= 0) {
        const planResult = await connection.query(
          'SELECT price FROM subscription_plans WHERE plan_id = $1 AND is_active = true',
          [planId]
        )

        if (planResult.rows.length === 0) {
          connection.release()
          return NextResponse.json(
            { success: false, error: 'Plan tidak ditemukan atau tidak aktif' },
            { status: 400 }
          )
        }

        finalBaseAmount = parseFloat(planResult.rows[0].price)
      }
    } else if (context === 'addon') {
      // For addon, baseAmount IS required from client (calculated dynamically)
      if (!finalBaseAmount || finalBaseAmount <= 0) {
        connection.release()
        return NextResponse.json(
          { success: false, error: 'Base amount diperlukan untuk addon' },
          { status: 400 }
        )
      }
    }

    if (!finalBaseAmount || finalBaseAmount <= 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Base amount tidak valid' },
        { status: 400 }
      )
    }

    // First, check if this is an affiliate voucher
    let affiliateId: string | null = null
    let isAffiliateVoucher = false

    const affiliateVoucherResult = await connection.query(
      `SELECT 
        av.id, av.voucher_code as code, av.discount_type, av.discount_value,
        av.is_active, av.affiliate_id,
        a.name as affiliate_name
      FROM affiliate_vouchers av
      JOIN affiliates a ON av.affiliate_id = a.affiliate_id
      WHERE UPPER(av.voucher_code) = UPPER($1)`,
      [voucherCode.trim()]
    )

    if (affiliateVoucherResult.rows.length > 0) {
      // Found affiliate voucher
      const affVoucher = affiliateVoucherResult.rows[0]

      if (!affVoucher.is_active) {
        connection.release()
        return NextResponse.json(
          { success: false, error: 'Voucher affiliate tidak aktif' },
          { status: 400 }
        )
      }

      isAffiliateVoucher = true
      affiliateId = affVoucher.affiliate_id

      // Calculate discount for affiliate voucher (fixed 50%)
      const discountAmount = finalBaseAmount * (parseFloat(affVoucher.discount_value) / 100)

      // Update usage count
      await connection.query(
        `UPDATE affiliate_vouchers SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1`,
        [affVoucher.id]
      )

      connection.release()
      return NextResponse.json({
        success: true,
        data: {
          voucher: {
            id: affVoucher.id,
            code: affVoucher.code,
            name: `Voucher Affiliate - ${affVoucher.affiliate_name}`,
            description: `Diskon ${affVoucher.discount_value}% dari affiliate`,
            discountType: affVoucher.discount_type,
            discountValue: parseFloat(affVoucher.discount_value),
            maximumDiscount: null,
            applicableType: 'all'
          },
          discountAmount,
          baseAmount: finalBaseAmount,
          isAffiliateVoucher: true,
          affiliateId: affiliateId
        },
      })
    }

    // If not affiliate voucher, check regular vouchers table
    const voucherResult = await connection.query(
      `SELECT 
        id, code, name, description,
        discount_type, discount_value,
        start_date, expiry_date,
        is_active,
        max_usage_per_user, max_total_usage,
        applicable_plans, minimum_purchase, maximum_discount,
        applicable_type
      FROM vouchers
      WHERE UPPER(code) = UPPER($1)`,
      [voucherCode.trim()]
    )

    if (voucherResult.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher code tidak ditemukan' },
        { status: 404 }
      )
    }

    const voucher = voucherResult.rows[0]
    const now = new Date()

    // Check if voucher is active
    if (!voucher.is_active) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher tidak aktif' },
        { status: 400 }
      )
    }

    // Check applicable type (Addon vs Subscription)
    const voucherContext = voucher.applicable_type || 'all' // Default to all if null (migration handled this but just in case)
    if (voucherContext !== 'all' && voucherContext !== context) {
      connection.release()
      return NextResponse.json(
        { success: false, error: `Voucher ini hanya berlaku untuk ${voucherContext === 'addon' ? 'Addon' : 'Subscription'}` },
        { status: 400 }
      )
    }

    // Check expiry date
    if (voucher.expiry_date && new Date(voucher.expiry_date) < now) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher sudah kadaluarsa' },
        { status: 400 }
      )
    }

    // Check start date
    if (voucher.start_date && new Date(voucher.start_date) > now) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher belum berlaku' },
        { status: 400 }
      )
    }

    // Check applicable plans (Only for subscription context)
    if (context === 'subscription' && voucher.applicable_plans && voucher.applicable_plans.length > 0) {
      if (!voucher.applicable_plans.includes(planId)) {
        connection.release()
        return NextResponse.json(
          { success: false, error: `Voucher tidak berlaku untuk plan ${planId}` },
          { status: 400 }
        )
      }
    }

    // Check minimum purchase
    if (voucher.minimum_purchase && finalBaseAmount < parseFloat(voucher.minimum_purchase)) {
      connection.release()
      return NextResponse.json(
        {
          success: false,
          error: `Minimum purchase untuk voucher ini adalah Rp ${parseFloat(voucher.minimum_purchase).toLocaleString('id-ID')}`
        },
        { status: 400 }
      )
    }

    // Calculate discount
    const discountAmount = calculateDiscount(
      finalBaseAmount,
      voucher.discount_type,
      parseFloat(voucher.discount_value),
      voucher.maximum_discount ? parseFloat(voucher.maximum_discount) : null
    )

    // Return voucher info and discount calculation
    connection.release()
    return NextResponse.json({
      success: true,
      data: {
        voucher: {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          description: voucher.description,
          discountType: voucher.discount_type,
          discountValue: parseFloat(voucher.discount_value),
          maximumDiscount: voucher.maximum_discount ? parseFloat(voucher.maximum_discount) : null,
          applicableType: voucherContext
        },
        discountAmount,
        baseAmount: finalBaseAmount,
      },
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Error validating voucher:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal memvalidasi voucher',
      },
      { status: 500 }
    )
  }
}

