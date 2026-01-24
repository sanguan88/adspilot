import { NextRequest, NextResponse } from 'next/server'
import { withDatabaseConnection } from '@/lib/db'

const PLAN_NAMES: Record<string, string> = {
  '1-month': 'Paket 1 Bulan',
  '3-month': 'Paket 3 Bulan',
  '6-month': 'Paket 6 Bulan',
}

// GET - Get transaction detail by transaction_id
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params

    const result = await withDatabaseConnection(async (connection) => {
      // Get transaction with user info
      const transactionResult = await connection.query(
        `SELECT 
          t.id,
          t.transaction_id,
          t.user_id,
          t.plan_id,
          t.base_amount,
          t.ppn_percentage,
          t.ppn_amount,
          t.unique_code,
          t.total_amount,
          t.payment_method,
          t.payment_status,
          t.bank_account_id,
          t.payment_proof_url,
          t.payment_confirmed_at,
          t.payment_confirmed_by,
          t.payment_notes,
          t.created_at,
          t.updated_at,
          t.expires_at,
          u.username,
          u.email,
          u.nama_lengkap,
          u.status_user
        FROM transactions t
        INNER JOIN data_user u ON t.user_id = u.user_id
        WHERE t.transaction_id = $1`,
        [orderId]
      )

      if (transactionResult.rows.length === 0) {
        return null
      }

      const row = transactionResult.rows[0]

      // Get bank account info if exists
      let bankAccount = null
      if (row.bank_account_id) {
        const bankResult = await connection.query(
          `SELECT bank_name, account_number, account_name 
           FROM bank_accounts 
           WHERE id = $1`,
          [row.bank_account_id]
        )
        if (bankResult.rows.length > 0) {
          bankAccount = bankResult.rows[0]
        }
      }

      // Build timeline
      const timeline = [
        {
          status: 'created',
          timestamp: row.created_at,
          description: 'Transaksi dibuat',
        },
      ]

      if (row.payment_confirmed_at) {
        timeline.push({
          status: 'paid',
          timestamp: row.payment_confirmed_at,
          description: 'Pembayaran dikonfirmasi',
        })
      }

      return {
        id: row.transaction_id,
        transactionId: row.transaction_id,
        orderNumber: row.transaction_id,
        userId: row.user_id,
        username: row.username,
        email: row.email,
        namaLengkap: row.nama_lengkap,
        planId: row.plan_id,
        planName: PLAN_NAMES[row.plan_id] || row.plan_id,
        baseAmount: parseFloat(row.base_amount),
        ppnPercentage: parseFloat(row.ppn_percentage),
        ppnAmount: parseFloat(row.ppn_amount),
        uniqueCode: row.unique_code,
        totalAmount: parseFloat(row.total_amount),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        bankAccount,
        paymentProofUrl: row.payment_proof_url,
        paymentConfirmedAt: row.payment_confirmed_at,
        paymentConfirmedBy: row.payment_confirmed_by,
        paymentNotes: row.payment_notes,
        userStatus: row.status_user,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        timeline,
      }
    })

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get order detail error:', error)
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil detail transaksi' },
      { status: 500 }
    )
  }
}

// PUT - Update order (e.g., update payment status)
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params
    const body = await request.json()
    const { status, paymentStatus, paidAt, activatedAt } = body

    // TODO: Update order in database
    return NextResponse.json({
      success: true,
      message: 'Order updated (not saved to database yet)',
      data: {
        id: orderId,
        status: status || 'pending',
        paymentStatus: paymentStatus || 'pending',
        paidAt: paidAt || null,
        activatedAt: activatedAt || null,
        ...body,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

