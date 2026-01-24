const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function fixMissingReferrals() {
    const client = await pool.connect();

    try {
        console.log('🛠️ Fixing missing referral records based on voucher usage...\n');

        // Find transactions with voucher_affiliate_id where corresponding affiliate_referrals record is missing
        const missing = await client.query(`
      SELECT 
        t.user_id, 
        t.voucher_affiliate_id, 
        t.voucher_code,
        t.created_at,
        u.username
      FROM transactions t
      JOIN data_user u ON t.user_id = u.user_id
      WHERE t.voucher_affiliate_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM affiliate_referrals ar 
        WHERE ar.user_id = t.user_id 
        AND ar.affiliate_id = t.voucher_affiliate_id
      )
    `);

        console.log(`Found ${missing.rows.length} missing referral records.`);

        for (const row of missing.rows) {
            console.log(`Creating referral for user ${row.username} (Affiliate: ${row.voucher_affiliate_id})...`);

            // Insert into affiliate_referrals
            await client.query(
                `INSERT INTO affiliate_referrals (
          affiliate_id, user_id, referral_code, signup_date, status
        ) VALUES ($1, $2, $3, $4, 'converted')`,
                [row.voucher_affiliate_id, row.user_id, row.voucher_code, row.created_at]
            );

            // Update data_user referred_by_affiliate if missing
            await client.query(
                `UPDATE data_user SET referred_by_affiliate = $1, referral_date = $2 
         WHERE user_id = $3 AND referred_by_affiliate IS NULL`,
                [row.voucher_code, row.created_at, row.user_id]
            );
        }

        console.log('\n✅ All missing referrals fixed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixMissingReferrals();
