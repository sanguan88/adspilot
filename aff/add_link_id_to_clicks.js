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

        // Add link_id to affiliate_clicks
        console.log('Adding link_id to affiliate_clicks table...');
        await client.query(`
            ALTER TABLE affiliate_clicks
            ADD COLUMN IF NOT EXISTS link_id INTEGER;
        `);
        console.log('Added link_id to affiliate_clicks');

        console.log('Migration completed successfully');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

migrate();
