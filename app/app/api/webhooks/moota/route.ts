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
            const mutationList = Array.isArray(mutations) ? mutations : [mutations];
            const results = [];

            const { processSuccessfulPayment } = require('@/lib/payment-utils');

            for (const mutation of mutationList) {
                const { amount, type, description, date, bank_type, account_number, id: mootaMutationId } = mutation;

                // Log all mutations (CR or DB) for audit trail
                let mutationStatus = 'pending';
                let matchedTrxId = null;

                // 4. Find matching transaction (only for Credit)
                if (type === 'CR') {
                    console.log(`[Moota Webhook] Processing CR mutation: ${amount} on ${date}`);

                    const trxResult = await connection.query(
                        `SELECT transaction_id 
                         FROM transactions 
                         WHERE total_amount = $1 
                         AND (payment_status = 'pending' OR payment_status = 'waiting_confirmation')
                         ORDER BY created_at DESC 
                         LIMIT 1`,
                        [amount]
                    );

                    if (trxResult.rows.length > 0) {
                        const trx = trxResult.rows[0];
                        matchedTrxId = trx.transaction_id;

                        try {
                            // Use shared activation logic
                            await processSuccessfulPayment(matchedTrxId, connection);
                            mutationStatus = 'processed';
                            console.log(`[Moota Webhook] Successfully processed Transaction: ${matchedTrxId}`);
                        } catch (err) {
                            console.error(`[Moota Webhook] Error processing activation for ${matchedTrxId}:`, err);
                            mutationStatus = 'failed';
                        }
                    } else {
                        mutationStatus = 'ignored';
                    }
                } else {
                    mutationStatus = 'ignored'; // Debit mutations are ignored for activation
                }

                // 5. Save to bank_mutations log
                try {
                    await connection.query(
                        `INSERT INTO bank_mutations (
                            moota_mutation_id, amount, bank_type, account_number, 
                            description, date, type, status, transaction_id, raw_data
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (moota_mutation_id) DO NOTHING`,
                        [
                            mootaMutationId, amount, bank_type, account_number,
                            description, date, type, mutationStatus, matchedTrxId, JSON.stringify(mutation)
                        ]
                    );
                } catch (logErr) {
                    console.error('[Moota Webhook] Failed to log mutation:', logErr);
                }

                results.push({ mutation_id: mootaMutationId, status: mutationStatus, transaction_id: matchedTrxId });
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
