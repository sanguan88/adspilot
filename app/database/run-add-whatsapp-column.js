const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
        }
    }
});

async function runMigration() {
    const pool = new Pool({
        host: envVars.DB_HOST,
        port: parseInt(envVars.DB_PORT || '5432'),
        database: envVars.DB_NAME,
        user: envVars.DB_USER,
        password: envVars.DB_PASSWORD,
    });

    try {
        console.log('🔄 Connecting to database...');
        const client = await pool.connect();

        console.log('📖 Reading SQL file...');
        const sqlPath = path.join(__dirname, 'add-whatsapp-column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Running migration: Add no_whatsapp column...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');
        console.log('📊 Column no_whatsapp has been added to data_user table');

        client.release();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Error details:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
