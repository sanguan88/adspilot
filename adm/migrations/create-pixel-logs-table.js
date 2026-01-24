/**
 * Migration: Create affiliate_pixel_logs table for Health Check
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables manually
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

async function runMigration() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Creating affiliate_pixel_logs table...');

        const client = await pool.connect();
        try {
            // 1. Create table
            await client.query(`
                CREATE TABLE IF NOT EXISTS affiliate_pixel_logs (
                    id SERIAL PRIMARY KEY,
                    affiliate_id VARCHAR(50) NOT NULL REFERENCES affiliates(affiliate_id) ON DELETE CASCADE,
                    platform VARCHAR(50) NOT NULL,
                    pixel_id VARCHAR(100),
                    event_name VARCHAR(100) NOT NULL,
                    event_status VARCHAR(20) NOT NULL DEFAULT 'success',
                    payload JSONB,
                    error_message TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('✅ Table affiliate_pixel_logs created.');

            // 2. Create index for performance
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_pixel_logs_affiliate_created 
                ON affiliate_pixel_logs(affiliate_id, created_at DESC);
            `);

            console.log('✅ Index created.');

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}
