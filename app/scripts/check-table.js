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

async function checkTable() {
    const client = await pool.connect();
    try {
        console.log('Checking data_rules table structure...');
        const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'data_rules'
    `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTable();
