import { PoolClient } from 'pg';

/**
 * Centrally process a successful payment
 */
export async function processSuccessfulPayment(transactionId: string, connection: PoolClient) {
    console.log(`[Payment] Processing successful payment for Transaction ID: ${transactionId}`);

    // 1. Get transaction details
    const trxResult = await connection.query(
        `SELECT 
          id, transaction_id, user_id, payment_status, plan_id,
          base_amount, ppn_amount, total_amount, discount_amount, voucher_affiliate_id
        FROM transactions 
        WHERE transaction_id = $1`,
        [transactionId]
    );

    if (trxResult.rows.length === 0) {
        throw new Error('Transaction not found');
    }

    const transaction = trxResult.rows[0];

    // Check if already processed
    if (transaction.payment_status === 'paid') {
        console.log(`[Payment] Transaction ${transactionId} already marked as paid.`);
        return { success: true, message: 'Already processed' };
    }

    // 2. Update Transaction status to 'paid'
    await connection.query(
        `UPDATE transactions 
         SET payment_status = 'paid', 
             updated_at = NOW() 
         WHERE id = $1`,
        [transaction.id]
    );

    // 3. Activate User Account
    await connection.query(
        `UPDATE data_user 
         SET status_user = 'aktif', 
             update_at = NOW() 
         WHERE user_id = $1`,
        [transaction.user_id]
    );

    // 4. Expire existing active subscription (if any)
    await connection.query(
        `UPDATE subscriptions 
         SET status = 'expired',
             updated_at = NOW() 
         WHERE user_id = $1 AND status = 'active'`,
        [transaction.user_id]
    );

    // 5. Create Record in subscriptions table
    const planDuration: { [key: string]: number } = {
        '1-month': 1,
        '3-month': 3,
        '6-month': 6,
    };
    const months = planDuration[transaction.plan_id] || 1;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const billingCycleMap: { [key: string]: string } = {
        '1-month': 'monthly',
        '3-month': 'quarterly',
        '6-month': 'semi-annual',
    };
    const billingCycle = billingCycleMap[transaction.plan_id] || 'monthly';

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    await connection.query(
        `INSERT INTO subscriptions (
          user_id, plan_id, transaction_id,
          status, start_date, end_date, billing_cycle,
          base_amount, ppn_amount, total_amount,
          auto_renew, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
            transaction.user_id,
            transaction.plan_id,
            transaction.transaction_id,
            'active',
            startDateStr,
            endDateStr,
            billingCycle,
            parseFloat(String(transaction.base_amount)),
            parseFloat(String(transaction.ppn_amount)),
            parseFloat(String(transaction.total_amount)),
            false,
        ]
    );

    // 6. Affiliate Commission Processing
    try {
        let affiliateId: string | null = null;
        let affiliateCode: string | null = null;

        if (transaction.voucher_affiliate_id) {
            affiliateId = transaction.voucher_affiliate_id;
        } else {
            const userResult = await connection.query(
                'SELECT referred_by_affiliate FROM data_user WHERE user_id = $1',
                [transaction.user_id]
            );

            affiliateCode = userResult.rows[0]?.referred_by_affiliate;
        }

        if (affiliateId || affiliateCode) {
            let affiliateResult;
            if (affiliateId) {
                affiliateResult = await connection.query(
                    `SELECT affiliate_id, commission_rate FROM affiliates WHERE affiliate_id = $1 AND status = 'active'`,
                    [affiliateId]
                );
            } else {
                affiliateResult = await connection.query(
                    `SELECT affiliate_id, commission_rate FROM affiliates WHERE affiliate_code = $1 AND status = 'active'`,
                    [affiliateCode]
                );
            }

            if (affiliateResult.rows.length > 0) {
                const affiliate = affiliateResult.rows[0];
                const finalAffiliateId = affiliate.affiliate_id;

                let commissionRate = parseFloat(affiliate.commission_rate);
                if (isNaN(commissionRate) || commissionRate === 0) {
                    const settingsResult = await connection.query(
                        "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'default_commission_rate'"
                    );
                    commissionRate = parseFloat(settingsResult.rows[0]?.setting_value || '10');
                }

                const previousCommissions = await connection.query(
                    'SELECT commission_id FROM affiliate_commissions WHERE user_id = $1 AND status = $2',
                    [transaction.user_id, 'paid']
                );
                const type = previousCommissions.rows.length === 0 ? 'first_payment' : 'recurring';

                const baseAmt = parseFloat(String(transaction.base_amount));
                const discAmt = parseFloat(String(transaction.discount_amount || 0));
                const amountForCommission = baseAmt - discAmt;
                const commissionAmount = (amountForCommission * commissionRate) / 100;

                if (commissionAmount > 0) {
                    await connection.query(
                        `INSERT INTO affiliate_commissions (
                          affiliate_id, user_id, transaction_id, order_id,
                          type, amount, commission_rate, status, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
                        [
                            finalAffiliateId,
                            transaction.user_id,
                            transaction.transaction_id,
                            transaction.transaction_id,
                            type,
                            commissionAmount,
                            commissionRate,
                            'pending'
                        ]
                    );

                    if (type === 'first_payment') {
                        await connection.query(
                            `UPDATE affiliate_referrals 
                             SET first_payment_date = NOW(), status = 'converted'
                             WHERE user_id = $1 AND affiliate_id = $2`,
                            [transaction.user_id, finalAffiliateId]
                        );
                    }
                }
            }
        }
    } catch (affError) {
        console.error('[Affiliate Error]', affError);
    }

    return { success: true };
}
