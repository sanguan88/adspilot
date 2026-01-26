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

        const result = await client.query(`
            SELECT email, username, status_user
            FROM data_user
            WHERE status_user IN ('aktif', 'active', 'pending_payment')
            AND email IS NOT NULL
            LIMIT 5
        `);

        console.log('Active users with emails:');
        result.rows.forEach(row => {
            console.log(`- ${row.email} (${row.username}) - ${row.status_user}`);
        });

        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
