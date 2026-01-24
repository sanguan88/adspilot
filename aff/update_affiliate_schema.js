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

        // 1. Create tracking_links table
        console.log('Creating tracking_links table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS tracking_links (
                link_id SERIAL PRIMARY KEY,
                affiliate_id VARCHAR(50) NOT NULL,
                link_type VARCHAR(20) NOT NULL, -- 'landing' or 'checkout'
                url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT fk_links_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id)
            );
        `);
        console.log('Created tracking_links table');

        // 2. Update affiliates table columns
        console.log('Updating affiliates table columns...');
        await client.query(`
            ALTER TABLE affiliates 
            ADD COLUMN IF NOT EXISTS payout_method VARCHAR(20),
            ADD COLUMN IF NOT EXISTS ewallet VARCHAR(50),
            ADD COLUMN IF NOT EXISTS ewallet_type VARCHAR(20);
        `);

        // Rename bank_account_number to bank_account if it exists and bank_account does not
        // We use a safe check block
        try {
            await client.query(`
                ALTER TABLE affiliates 
                RENAME COLUMN bank_account_number TO bank_account;
            `);
            console.log('Renamed bank_account_number to bank_account');
        } catch (e) {
            console.log('Column bank_account_number might not exist or bank_account already exists:', e.message);
        }

        // 3. Update affiliate_referrals to include click_id
        console.log('Updating affiliate_referrals table...');
        await client.query(`
            ALTER TABLE affiliate_referrals
            ADD COLUMN IF NOT EXISTS click_id INTEGER;
        `);
        console.log('Added click_id to affiliate_referrals');

        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

migrate();
