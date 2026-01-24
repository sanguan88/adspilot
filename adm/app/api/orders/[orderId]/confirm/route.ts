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
        let newStatus: string = '';
        let message: string = '';
        const { processSuccessfulPayment } = await import('@/lib/payment-utils');

        // Update user status based on action
        if (action === 'confirm') {
          // Use shared activation logic
          await processSuccessfulPayment(orderId, connection);
          newStatus = 'paid';
          message = 'Pembayaran berhasil dikonfirmasi';
          console.log('Order confirmed and activated via shared logic:', orderId);
        } else if (action === 'reject') {
          // Keep existing rejection logic
          newStatus = 'rejected';
          message = 'Pembayaran ditolak';

          await connection.query(
            `UPDATE transactions 
             SET payment_status = $1,
                 payment_confirmed_at = NOW(),
                 payment_confirmed_by = $2,
                 payment_notes = $3,
                 updated_at = NOW()
             WHERE transaction_id = $4`,
            ['rejected', null, notes || null, orderId]
          );

          await connection.query(
            `UPDATE data_user 
             SET status_user = 'pending_payment',
                 update_at = NOW()
             WHERE user_id = $1 AND status_user != 'pending_payment'`,
            [transaction.user_id]
          );
        } else if (action === 'request_proof') {
          // Keep existing request_proof logic
          newStatus = 'pending';
          message = 'Request bukti pembayaran berhasil dikirim';
          await connection.query(
            `UPDATE transactions 
             SET payment_notes = $1,
                 updated_at = NOW()
             WHERE transaction_id = $2`,
            [notes, orderId]
          );
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

