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

async function dumpRule() {
    const client = await pool.connect();
    try {
        const ruleId = 'ae25c4e1-5cdf-4983-b57a-9c1fac1f90f1';
        const res = await client.query('SELECT * FROM data_rules WHERE rule_id = $1', [ruleId]);
        console.log(JSON.stringify(res.rows[0], null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

dumpRule();
