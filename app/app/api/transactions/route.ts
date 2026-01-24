import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

/**
 * GET - List transactions for current user
 */
export async function GET(request: NextRequest) {
    try {
        // Authenticate only (don't require active status, so pending users can pay)
        const user = requireAuth(request);
        const userId = user.userId;

        const connection = await getDatabaseConnection();

        try {
            const { searchParams } = new URL(request.url);
            const limit = parseInt(searchParams.get('limit') || '10');
            const offset = parseInt(searchParams.get('offset') || '0');
            const status = searchParams.get('status');

            let query = `
        SELECT 
          id, transaction_id, user_id, plan_id,
          base_amount, ppn_amount, unique_code, total_amount,
          voucher_code, discount_amount,
          payment_method, payment_status, payment_proof_url,
          created_at
        FROM transactions 
        WHERE user_id = $1
      `;

            const queryParams: any[] = [userId];
            let paramIndex = 2; // Start from 2 because $1 is user_id

            if (status) {
                query += ` AND payment_status = $${paramIndex}`;
                queryParams.push(status);
                paramIndex++;
            }

            query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(limit, offset);

            const result = await connection.query(query, queryParams);

            // Get total count for pagination
            let countQuery = `SELECT COUNT(*) FROM transactions WHERE user_id = $1`;
            const countParams = [userId];

            if (status) {
                countQuery += ` AND payment_status = $2`;
                countParams.push(status);
            }

            const countResult = await connection.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].count);

            connection.release();

            const transactions = result.rows.map(row => ({
                id: row.id,
                transactionId: row.transaction_id,
                userId: row.user_id,
                planId: row.plan_id,
                baseAmount: parseFloat(row.base_amount),
                ppnAmount: parseFloat(row.ppn_amount),
                uniqueCode: row.unique_code,
                totalAmount: parseFloat(row.total_amount),
                voucherCode: row.voucher_code || null,
                discountAmount: row.discount_amount ? parseFloat(row.discount_amount) : null,
                paymentMethod: row.payment_method,
                paymentStatus: row.payment_status,
                paymentProofUrl: row.payment_proof_url || null,
                createdAt: row.created_at,
            }));

            return NextResponse.json({
                success: true,
                data: transactions,
                meta: {
                    total,
                    limit,
                    offset,
                    has_more: offset + limit < total
                }
            });
        } catch (error: any) {
            connection.release();
            throw error;
        }
    } catch (error: any) {
        console.error('List transactions error:', error);
        if (error.message === 'Authentication required') {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (error.message.startsWith('Permission denied')) {
            return NextResponse.json({ success: false, error: error.message }, { status: 403 });
        }
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil data transaksi' },
            { status: 500 }
        );
    }
}
