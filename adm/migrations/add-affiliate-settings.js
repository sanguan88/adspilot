/**
 * Migration: Add Affiliate settings to system_settings
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

async function addAffiliateSettings() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('🔄 Adding affiliate settings...');

        const settings = [
            { key: 'affiliate.commissionRate', value: '10', type: 'number', category: 'affiliate', description: 'Percentage of commission for affiliates', isPublic: true },
            { key: 'affiliate.minPayout', value: '50000', type: 'number', category: 'affiliate', description: 'Minimum amount for payout request', isPublic: false },
            { key: 'affiliate.cookieExpiryDays', value: '30', type: 'number', category: 'affiliate', description: 'How long the referral cookie lasts in days', isPublic: true },
        ];

        for (const setting of settings) {
            await pool.query(
                `INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (setting_key) DO UPDATE SET
                    setting_value = EXCLUDED.setting_value,
                    description = EXCLUDED.description`,
                [setting.key, setting.value, setting.type, setting.category, setting.description, setting.isPublic]
            );
        }

        console.log('✅ Affiliate settings added successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

addAffiliateSettings();
