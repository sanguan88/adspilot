const { Pool } = require('pg');
const fs = require('fs');

function getEnvValue(key) {
    if (process.env[key]) return process.env[key];
    try {
        const envLocal = fs.readFileSync('.env.local', 'utf8');
        const match = envLocal.match(new RegExp(`${key}=(.+)`));
        if (match) {
            let val = match[1].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
            return val;
        }
    } catch (e) { }
    try {
        const env = fs.readFileSync('.env', 'utf8');
        const match = env.match(new RegExp(`${key}=(.+)`));
        if (match) {
            let val = match[1].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
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

const pool = new Pool(config);

async function check() {
    try {
        console.log('--- Checking Affiliate Settings ---');
        const settings = await pool.query("SELECT * FROM affiliate_settings WHERE setting_key = 'default_commission_rate'");
        console.log('Default Commission Rate Setting:', settings.rows);

        console.log('\n--- Checking User Commission Rate ---');
        // Based on screenshot code AJA38A3
        const user = await pool.query("SELECT email, affiliate_code, commission_rate FROM affiliates WHERE affiliate_code = 'AJA38A3'");
        console.log('User AJA38A3:', user.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
