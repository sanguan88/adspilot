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

        console.log('Adding columns to affiliates table...');

        // Add telegram_username if not exists
        await client.query(`
            ALTER TABLE affiliates 
            ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(50);
        `);
        console.log('Added telegram_username');

        // Add whatsapp_number if not exists (we can map "No WhatsApp" to this)
        // Or we can use the existing 'phone' column if we prefer, but let's be specific as requested
        await client.query(`
            ALTER TABLE affiliates 
            ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
        `);
        console.log('Added whatsapp_number');

        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

migrate();
