const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=:#]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
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

pool.query(`
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns 
    WHERE table_name='affiliates' 
    AND column_name='affiliate_id'
`).then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    pool.end();
}).catch(e => {
    console.error(e);
    pool.end();
});
