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

async function audit() {
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

    console.log('Connecting with config:', { ...config, password: '***' });
    const pool = new Pool(config);
    let client;

    try {
        client = await pool.connect();
        console.log('Connected successfully!');

        console.log('\n--- AUDIT REFERRALS ---');

        // 1. Check transactions with vouchers that might be affiliate vouchers
        console.log('\n1. Recent transactions with voucher codes:');
        const txns = await client.query(`
            SELECT t.transaction_id, t.user_id, t.voucher_code, t.created_at, u.username
            FROM transactions t
            JOIN data_user u ON t.user_id = u.user_id
            WHERE t.voucher_code IS NOT NULL
            ORDER BY t.created_at DESC
            LIMIT 20
        `);
        if (txns.rows.length > 0) {
            console.table(txns.rows);

            const codes = txns.rows.map(r => r.voucher_code);
            console.log('\n2. Checking if these codes are affiliate vouchers:');
            const affVouchers = await client.query(`
                SELECT av.voucher_code, av.affiliate_id, a.name as affiliate_name
                FROM affiliate_vouchers av
                JOIN affiliates a ON av.affiliate_id = a.affiliate_id
                WHERE UPPER(av.voucher_code) = ANY($1)
            `, [codes.map(c => c.toUpperCase())]);
            console.table(affVouchers.rows);
        } else {
            console.log('No transactions with vouchers found.');
        }

        // 3. Check affiliate_referrals table
        console.log('\n3. Recent records in affiliate_referrals:');
        const referrals = await client.query(`
            SELECT ar.referral_id, ar.affiliate_id, ar.user_id, ar.referral_code, ar.signup_date, a.name as affiliate_name, u.username as registered_user
            FROM affiliate_referrals ar
            JOIN affiliates a ON ar.affiliate_id = a.affiliate_id
            JOIN data_user u ON ar.user_id = u.user_id
            ORDER BY ar.signup_date DESC
            LIMIT 20
        `);
        console.table(referrals.rows);

        // 4. Specifically check AJA38A3 (Ajay's code from previous screenshot)
        console.log('\n4. Checking referrals for code AJA38A3:');
        const ajayReferrals = await client.query(`
            SELECT ar.referral_id, ar.user_id, ar.signup_date, u.username, u.email
            FROM affiliate_referrals ar
            JOIN data_user u ON ar.user_id = u.user_id
            WHERE ar.referral_code = 'AJA38A3' OR ar.referral_code = 'aja38a3'
        `);
        console.table(ajayReferrals.rows);

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

audit();
