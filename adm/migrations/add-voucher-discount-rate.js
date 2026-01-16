const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function addVoucherDiscountRate() {
    const client = await pool.connect();

    try {
        console.log('🚀 Adding voucher_discount_rate to affiliate_settings...\n');

        // Check if setting already exists
        const existing = await client.query(
            `SELECT setting_key FROM affiliate_settings WHERE setting_key = 'voucher_discount_rate'`
        );

        if (existing.rows.length === 0) {
            await client.query(
                `INSERT INTO affiliate_settings (setting_key, setting_value, description, updated_at)
         VALUES ('voucher_discount_rate', '50', 'Default discount rate for affiliate vouchers (%)', NOW())`
            );
            console.log('✅ Added: voucher_discount_rate = 50%');
        } else {
            console.log('ℹ️ voucher_discount_rate already exists');
        }

        // Show all settings
        const result = await client.query(`SELECT * FROM affiliate_settings ORDER BY setting_key`);
        console.log('\n📋 Current Affiliate Settings:');
        result.rows.forEach(row => {
            console.log(`   ${row.setting_key}: ${row.setting_value}`);
        });

        console.log('\n✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

addVoucherDiscountRate();
