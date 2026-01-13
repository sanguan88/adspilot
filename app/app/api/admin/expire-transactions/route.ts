import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

/**
 * POST /api/admin/expire-transactions
 * Manually trigger auto-expire transactions (Admin only)
 * 
 * This endpoint can be called to manually expire transactions that have passed their expiry date
 */
export async function POST(request: NextRequest) {
  let connection = null

  try {
    // TODO: Add admin authentication check here
    // For now, allow anyone to call this (should be restricted in production)

    connection = await getDatabaseConnection()

    try {
      // Find transactions that should be expired
      const expiredResult = await connection.query(
        `SELECT 
          id, transaction_id, user_id, plan_id, 
          payment_status, expires_at, created_at
        FROM transactions
        WHERE payment_status IN ('pending', 'waiting_verification')
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
        ORDER BY expires_at ASC`
      )

      const expiredTransactions = expiredResult.rows

      if (expiredTransactions.length === 0) {
        connection.release()
        return NextResponse.json({
          success: true,
          message: 'Tidak ada transaksi yang perlu di-expire',
          data: {
            expiredCount: 0,
            transactions: [],
          },
        })
      }

      let expiredCount = 0
      const errors: Array<{ transactionId: string; error: string }> = []

      for (const transaction of expiredTransactions) {
        try {
          // Update status to expired
          await connection.query(
            `UPDATE transactions 
             SET payment_status = 'expired',
                 updated_at = NOW()
             WHERE id = $1 AND payment_status IN ('pending', 'waiting_verification')`,
            [transaction.id]
          )

          expiredCount++
        } catch (error: any) {
          errors.push({
            transactionId: transaction.transaction_id,
            error: error.message || 'Unknown error',
          })
        }
      }

      connection.release()

      return NextResponse.json({
        success: true,
        message: `Berhasil expire ${expiredCount} transaksi`,
        data: {
          expiredCount,
          errors: errors.length > 0 ? errors : undefined,
          transactions: expiredTransactions.map(t => ({
            transactionId: t.transaction_id,
            userId: t.user_id,
            planId: t.plan_id,
            previousStatus: t.payment_status,
            expiresAt: t.expires_at,
            createdAt: t.created_at,
          })),
        },
      })
    } catch (error: any) {
      connection.release()
      throw error
    }
  } catch (error: any) {
    console.error('Expire transactions error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan saat expire transactions',
      },
      { status: 500 }
    )
  }
}

