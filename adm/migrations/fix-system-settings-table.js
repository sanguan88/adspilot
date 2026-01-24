/**
 * Migration: Fix system_settings table (PostgreSQL)
 * Date: 2026-01-12
 * Purpose: Drop and recreate system_settings table with correct schema
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

async function fixSystemSettingsTable() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Dropping existing system_settings table if exists...');
        await pool.query(`DROP TABLE IF EXISTS system_settings CASCADE`);
        console.log('✅ Dropped successfully');

        console.log('🔄 Creating system_settings table...');
        await pool.query(`
      CREATE TABLE system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        category VARCHAR(50) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Table created successfully');

        // Create indexes
        console.log('🔄 Creating indexes...');
        await pool.query(`CREATE INDEX idx_system_settings_category ON system_settings(category)`);
        await pool.query(`CREATE INDEX idx_system_settings_key ON system_settings(setting_key)`);
        console.log('✅ Indexes created');

        // Insert default settings
        console.log('🔄 Inserting default settings...');
        const defaultSettings = [
            // System settings
            { key: 'system.appName', value: 'AdsBot Admin', type: 'string', category: 'system', description: 'Application name', isPublic: true },
            { key: 'system.appVersion', value: '1.0.0', type: 'string', category: 'system', description: 'Application version', isPublic: true },
            { key: 'system.maintenanceMode', value: 'false', type: 'boolean', category: 'system', description: 'Enable maintenance mode', isPublic: false },
            { key: 'system.allowRegistration', value: 'true', type: 'boolean', category: 'system', description: 'Allow new user registration', isPublic: false },

            // Email settings
            { key: 'email.smtpHost', value: process.env.SMTP_HOST || '', type: 'string', category: 'email', description: 'SMTP server host', isPublic: false },
            { key: 'email.smtpPort', value: process.env.SMTP_PORT || '587', type: 'number', category: 'email', description: 'SMTP server port', isPublic: false },
            { key: 'email.smtpUser', value: process.env.SMTP_USER || '', type: 'string', category: 'email', description: 'SMTP username', isPublic: false },
            { key: 'email.smtpFrom', value: process.env.SMTP_FROM || '', type: 'string', category: 'email', description: 'Default from email address', isPublic: false },

            // Payment settings
            { key: 'payment.paymentGateway', value: process.env.PAYMENT_GATEWAY || 'manual', type: 'string', category: 'payment', description: 'Active payment gateway', isPublic: false },
            { key: 'payment.currency', value: 'IDR', type: 'string', category: 'payment', description: 'Default currency', isPublic: true },

            // Security settings
            { key: 'security.sessionTimeout', value: '3600', type: 'number', category: 'security', description: 'Session timeout in seconds', isPublic: false },
            { key: 'security.maxLoginAttempts', value: '5', type: 'number', category: 'security', description: 'Maximum login attempts before lockout', isPublic: false },

            // Notification settings
            { key: 'notifications.emailEnabled', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable email notifications', isPublic: false },
            { key: 'notifications.smsEnabled', value: 'false', type: 'boolean', category: 'notifications', description: 'Enable SMS notifications', isPublic: false },
            { key: 'notifications.webhookUrl', value: process.env.WEBHOOK_URL || '', type: 'string', category: 'notifications', description: 'Webhook URL for notifications', isPublic: false },
        ];

        for (const setting of defaultSettings) {
            await pool.query(
                `INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [setting.key, setting.value, setting.type, setting.category, setting.description, setting.isPublic]
            );
        }

        console.log(`✅ Inserted ${defaultSettings.length} default settings`);
        console.log('');
        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log('  - Table: system_settings');
        console.log(`  - Default settings: ${defaultSettings.length}`);
        console.log('  - Categories: system, email, payment, security, notifications');
        console.log('');
        console.log('✅ Settings page should work now!');
        console.log('✅ Access: http://localhost:3000/settings');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    fixSystemSettingsTable()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { fixSystemSettingsTable };
