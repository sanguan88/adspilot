const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                let key = parts[0].trim();
                let val = parts.slice(1).join('=').trim();
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                process.env[key] = val;
            }
        });
    }
}

loadEnv();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function check() {
    const client = await pool.connect();
    try {
        console.log('--- 1. Verification of Actual Execution ---');
        // Count distinct (rule, campaign, toko, executed_at) vs total count
        const countRes = await client.query(`
      SELECT 
        count(*) as total_rows,
        count(*) FILTER (WHERE execution_data->>'skipped' = 'true') as skipped_count,
        count(*) FILTER (WHERE status = 'success' AND (execution_data->>'skipped' IS NULL OR execution_data->>'skipped' = 'false')) as actual_success_count,
        count(*) FILTER (WHERE status = 'failed') as failed_count
      FROM rule_execution_logs 
      WHERE executed_at >= NOW() - INTERVAL '30 minutes'
    `);
        console.log('Execution logs in last 30 minutes:');
        console.log(JSON.stringify(countRes.rows, null, 2));

        console.log('\n--- 2. Checking the specific timestamp from user screenshot ---');
        // User timestamp 16:36:32 in local time (WIB is UTC+7)
        // 16:36 WIB = 09:36 UTC
        const screenshotLogs = await client.query(`
      SELECT 
        dr.name as rule_name,
        count(*) as total_rows,
        count(*) FILTER (WHERE rel.execution_data->>'skipped' = 'true') as skipped_count
      FROM rule_execution_logs rel
      JOIN data_rules dr ON rel.rule_id = dr.rule_id
      WHERE rel.executed_at >= '2026-01-26 09:36:00' 
      AND rel.executed_at <= '2026-01-26 09:37:00'
      GROUP BY dr.name
    `);
        console.log('Logs around 16:36 WIB:');
        console.log(JSON.stringify(screenshotLogs.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
