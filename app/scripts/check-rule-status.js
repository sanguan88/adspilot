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

async function checkRuleStatus() {
    const client = await pool.connect();
    try {
        const ruleId = 'ae25c4e1-5cdf-4983-b57a-9c1fac1f90f1';
        console.log(`Checking status for rule: ${ruleId}`);

        const res = await client.query(`
      SELECT rule_id, name, status, update_at, execution_mode, telegram_notification
      FROM data_rules
      WHERE rule_id = $1
    `, [ruleId]);

        if (res.rows.length === 0) {
            console.log('Rule not found');
        } else {
            console.table(res.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkRuleStatus();
