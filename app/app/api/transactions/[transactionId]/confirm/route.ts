import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ transactionId: string }> }
) {
    let connection = null

    try {
        const user = await requireActiveStatus(request)
        const { transactionId } = await params
        // Ensure userId is handled correctly (string/number mismatch potential, but usually string)
        const userId = user.userId

        if (!transactionId) {
            return NextResponse.json({ success: false, error: 'Transaction ID required' }, { status: 400 })
        }

        connection = await getDatabaseConnection()

        // Update status to waiting_confirmation if it's pending
        // Also update updated_at
        const result = await connection.query(
            `UPDATE transactions 
       SET payment_status = 'waiting_confirmation', updated_at = NOW()
       WHERE transaction_id = $1 AND user_id = $2 AND payment_status = 'pending'
       RETURNING *`,
            [transactionId, userId]
        )

        if (result.rows.length === 0) {
            // Check if transaction exists but not pending
            const check = await connection.query(
                'SELECT payment_status FROM transactions WHERE transaction_id = $1 AND user_id = $2',
                [transactionId, userId]
            )

            if (check.rows.length > 0) {
                const status = check.rows[0].payment_status
                if (status === 'waiting_confirmation') {
                    connection.release()
                    return NextResponse.json({
                        success: true,
                        message: 'Transaksi sudah dikonfirmasi, menunggu verifikasi admin',
                        data: check.rows[0]
                    })
                } else if (status === 'paid') {
                    connection.release()
                    return NextResponse.json({ success: false, error: 'Transaksi sudah lunas' }, { status: 400 })
                } else if (status === 'cancelled' || status === 'expired') {
                    connection.release()
                    return NextResponse.json({ success: false, error: `Transaksi sudah ${status}` }, { status: 400 })
                }
            }

            connection.release()
            return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan' }, { status: 404 })
        }

        connection.release()

        return NextResponse.json({
            success: true,
            message: 'Status pembayaran berhasil dikonfirmasi. Admin akan segera memverifikasi.',
            data: result.rows[0]
        })

    } catch (error: any) {
        if (connection) connection.release()
        console.error('Confirmation error:', error)
        return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 })
    }
}
