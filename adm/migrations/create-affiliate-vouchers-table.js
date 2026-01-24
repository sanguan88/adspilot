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
        console.log('🚀 Starting migration: Create affiliate_vouchers table...\n');

        await client.query('BEGIN');

        // Create affiliate_vouchers table
        await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_vouchers (
        id SERIAL PRIMARY KEY,
        affiliate_id VARCHAR(50) NOT NULL,
        voucher_code VARCHAR(50) UNIQUE NOT NULL,
        discount_type VARCHAR(20) DEFAULT 'percentage',
        discount_value DECIMAL(10,2) DEFAULT 50.00,
        is_active BOOLEAN DEFAULT true,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_affiliate_voucher_affiliate
          FOREIGN KEY (affiliate_id) 
          REFERENCES affiliates(affiliate_id)
          ON DELETE CASCADE
      )
    `);
        console.log('✅ Created table: affiliate_vouchers');

        // Create indexes
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliate_vouchers_code 
      ON affiliate_vouchers(voucher_code)
    `);
        console.log('✅ Created index: idx_affiliate_vouchers_code');

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliate_vouchers_affiliate 
      ON affiliate_vouchers(affiliate_id)
    `);
        console.log('✅ Created index: idx_affiliate_vouchers_affiliate');

        await client.query('COMMIT');

        // Verify
        const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'affiliate_vouchers'
      ORDER BY ordinal_position
    `);

        console.log('\n📋 Table Structure:');
        result.rows.forEach(row => {
            console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });

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
