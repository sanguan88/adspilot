/**
 * Migration: Fix audit_logs user_id type
 * Purpose: Change user_id from INT to VARCHAR to support UUIDs
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

async function fixAuditLogsSchema() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Fixing audit_logs schema...');

        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'audit_logs'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('⚠️ Table audit_logs does not exist. Creating it correctly...');
            await pool.query(`
                CREATE TABLE audit_logs (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(100) NOT NULL,
                    user_email VARCHAR(255),
                    user_role VARCHAR(50),
                    action VARCHAR(100) NOT NULL,
                    resource_type VARCHAR(50) NOT NULL,
                    resource_id VARCHAR(100),
                    resource_name VARCHAR(255),
                    description TEXT,
                    old_values JSONB,
                    new_values JSONB,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    status VARCHAR(20) DEFAULT 'success',
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            // Create indexes
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type)`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`);

            console.log('✅ Table created with correct schema.');
            return;
        }

        // Alter table to change user_id type
        // We use USING user_id::varchar in case there are existing int values
        await pool.query(`
            ALTER TABLE audit_logs 
            ALTER COLUMN user_id TYPE VARCHAR(100);
        `);

        console.log('✅ Altered user_id to VARCHAR(100)');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    fixAuditLogsSchema()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}
