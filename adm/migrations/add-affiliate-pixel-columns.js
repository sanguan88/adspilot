/**
 * Migration: Add Pixel Tracking columns to affiliates table
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
        console.log('🔄 Checking affiliates table columns...');

        const client = await pool.connect();
        try {
            // Check if columns exist
            const res = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'affiliates'
            `);

            const columns = res.rows.map(r => r.column_name);

            const newColumns = [
                { name: 'fb_pixel_id', type: 'VARCHAR(100)' },
                { name: 'tiktok_pixel_id', type: 'VARCHAR(100)' },
                { name: 'google_pixel_id', type: 'VARCHAR(100)' }
            ];

            for (const col of newColumns) {
                if (!columns.includes(col.name)) {
                    console.log(`➕ Adding column ${col.name}...`);
                    await client.query(`ALTER TABLE affiliates ADD COLUMN ${col.name} ${col.type}`);
                } else {
                    console.log(`✓ Column ${col.name} already exists.`);
                }
            }

            console.log('✅ Affiliate Pixel columns migration completed.');

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
