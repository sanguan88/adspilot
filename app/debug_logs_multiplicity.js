const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Basic .env parser
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
        console.log('--- 1. Checking for Duplicates in data_produk ---');
        const produkRes = await client.query(`
      SELECT campaign_id, id_toko, count(*) 
      FROM data_produk 
      GROUP BY campaign_id, id_toko 
      HAVING count(*) > 1 
      LIMIT 10
    `);
        console.log('Duplicates in data_produk (campaign_id, id_toko):');
        console.log(JSON.stringify(produkRes.rows, null, 2));

        console.log('\n--- 2. Checking rule_execution_logs count around specific timestamp ---');
        // We look for logs around 16:02:56 on Jan 26, 2026
        // The timestamp in local time might be different from UTC in DB
        const logRes = await client.query(`
      SELECT rule_id, campaign_id, toko_id, executed_at, count(*) 
      FROM rule_execution_logs 
      WHERE executed_at >= NOW() - INTERVAL '1 hour'
      GROUP BY rule_id, campaign_id, toko_id, executed_at
      HAVING count(*) > 1
      LIMIT 10
    `);
        console.log('Duplicate IDs in rule_execution_logs (same rule, campaign, toko, and exact timestamp):');
        console.log(JSON.stringify(logRes.rows, null, 2));

        const totalLogs = await client.query(`
      SELECT count(*) FROM rule_execution_logs 
      WHERE executed_at >= '2026-01-26 16:02:50' 
      AND executed_at <= '2026-01-26 16:03:05'
    `);
        console.log('\nTotal rows in rule_execution_logs between 16:02:50 and 16:03:05:', totalLogs.rows[0].count);

    } catch (err) {
        console.error('Error during database check:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

check();
