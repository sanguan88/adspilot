const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Try loading from adm/.env.local first
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// If DB_HOST not found, try loading from sibling app folder ../app/.env
if (!process.env.DB_HOST) {
    console.log('Loading env from app/.env...');
    dotenv.config({ path: path.join(__dirname, '../../app/.env') });
}

console.log(`[Migration] Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}`);


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: Add reset password columns to data_user...');

        // Add columns
        await client.query(`
      ALTER TABLE data_user 
      ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP DEFAULT NULL;
    `);

        console.log('✅ Columns added successfully!');

        // Create index for faster lookup
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON data_user(reset_password_token);
    `);

        console.log('✅ Index created!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
