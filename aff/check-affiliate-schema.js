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

        // Check columns in affiliates table
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'affiliates'
            ORDER BY ordinal_position
        `);

        console.log('Columns in affiliates table:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type}`);
        });

        // Check if reset password columns exist
        const hasResetToken = result.rows.some(r => r.column_name === 'reset_password_token');
        const hasResetExpires = result.rows.some(r => r.column_name === 'reset_password_expires');

        console.log('\nReset password columns:');
        console.log(`- reset_password_token: ${hasResetToken ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`- reset_password_expires: ${hasResetExpires ? '✅ EXISTS' : '❌ MISSING'}`);

        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
