const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Database Migration for Moota ---');

        // 1. Add 'moota' to provider constraint
        const addMootaSql = `
      DO $$ 
      BEGIN
          BEGIN
              ALTER TABLE payment_gateway_config DROP CONSTRAINT IF EXISTS payment_gateway_config_provider_check;
          EXCEPTION
              WHEN undefined_object THEN
                  NULL;
          END;

          ALTER TABLE payment_gateway_config 
          ADD CONSTRAINT payment_gateway_config_provider_check 
          CHECK (provider IN ('midtrans', 'xendit', 'doku', 'moota', 'other'));
      END $$;
    `;
        console.log('Adding "moota" to provider constraint...');
        await client.query(addMootaSql);

        // 2. Increase column lengths
        const fixLengthsSql = `
      ALTER TABLE payment_gateway_config 
      ALTER COLUMN merchant_key TYPE TEXT,
      ALTER COLUMN client_key TYPE TEXT,
      ALTER COLUMN server_key TYPE TEXT,
      ALTER COLUMN webhook_url TYPE TEXT;
    `;
        console.log('Increasing column lengths to TEXT...');
        await client.query(fixLengthsSql);

        console.log('--- Migration Successful! ---');
    } catch (err) {
        console.error('--- Migration Failed! ---');
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
