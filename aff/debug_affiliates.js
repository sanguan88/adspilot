const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function getEnvValue(key) {
    // Try process.env first
    if (process.env[key]) return process.env[key];

    // Try .env.local
    try {
        const envLocal = fs.readFileSync('.env.local', 'utf8');
        const match = envLocal.match(new RegExp(`${key}=(.+)`));
        if (match) {
            let val = match[1].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            // Handle escaped backslash at end if present (very crude)
            if (val.endsWith('\\')) {
                val = val.slice(0, -1); // Just remove it for now, assuming it's an escape for the quote but the quote was stripped? 
                // Actually the .env content shown previously was DB_PASSWORD=" ... \"
                // If readFileSync reads it raw, it includes the quotes.
            }
            return val;
        }
    } catch (e) { }

    // Try .env
    try {
        const env = fs.readFileSync('.env', 'utf8');
        const match = env.match(new RegExp(`${key}=(.+)`));
        if (match) {
            let val = match[1].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            return val;
        }
    } catch (e) { }

    return null;
}

const config = {
    host: getEnvValue('DB_HOST'),
    port: parseInt(getEnvValue('DB_PORT') || '5432'),
    user: getEnvValue('DB_USER'),
    password: getEnvValue('DB_PASSWORD'),
    database: getEnvValue('DB_NAME'),
};

console.log('DB Config:', { ...config, password: config.password ? '***' : 'MISSING' });

const pool = new Pool(config);

async function check() {
    try {
        console.log('Connecting...');
        const result = await pool.query('SELECT email, affiliate_code, status FROM affiliates LIMIT 50');
        console.log('Affiliate users in database:');
        console.log(JSON.stringify(result.rows, null, 2));

        const userCheck = await pool.query("SELECT * FROM affiliates WHERE email = 'test@test.com' OR email LIKE '%rafly%'");
        if (userCheck.rows.length > 0) {
            console.log('Found specific user:', userCheck.rows);
        } else {
            console.log('Specific user NOT found');
        }

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await pool.end();
    }
}

check();
