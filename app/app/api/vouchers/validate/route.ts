import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { calculateDiscount } from '@/lib/payment-calculator'

/**
 * POST /api/vouchers/validate
 * Validate voucher code dan return discount calculation
 */
export async function POST(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    const body = await request.json()
    const { voucherCode, planId, baseAmount } = body

    // Validate input
    if (!voucherCode || typeof voucherCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Voucher code diperlukan' },
        { status: 400 }
      )
    }

    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Plan ID diperlukan' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Get base amount (use provided or fetch from database)
    let finalBaseAmount = baseAmount
    if (!finalBaseAmount || finalBaseAmount <= 0) {
      // Fetch plan price from database
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
    
    if (!finalBaseAmount || finalBaseAmount <= 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Base amount tidak valid' },
        { status: 400 }
      )
    }

    // Find voucher (case-insensitive)
    const voucherResult = await connection.query(
      `SELECT 
        id, code, name, description,
        discount_type, discount_value,
        start_date, expiry_date,
        is_active,
        max_usage_per_user, max_total_usage,
        applicable_plans, minimum_purchase, maximum_discount
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

    // Check applicable plans
    if (voucher.applicable_plans && voucher.applicable_plans.length > 0) {
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

    // Calculate discount (will be used for display, actual calculation will be done in transaction creation)
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

