/**
 * Migration: Create audit_logs table (PostgreSQL)
 * Date: 2026-01-12
 * Purpose: Track all admin actions for security and compliance
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

async function createAuditLogsTable() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Creating audit_logs table...');

        // Create audit_logs table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
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

        console.log('✅ Table audit_logs created successfully');

        // Create indexes for better query performance
        console.log('🔄 Creating indexes...');

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
    `);

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
    `);

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type)
    `);

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)
    `);

        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status)
    `);

        console.log('✅ Created 5 indexes for performance');

        // Insert sample audit log for testing
        console.log('🔄 Inserting sample audit log...');

        await pool.query(`
      INSERT INTO audit_logs (
        user_id, user_email, user_role, action, resource_type, 
        resource_id, resource_name, description, status
      ) VALUES (
        1, 'admin@adspilot.id', 'superadmin', 'system.migration', 'database',
        'audit_logs', 'Audit Logs Table', 'Created audit_logs table via migration', 'success'
      )
    `);

        console.log('✅ Inserted sample audit log');
        console.log('');
        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log('  - Table: audit_logs');
        console.log('  - Indexes: 5 (user_id, action, resource_type, created_at, status)');
        console.log('  - Sample logs: 1');
        console.log('');
        console.log('📋 Tracked Actions:');
        console.log('  - user.create, user.update, user.delete');
        console.log('  - subscription.create, subscription.update, subscription.cancel');
        console.log('  - store.assign, store.unassign');
        console.log('  - voucher.create, voucher.update, voucher.delete');
        console.log('  - settings.update');
        console.log('  - And more...');
        console.log('');
        console.log('✅ You can now track all admin actions!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    createAuditLogsTable()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { createAuditLogsTable };
