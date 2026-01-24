import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDatabaseConnection } from '@/lib/db';

/**
 * POST - Webhook receiver for Moota.co
 */
export async function POST(request: NextRequest) {
    try {
        const signature = request.headers.get('Signature');
        const rawBody = await request.text();

        if (!signature) {
            console.error('[Moota Webhook] Missing Signature header');
            return NextResponse.json({ success: false, error: 'Authorization required' }, { status: 401 });
        }

        const connection = await getDatabaseConnection();

        try {
            // 1. Get Moota Configuration
            const configResult = await connection.query(
                `SELECT server_key, client_key, is_active 
                 FROM payment_gateway_config 
                 WHERE provider = 'moota' AND is_active = true 
                 LIMIT 1`
            );

            if (configResult.rows.length === 0) {
                console.error('[Moota Webhook] Moota integration is not configured or inactive');
                connection.release();
                return NextResponse.json({ success: false, error: 'Integration inactive' }, { status: 403 });
            }

            const { server_key: apiToken, client_key: webhookSecret } = configResult.rows[0];

            // 2. Verify Signature
            // Moota V2 Doc says hash_hmac('sha256', rawBody, webhookSecret/apiToken)
            // We'll use the client_key (webhookSecret) if provided, otherwise the apiToken
            const secret = webhookSecret || apiToken;
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(rawBody)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('[Moota Webhook] Invalid signature', { received: signature, expected: expectedSignature });
                connection.release();
                return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
            }

            // 3. Process Mutations
            const mutations = JSON.parse(rawBody);

            // Moota might send an array or a single object depending on configuration
            const mutationList = Array.isArray(mutations) ? mutations : [mutations];

            const results = [];

            for (const mutation of mutationList) {
                const { amount, type, description, date } = mutation;

                // We only care about Money In (Credit)
                if (type !== 'CR') continue;

                console.log(`[Moota Webhook] Processing CR mutation: ${amount} on ${date}`);

                // 4. Find matching transaction
                // Match by total_amount (which includes the unique code)
                // We look for 'pending' or 'waiting_confirmation' status
                const trxResult = await connection.query(
                    `SELECT id, transaction_id, user_id, plan_id, total_amount 
                     FROM transactions 
                     WHERE total_amount = $1 
                     AND (payment_status = 'pending' OR payment_status = 'waiting_confirmation')
                     ORDER BY created_at DESC 
                     LIMIT 1`,
                    [amount]
                );

                if (trxResult.rows.length > 0) {
                    const trx = trxResult.rows[0];
                    const trxId = trx.transaction_id;
                    const userId = trx.user_id;

                    console.log(`[Moota Webhook] Match found! Transaction: ${trxId} for User: ${userId}`);

                    // 5. Update Transaction status to 'paid'
                    await connection.query(
                        `UPDATE transactions 
                         SET payment_status = 'paid', 
                             payment_method = 'moota_auto',
                             updated_at = NOW() 
                         WHERE id = $1`,
                        [trx.id]
                    );

                    // 6. Activate User Account
                    await connection.query(
                        `UPDATE data_user 
                         SET status_user = 'aktif', 
                             update_at = NOW() 
                         WHERE user_id = $1`,
                        [userId]
                    );

                    results.push({ mutation_id: mutation.id, status: 'processed', transaction_id: trxId });
                } else {
                    console.log(`[Moota Webhook] No matching pending transaction for amount: ${amount}`);
                    results.push({ mutation_id: mutation.id, status: 'ignored', reason: 'no_match' });
                }
            }

            connection.release();
            return NextResponse.json({ success: true, processed: results });

        } catch (error: any) {
            if (connection) connection.release();
            throw error;
        }

    } catch (error: any) {
        console.error('[Moota Webhook] Critical Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
