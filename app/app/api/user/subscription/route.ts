import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Map plan_id to plan name
const planNameMap: { [key: string]: string } = {
  '1-month': 'Paket 1 Bulan',
  '3-month': 'Paket 3 Bulan',
  '6-month': 'Paket 6 Bulan',
}

// GET - detail & riwayat subscription user
export async function GET(request: NextRequest) {
  let connection = null
  try {
    const user = requireAuth(request)
    
    connection = await getDatabaseConnection()
    
    // Get current active subscription
    const currentSubResult = await connection.query(
      `SELECT 
        s.id, s.plan_id, s.transaction_id,
        s.status, s.start_date, s.end_date, s.billing_cycle,
        s.base_amount, s.ppn_amount, s.total_amount,
        s.auto_renew, s.created_at, s.updated_at,
        s.cancelled_at, s.cancelled_by, s.cancellation_reason,
        t.payment_confirmed_at, t.payment_proof_url
      FROM subscriptions s
      LEFT JOIN transactions t ON s.transaction_id = t.transaction_id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1`,
      [user.userId]
    )
    
    // Get subscription history (all subscriptions)
    const historyResult = await connection.query(
      `SELECT 
        s.id, s.plan_id, s.transaction_id,
        s.status, s.start_date, s.end_date, s.billing_cycle,
        s.base_amount, s.ppn_amount, s.total_amount,
        s.auto_renew, s.created_at, s.updated_at,
        s.cancelled_at, s.cancelled_by, s.cancellation_reason,
        t.payment_confirmed_at, t.payment_proof_url
      FROM subscriptions s
      LEFT JOIN transactions t ON s.transaction_id = t.transaction_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC`,
      [user.userId]
    )
    
    // Get transactions for invoice/receipt
    const transactionsResult = await connection.query(
      `SELECT 
        transaction_id, plan_id, payment_status,
        base_amount, ppn_amount, total_amount, unique_code,
        payment_confirmed_at, payment_proof_url, created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [user.userId]
    )
    
    connection.release()
    
    // Format current subscription
    let currentSubscription = null
    if (currentSubResult.rows.length > 0) {
      const row = currentSubResult.rows[0]
      currentSubscription = {
        id: row.id,
        planId: row.plan_id,
        planName: planNameMap[row.plan_id] || row.plan_id,
        transactionId: row.transaction_id,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        billingCycle: row.billing_cycle,
        baseAmount: parseFloat(row.base_amount || 0),
        ppnAmount: parseFloat(row.ppn_amount || 0),
        totalAmount: parseFloat(row.total_amount || 0),
        autoRenew: row.auto_renew || false,
        cancelledAt: row.cancelled_at,
        cancelledBy: row.cancelled_by,
        cancellationReason: row.cancellation_reason,
        paymentConfirmedAt: row.payment_confirmed_at,
        paymentProofUrl: row.payment_proof_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    }
    
    // Format history
    const history = historyResult.rows.map((row: any) => ({
      id: row.id,
      planId: row.plan_id,
      planName: planNameMap[row.plan_id] || row.plan_id,
      transactionId: row.transaction_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      billingCycle: row.billing_cycle,
      baseAmount: parseFloat(row.base_amount || 0),
      ppnAmount: parseFloat(row.ppn_amount || 0),
      totalAmount: parseFloat(row.total_amount || 0),
      autoRenew: row.auto_renew || false,
      cancelledAt: row.cancelled_at,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      paymentConfirmedAt: row.payment_confirmed_at,
      paymentProofUrl: row.payment_proof_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
    
    // Format transactions/invoices
    const invoices = transactionsResult.rows.map((row: any) => ({
      transactionId: row.transaction_id,
      planId: row.plan_id,
      planName: planNameMap[row.plan_id] || row.plan_id,
      paymentStatus: row.payment_status,
      baseAmount: parseFloat(row.base_amount || 0),
      ppnAmount: parseFloat(row.ppn_amount || 0),
      totalAmount: parseFloat(row.total_amount || 0),
      uniqueCode: row.unique_code,
      paymentConfirmedAt: row.payment_confirmed_at,
      paymentProofUrl: row.payment_proof_url,
      createdAt: row.created_at,
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        current: currentSubscription,
        history,
        invoices,
      }
    })
  } catch (error: any) {
    if (connection) {
      try {
        connection.release()
      } catch (releaseError) {
        // Ignore release error
      }
    }
    
    console.error('Get user subscription error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch subscription data',
      },
      { status: 500 }
    )
  }
}

// PUT - update auto_renew untuk subscription aktif user
export async function PUT(request: NextRequest) {
  let connection = null

  try {
    const user = requireAuth(request)
    const body = await request.json()
    const { autoRenew } = body as { autoRenew?: boolean }

    if (typeof autoRenew !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'autoRenew harus berupa boolean' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Ambil subscription aktif user
    const currentResult = await connection.query(
      `SELECT id, user_id, status, auto_renew 
       FROM subscriptions 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.userId]
    )

    if (currentResult.rows.length === 0) {
      connection.release()
      return NextResponse.json(
        { success: false, error: 'Tidak ada subscription aktif' },
        { status: 404 }
      )
    }

    const currentSubscription = currentResult.rows[0]

    // Jika nilai sama, tidak perlu update
    if (currentSubscription.auto_renew === autoRenew) {
      connection.release()
      return NextResponse.json({
        success: true,
        message: 'Tidak ada perubahan pada auto-renewal',
      })
    }

    // Update auto_renew
    await connection.query(
      `UPDATE subscriptions
       SET auto_renew = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [autoRenew, currentSubscription.id]
    )

    connection.release()

    return NextResponse.json({
      success: true,
      message: autoRenew
        ? 'Auto-renewal diaktifkan. Subscription akan diperpanjang otomatis saat periode berakhir.'
        : 'Auto-renewal dimatikan. Subscription tidak akan diperpanjang otomatis setelah periode ini berakhir.',
    })
  } catch (error: any) {
    if (connection) {
      try {
        connection.release()
      } catch {
        // ignore
      }
    }

    console.error('Update user subscription auto-renew error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Gagal mengupdate auto-renewal subscription',
      },
      { status: 500 }
    )
  }
}

