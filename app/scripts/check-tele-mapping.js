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

async function checkRuleAndUser() {
    const client = await pool.connect();
    try {
        console.log('--- Rule and User Status ---');

        // Cek 5 rule terakhir yang triggers-nya bertambah (asumsi rule yang baru saja jalan)
        const resRules = await client.query(`
            SELECT rule_id, name, user_id, telegram_notification, triggers, update_at
            FROM data_rules
            WHERE triggers > 0
            ORDER BY update_at DESC
            LIMIT 5
        `);

        if (resRules.rows.length === 0) {
            console.log('No rules with triggers found.');
        } else {
            for (const rule of resRules.rows) {
                console.log(`\nRule: ${rule.name} (${rule.rule_id})`);
                console.log(`User ID in Rule: ${rule.user_id}`);
                console.log(`Notif Enabled: ${rule.telegram_notification}`);
                console.log(`Total Triggers: ${rule.triggers}`);
                console.log(`Last Updated: ${rule.update_at}`);

                // Look for user by UUID
                const resUserUUID = await client.query(`
                    SELECT user_id, no, username, chatid_tele 
                    FROM data_user 
                    WHERE user_id = $1
                `, [rule.user_id]);

                // Look for user by integer string
                const resUserNo = await client.query(`
                    SELECT user_id, no, username, chatid_tele 
                    FROM data_user 
                    WHERE CAST(no AS VARCHAR) = $1
                `, [rule.user_id]);

                if (resUserUUID.rows.length > 0) {
                    console.log(`User found by UUID: ${resUserUUID.rows[0].username} (Chat ID: ${resUserUUID.rows[0].chatid_tele})`);
                } else if (resUserNo.rows.length > 0) {
                    console.log(`User found by NO: ${resUserNo.rows[0].username} (Chat ID: ${resUserNo.rows[0].chatid_tele})`);
                } else {
                    console.log('User NOT found in data_user for this user_id!');
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkRuleAndUser();
