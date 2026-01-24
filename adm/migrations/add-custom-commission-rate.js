/**
 * Migration: Add commission_rate to affiliates table
 * Date: 2026-01-12
 */

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

async function addCustomCommissionRate() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Checking affiliates table...');

        // Add commission_rate column if it doesn't exist
        await pool.query(`
            ALTER TABLE affiliates 
            ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT NULL
        `);

        console.log('✅ Column commission_rate added to affiliates table (if not existed)');

        // Also update existing records to NULL (default)
        await pool.query(`UPDATE affiliates SET commission_rate = NULL WHERE commission_rate IS NULL`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

addCustomCommissionRate();
