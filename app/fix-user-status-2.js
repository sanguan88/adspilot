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
        console.log('Connecting...');
        const client = await pool.connect();
        console.log('Connected. Updating user status...');

        const result = await client.query(
            `UPDATE data_user 
       SET status_user = 'active' 
       WHERE user_id = '922df50b-2f9f-4bf0-8c10-8733328a97ff'
       RETURNING user_id, username, status_user`
        );

        if (result.rows.length > 0) {
            console.log('User status updated successfully:');
            console.log(result.rows[0]);
        } else {
            console.log('User not found');
        }

        client.release();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

run();
