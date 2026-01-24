// Script untuk menambahkan rate limit settings ke system_settings
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function addRateLimitSettings() {
    const client = await pool.connect();

    try {
        console.log('Adding rate limit settings to system_settings...');

        const sql = `
      INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public, created_at, updated_at) VALUES
      ('security.maxLoginAttempts', '5', 'number', 'security', 'Maximum failed login attempts before blocking', false, NOW(), NOW()),
      ('security.loginWindowMinutes', '15', 'number', 'security', 'Time window in minutes to count login attempts', false, NOW(), NOW()),
      ('security.loginBlockDurationMinutes', '30', 'number', 'security', 'Duration in minutes to block user after max attempts', false, NOW(), NOW()),
      ('security.rateLimitEnabled', 'true', 'boolean', 'security', 'Enable/disable rate limiting for login', false, NOW(), NOW())
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        setting_type = EXCLUDED.setting_type,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        updated_at = NOW();
    `;

        await client.query(sql);

        console.log('✓ Rate limit settings added successfully!');

        // Verify the settings were added
        const result = await client.query(`
      SELECT setting_key, setting_value, setting_type 
      FROM system_settings 
      WHERE setting_key LIKE 'security.%Login%' OR setting_key LIKE 'security.rate%'
      ORDER BY setting_key
    `);

        console.log('\nCurrent rate limit settings:');
        result.rows.forEach(row => {
            console.log(`  ${row.setting_key}: ${row.setting_value} (${row.setting_type})`);
        });

    } catch (error) {
        console.error('Error adding settings:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

addRateLimitSettings();
