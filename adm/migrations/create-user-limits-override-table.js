/**
 * Migration: Create user_limits_override table
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
        console.log('🔄 Checking user_limits_override table...');

        // Create table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_limits_override (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(100) NOT NULL UNIQUE,
                max_accounts INTEGER DEFAULT NULL,
                max_automation_rules INTEGER DEFAULT NULL,
                max_campaigns INTEGER DEFAULT NULL,
                created_by VARCHAR(100),
                updated_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Index for user_id
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_limits_override_user_id ON user_limits_override(user_id)`);

        console.log('✅ Table user_limits_override created/verified.');

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
