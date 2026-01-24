/**
 * Migration: Create system_settings table
 * Date: 2026-01-12
 * Purpose: Store system-wide configuration settings
 */

const mysql = require('mysql2/promise');

async function createSystemSettingsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Creating system_settings table...');

        // Create system_settings table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        category VARCHAR(50) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

        console.log('✅ Table system_settings created successfully');

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
            await connection.query(
                `INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           setting_value = VALUES(setting_value),
           description = VALUES(description)`,
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

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run migration
if (require.main === module) {
    createSystemSettingsTable()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { createSystemSettingsTable };
