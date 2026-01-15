import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';

/**
 * GET - Get transaction by transaction ID (PUBLIC endpoint - no auth required)
 * This is used for the payment-confirmation page where user hasn't logged in yet
 * Only returns limited data needed for display
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { transactionId: string } }
) {
    try {
        const { transactionId } = params;

        if (!transactionId || transactionId === 'undefined') {
            return NextResponse.json(
                { success: false, error: 'Transaction ID diperlukan' },
                { status: 400 }
            );
        }

        const connection = await getDatabaseConnection();

        try {
            // Get transaction with plan info
            const result = await connection.query(
                `SELECT 
          t.id, t.transaction_id, t.plan_id,
          t.base_amount, t.ppn_percentage, t.ppn_amount, t.unique_code, t.total_amount,
          t.voucher_code, t.discount_amount,
          (t.base_amount - COALESCE(t.discount_amount, 0)) as base_amount_after_discount,
          t.payment_status,
          t.created_at,
          p.name as plan_name,
          p.duration_months
        FROM transactions t
        LEFT JOIN subscription_plans p ON t.plan_id = p.plan_id
        WHERE t.transaction_id = $1
        LIMIT 1`,
                [transactionId]
            );

            connection.release();

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'Transaksi tidak ditemukan' },
                    { status: 404 }
                );
            }

            const transaction = result.rows[0];

            // Return limited data for public display (no sensitive user info)
            return NextResponse.json({
                success: true,
                data: {
                    transactionId: transaction.transaction_id,
                    planId: transaction.plan_id,
                    planName: transaction.plan_name,
                    durationMonths: transaction.duration_months || 1, // Fallback to 1 if null
                    baseAmount: parseFloat(transaction.base_amount),
                    ppnPercentage: parseFloat(transaction.ppn_percentage),
                    ppnAmount: parseFloat(transaction.ppn_amount),
                    uniqueCode: transaction.unique_code,
                    totalAmount: parseFloat(transaction.total_amount),
                    voucherCode: transaction.voucher_code || null,
                    discountAmount: transaction.discount_amount ? parseFloat(transaction.discount_amount) : null,
                    baseAmountAfterDiscount: transaction.base_amount_after_discount ? parseFloat(transaction.base_amount_after_discount) : null,
                    paymentStatus: transaction.payment_status,
                    createdAt: transaction.created_at,
                },
            });
        } catch (error: any) {
            connection.release();
            throw error;
        }
    } catch (error: any) {
        console.error('Get public transaction error:', error);
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil data transaksi' },
            { status: 500 }
        );
    }
}
