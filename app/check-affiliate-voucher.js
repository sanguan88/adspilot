const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function checkAffiliate() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking affiliates and vouchers...\n');

        // Check affiliates
        const affiliates = await client.query(
            `SELECT affiliate_id, affiliate_code, name, status FROM affiliates ORDER BY created_at DESC LIMIT 5`
        );
        console.log('📋 Recent Affiliates:');
        affiliates.rows.forEach(a => {
            console.log(`   ${a.affiliate_code} - ${a.name} (${a.status})`);
        });

        // Check affiliate vouchers
        const vouchers = await client.query(
            `SELECT av.voucher_code, av.discount_value, av.is_active, a.affiliate_code, a.name
       FROM affiliate_vouchers av
       JOIN affiliates a ON av.affiliate_id = a.affiliate_id
       ORDER BY av.created_at DESC`
        );
        console.log('\n🎫 Affiliate Vouchers:');
        if (vouchers.rows.length === 0) {
            console.log('   No vouchers found!');
        } else {
            vouchers.rows.forEach(v => {
                console.log(`   ${v.voucher_code} (${v.discount_value}%) - Affiliate: ${v.affiliate_code} - Active: ${v.is_active}`);
            });
        }

        // Check for TES79C8
        const tes = await client.query(
            `SELECT * FROM affiliates WHERE affiliate_code LIKE 'TES%'`
        );
        console.log('\n🔎 Affiliates matching TES%:');
        if (tes.rows.length === 0) {
            console.log('   None found!');
        } else {
            tes.rows.forEach(a => {
                console.log(`   ${a.affiliate_code} - ID: ${a.affiliate_id}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkAffiliate();
