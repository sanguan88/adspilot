const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('🚀 Adding voucher_affiliate_id column to transactions table...\n');

        await client.query('BEGIN');

        // Add column for tracking which affiliate's voucher was used
        await client.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS voucher_affiliate_id VARCHAR(50) DEFAULT NULL
    `);
        console.log('✅ Added column: voucher_affiliate_id');

        // Add index for efficient lookups
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_voucher_affiliate 
      ON transactions(voucher_affiliate_id)
      WHERE voucher_affiliate_id IS NOT NULL
    `);
        console.log('✅ Created index: idx_transactions_voucher_affiliate');

        await client.query('COMMIT');

        // Verify
        const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name = 'voucher_affiliate_id'
    `);

        if (result.rows.length > 0) {
            console.log('\n📋 Column added successfully:');
            console.log(`   ${result.rows[0].column_name}: ${result.rows[0].data_type} (default: ${result.rows[0].column_default})`);
        }

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
