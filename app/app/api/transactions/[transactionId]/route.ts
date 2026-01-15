import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { checkResourceAccess } from '@/lib/role-checker';

/**
 * GET - Get transaction by transaction ID or user ID
 * NOTE: Uses requireAuth (not requireActiveStatus) to allow pending_payment users
 * to view their transactions on /dashboard/payment-status page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    // Use requireAuth instead of requireActiveStatus
    // This allows users with pending_payment status to view their transactions
    const user = requireAuth(request);

    // Skip resource access check for pending_payment users viewing their own transactions
    // checkResourceAccess would fail for pending users

    const { transactionId } = params;
    const userId = user.userId as string;
    const connection = await getDatabaseConnection();

    try {
      let result;

      if (transactionId && transactionId !== 'undefined') {
        // Get by transaction ID - AND user_id logic for security
        result = await connection.query(
          `SELECT 
            id, transaction_id, user_id, plan_id,
            base_amount, ppn_percentage, ppn_amount, unique_code, total_amount,
            voucher_code, discount_amount,
            (base_amount - COALESCE(discount_amount, 0)) as base_amount_after_discount,
            payment_method, payment_status, payment_proof_url,
            created_at, updated_at, expires_at
          FROM transactions 
          WHERE transaction_id = $1 AND user_id = $2
          ORDER BY created_at DESC
          LIMIT 1`,
          [transactionId, userId]
        );
      } else {
        // Get latest transaction by CURRENT user ID
        // Note: We ignore any 'userId' param from URL and use authenticated user.id
        result = await connection.query(
          `SELECT 
            id, transaction_id, user_id, plan_id,
            base_amount, ppn_percentage, ppn_amount, unique_code, total_amount,
            voucher_code, discount_amount,
            (base_amount - COALESCE(discount_amount, 0)) as base_amount_after_discount,
            payment_method, payment_status, payment_proof_url,
            created_at, updated_at, expires_at
          FROM transactions 
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1`,
          [userId]
        );
      }

      connection.release();

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Transaksi tidak ditemukan' },
          { status: 404 }
        );
      }

      const transaction = result.rows[0];

      return NextResponse.json({
        success: true,
        data: {
          id: transaction.id,
          transactionId: transaction.transaction_id,
          userId: transaction.user_id,
          planId: transaction.plan_id,
          baseAmount: parseFloat(transaction.base_amount),
          ppnPercentage: parseFloat(transaction.ppn_percentage),
          ppnAmount: parseFloat(transaction.ppn_amount),
          uniqueCode: transaction.unique_code,
          totalAmount: parseFloat(transaction.total_amount),
          voucherCode: transaction.voucher_code || null,
          discountAmount: transaction.discount_amount ? parseFloat(transaction.discount_amount) : null,
          baseAmountAfterDiscount: transaction.base_amount_after_discount ? parseFloat(transaction.base_amount_after_discount) : null,
          paymentMethod: transaction.payment_method,
          paymentStatus: transaction.payment_status,
          paymentProofUrl: transaction.payment_proof_url || null,
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at,
          expiresAt: transaction.expires_at,
        },
      });
    } catch (error: any) {
      connection.release();
      throw error;
    }
  } catch (error: any) {
    // Handle specific auth/payment errors without 500 log noise
    if (error.message && (error.message.includes('Access denied') || error.message.includes('Payment required'))) {
      return NextResponse.json({ success: false, error: error.message }, { status: 402 });
    }

    console.error('Get transaction error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengambil data transaksi' },
      { status: 500 }
    );
  }
}

