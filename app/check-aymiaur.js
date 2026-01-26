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

        // Check for email containing 'aymiaur'
        const result = await client.query(`
            SELECT username, email, status_user
            FROM data_user
            WHERE email LIKE '%aymiaur%'
            OR username LIKE '%aymiaur%'
        `);

        console.log(`Found ${result.rows.length} user(s) with 'aymiaur':`);
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
