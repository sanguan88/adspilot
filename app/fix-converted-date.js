const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function fixConvertedDate() {
    const client = await pool.connect();

    try {
        console.log('🛠️ Fixing missing converted dates...\n');

        // Update first_payment_date = signup_date where status is 'converted' and first_payment_date is null
        const result = await client.query(`
      UPDATE affiliate_referrals 
      SET first_payment_date = signup_date 
      WHERE status = 'converted' AND first_payment_date IS NULL
    `);

        console.log(`✅ Updated ${result.rowCount} records.`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixConvertedDate();
