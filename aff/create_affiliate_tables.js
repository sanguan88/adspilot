const { Client } = require('pg');

const client = new Client({
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    host: '154.19.37.198',
    port: 3306,
    database: 'soroboti_ads',
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Create affiliate_settings
        console.log('Creating affiliate_settings table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_settings (
        setting_id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by INTEGER
      );
    `);

        // Insert Default Settings
        console.log('Inserting default settings...');
        const settings = [
            ['default_commission_rate', '10', 'Default commission rate (%)'],
            ['minimum_payout', '50000', 'Minimum payout amount (Rp)'],
            ['cookie_expiry_days', '90', 'Referral cookie expiry in days (3 months)'],
            ['attribution_model', 'first_click', 'Attribution model: first_click or last_click'],
            ['payout_schedule_week2', 'true', 'Enable payout on week 2'],
            ['payout_schedule_week4', 'true', 'Enable payout on week 4'],
            ['trial_commission_enabled', 'false', 'Enable commission for trial'],
            ['lifetime_attribution', 'true', 'Enable lifetime referral attribution']
        ];

        for (const [key, value, desc] of settings) {
            await client.query(`
        INSERT INTO affiliate_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
      `, [key, value, desc]);
        }

        // 2. Create affiliates
        console.log('Creating affiliates table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS affiliates (
        affiliate_id VARCHAR(50) PRIMARY KEY,
        affiliate_code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        commission_rate DECIMAL(5,2) DEFAULT 10.00,
        photo_profile TEXT,
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_account_name VARCHAR(255),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // 3. Create affiliate_referrals
        console.log('Creating affiliate_referrals table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_referrals (
        referral_id SERIAL PRIMARY KEY,
        affiliate_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        referral_code VARCHAR(50) NOT NULL,
        first_click_date TIMESTAMP NOT NULL DEFAULT NOW(),
        signup_date TIMESTAMP DEFAULT NOW(),
        first_payment_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'converted',
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id),
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES data_user(user_id)
      );
    `);

        // 4. Create affiliate_commissions
        console.log('Creating affiliate_commissions table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        commission_id SERIAL PRIMARY KEY,
        affiliate_id VARCHAR(50) NOT NULL,
        referral_id INTEGER,
        user_id VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(100),
        order_id VARCHAR(100),
        type VARCHAR(20) NOT NULL, -- first_payment, recurring
        amount DECIMAL(15,2) NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
        payout_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        paid_at TIMESTAMP,
        notes TEXT,
        CONSTRAINT fk_comm_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id),
        -- referral_id can be null if we don't track it strictly
        CONSTRAINT fk_comm_user FOREIGN KEY (user_id) REFERENCES data_user(user_id)
      );
    `);

        // 5. Create affiliate_payouts
        console.log('Creating affiliate_payouts table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_payouts (
        payout_id SERIAL PRIMARY KEY,
        payout_batch VARCHAR(50) UNIQUE NOT NULL,
        payout_date DATE NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        total_affiliates INTEGER NOT NULL,
        total_commissions INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, cancelled
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by INTEGER,
        paid_at TIMESTAMP,
        notes TEXT
      );
    `);

        // 6. Update data_user table
        console.log('Updating data_user table...');
        await client.query(`
      ALTER TABLE data_user ADD COLUMN IF NOT EXISTS referred_by_affiliate VARCHAR(50);
      ALTER TABLE data_user ADD COLUMN IF NOT EXISTS referral_date TIMESTAMP;
      ALTER TABLE data_user ADD COLUMN IF NOT EXISTS referral_cookie_first_click TIMESTAMP;
    `);

        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

migrate();
