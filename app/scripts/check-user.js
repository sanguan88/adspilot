const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkUser() {
    const client = await pool.connect();
    try {
        const userId = '3649c16c-012a-4eb1-902d-e309469ab0b0';
        const res = await client.query('SELECT user_id, username, chatid_tele FROM data_user WHERE user_id = $1', [userId]);
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUser();
