import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'

/**
 * GET /api/vouchers/[id]/usage
 * Get voucher usage history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection: PoolClient | null = null

  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const voucherId = parseInt(id)

    if (isNaN(voucherId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid voucher ID' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    connection = await getDatabaseConnection()

    // Check if voucher exists
    const voucherCheck = await connection.query(
      'SELECT id, code, name FROM vouchers WHERE id = $1',
      [voucherId]
    )

    if (voucherCheck.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Voucher tidak ditemukan' },
        { status: 404 }
      )
    }

    // Get total count
    const countResult = await connection.query(
      'SELECT COUNT(*) as total FROM voucher_usage WHERE voucher_id = $1',
      [voucherId]
    )
    const total = parseInt(countResult.rows[0].total)

    // Get usage records with user info
    const usageResult = await connection.query(
      `SELECT 
        vu.*,
        du.username,
        du.email,
        du.nama_lengkap,
        t.plan_id,
        t.payment_status,
        t.total_amount as transaction_total
      FROM voucher_usage vu
      LEFT JOIN data_user du ON vu.user_id = du.user_id
      LEFT JOIN transactions t ON vu.transaction_id = t.transaction_id
      WHERE vu.voucher_id = $1
      ORDER BY vu.used_at DESC
      LIMIT $2 OFFSET $3`,
      [voucherId, limit, skip]
    )

    const usage = usageResult.rows.map((row: any) => ({
      id: row.id,
      voucherId: row.voucher_id,
      voucherCode: row.voucher_code,
      transactionId: row.transaction_id,
      userId: row.user_id,
      user: {
        username: row.username,
        email: row.email,
        namaLengkap: row.nama_lengkap,
      },
      discountType: row.discount_type,
      discountValue: parseFloat(row.discount_value),
      discountAmount: parseFloat(row.discount_amount),
      planId: row.plan_id,
      baseAmount: parseFloat(row.base_amount),
      totalAmountBeforeDiscount: parseFloat(row.total_amount_before_discount),
      totalAmountAfterDiscount: parseFloat(row.total_amount_after_discount),
      transactionStatus: row.payment_status,
      usedAt: row.used_at,
    }))

    connection.release()
    return NextResponse.json({
      success: true,
      data: {
        voucher: {
          id: voucherCheck.rows[0].id,
          code: voucherCheck.rows[0].code,
          name: voucherCheck.rows[0].name,
        },
        usage,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Error fetching voucher usage:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil data penggunaan voucher',
      },
      { status: 500 }
    )
  }
}

