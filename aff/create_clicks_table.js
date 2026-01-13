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

        console.log('Creating affiliate_clicks table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS affiliate_clicks (
                click_id SERIAL PRIMARY KEY,
                affiliate_id VARCHAR(50) NOT NULL,
                ip_address VARCHAR(50),
                user_agent TEXT,
                referrer_url TEXT,
                landing_page VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT fk_clicks_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id)
            );
        `);

        console.log('Added affiliate_clicks table successfully');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

migrate();
