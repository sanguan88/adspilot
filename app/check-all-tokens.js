const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function run() {
    try {
        const client = await pool.connect();

        console.log('=== ALL VALID TOKENS ===\n');

        // Get all tokens that should be valid with new query
        const result = await client.query(`
            SELECT 
                email,
                reset_password_token,
                reset_password_expires,
                reset_password_expires > (NOW() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC' as is_valid,
                EXTRACT(EPOCH FROM (reset_password_expires - ((NOW() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC'))) / 60 as minutes_remaining
            FROM data_user
            WHERE reset_password_token IS NOT NULL
            ORDER BY reset_password_expires DESC
        `);

        console.log(`Found ${result.rows.length} token(s) in database:\n`);

        result.rows.forEach((row, index) => {
            console.log(`Token ${index + 1}:`);
            console.log('- Email:', row.email);
            console.log('- Token:', row.reset_password_token.substring(0, 30) + '...');
            console.log('- Expires:', row.reset_password_expires);
            console.log('- Valid:', row.is_valid ? 'YES ✅' : 'NO ❌');
            console.log('- Time remaining:', Math.round(row.minutes_remaining), 'minutes');
            console.log('');
        });

        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
