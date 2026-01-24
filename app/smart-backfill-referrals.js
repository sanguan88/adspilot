const { Pool } = require('pg');
const fs = require('fs');

function getEnvValue(content, key) {
    const regex = new RegExp(`^${key}=(.+)`, 'm');
    const match = content.match(regex);
    if (match) {
        let val = match[1].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        return val;
    }
    return null;
}

async function backfill() {
    let config = {};
    try {
        const env = fs.readFileSync('.env', 'utf8');
        config = {
            host: getEnvValue(env, 'DB_HOST'),
            port: parseInt(getEnvValue(env, 'DB_PORT') || '5432'),
            user: getEnvValue(env, 'DB_USER'),
            password: getEnvValue(env, 'DB_PASSWORD'),
            database: getEnvValue(env, 'DB_NAME'),
        };
    } catch (e) {
        console.error('Could not read .env file');
        return;
    }

    const pool = new Pool(config);
    const client = await pool.connect();

    try {
        console.log('🛠️ Smart Backfill: Recovery for missing affiliate referrals...\n');

        // 1. Get transactions that have codes found in affiliate_vouchers 
        // AND don't have a referral record yet
        const query = `
            SELECT 
                t.transaction_id, 
                t.user_id, 
                t.voucher_code, 
                t.created_at,
                av.affiliate_id,
                u.username
            FROM transactions t
            JOIN data_user u ON t.user_id = u.user_id
            JOIN affiliate_vouchers av ON UPPER(t.voucher_code) = UPPER(av.voucher_code)
            WHERE NOT EXISTS (
                SELECT 1 FROM affiliate_referrals ar 
                WHERE ar.user_id = t.user_id 
                AND ar.affiliate_id = av.affiliate_id
            )
        `;

        const missing = await client.query(query);
        console.log(`Found ${missing.rows.length} missing referral connections.`);

        for (const row of missing.rows) {
            console.log(`> Fixing: User ${row.username} used voucher ${row.voucher_code} (Affiliate ID: ${row.affiliate_id})`);

            // Insert into affiliate_referrals
            await client.query(
                `INSERT INTO affiliate_referrals (
                    affiliate_id, user_id, referral_code, signup_date, status
                ) VALUES ($1, $2, $3, $4, 'converted')`,
                [row.affiliate_id, row.user_id, row.voucher_code, row.created_at]
            );

            // Update data_user referred_by_affiliate if missing
            await client.query(
                `UPDATE data_user SET referred_by_affiliate = $1, referral_date = $2 
                 WHERE user_id = $3 AND referred_by_affiliate IS NULL`,
                [row.voucher_code, row.created_at, row.user_id]
            );

            console.log(`  ✅ Successfully linked.`);
        }

        console.log('\n✨ Backfill complete!');

    } catch (err) {
        console.error('❌ Error during backfill:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

backfill();
