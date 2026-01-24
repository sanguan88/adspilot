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

async function checkAllRules() {
    const client = await pool.connect();
    try {
        console.log('Fetching all rules and joining with users...');

        const res = await client.query(`
      SELECT dr.rule_id, dr.name, dr.user_id as rule_user_id, du.username, du.chatid_tele, dr.telegram_notification
      FROM data_rules dr
      LEFT JOIN data_user du ON dr.user_id = du.user_id OR dr.user_id = CAST(du.no AS VARCHAR)
      LIMIT 20
    `);

        console.table(res.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkAllRules();
