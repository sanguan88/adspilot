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

async function checkUserRules() {
    const client = await pool.connect();
    try {
        const chatid = '1833411503';
        console.log(`Checking rules for user with Chat ID: ${chatid}`);

        // Find user_id first
        const userRes = await client.query('SELECT user_id, username FROM data_user WHERE chatid_tele = $1', [chatid]);
        if (userRes.rows.length === 0) {
            console.log('User not found with this Chat ID');
            return;
        }

        const { user_id, username } = userRes.rows[0];
        console.log(`Found user: ${username} (${user_id})`);

        const rulesRes = await client.query(`
      SELECT rule_id, name, status, telegram_notification, execution_mode
      FROM data_rules
      WHERE user_id = $1
    `, [user_id]);

        if (rulesRes.rows.length === 0) {
            console.log('No rules found for this user');
        } else {
            console.table(rulesRes.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUserRules();
