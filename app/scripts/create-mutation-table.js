const { Pool } = require('pg');
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
        console.log('--- Creating bank_mutations table ---');

        const sql = `
            CREATE TABLE IF NOT EXISTS bank_mutations (
                id SERIAL PRIMARY KEY,
                moota_mutation_id VARCHAR(50) UNIQUE,
                amount DECIMAL(15, 2) NOT NULL,
                bank_type VARCHAR(50),
                account_number VARCHAR(50),
                description TEXT,
                date TIMESTAMP NOT NULL,
                type VARCHAR(10),
                status VARCHAR(20) DEFAULT 'pending',
                transaction_id VARCHAR(100),
                raw_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_bank_mutations_amount_status ON bank_mutations(amount, status);
            CREATE INDEX IF NOT EXISTS idx_bank_mutations_trx_id ON bank_mutations(transaction_id);
        `;

        await client.query(sql);
        console.log('--- Table created successfully! ---');
    } catch (err) {
        console.error('--- Migration Failed! ---');
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
