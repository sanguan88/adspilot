const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    database: 'soroboti_ads',
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
});

async function run() {
    try {
        console.log('Creating trial_usage_history table...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS trial_usage_history (
        id SERIAL PRIMARY KEY,
        shop_id VARCHAR(50) NOT NULL,
        shop_name VARCHAR(255),
        user_id INTEGER NOT NULL,
        subscription_id INTEGER,
        trial_started_at TIMESTAMP NOT NULL,
        trial_ended_at TIMESTAMP,
        plan_id VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- Constraint: 1 shop hanya bisa trial 1x (per plan_id)
        UNIQUE(shop_id, plan_id)
      );
    `);

        console.log('✓ Table created successfully');

        // Create index untuk performance
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_trial_shop_id ON trial_usage_history(shop_id);
      CREATE INDEX IF NOT EXISTS idx_trial_user_id ON trial_usage_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_trial_status ON trial_usage_history(status);
    `);

        console.log('✓ Indexes created successfully');

        // Populate existing data (backfill) - cari semua toko yang pernah pakai free trial
        console.log('Backfilling existing trial data...');

        await pool.query(`
      INSERT INTO trial_usage_history (shop_id, shop_name, user_id, subscription_id, trial_started_at, plan_id, status)
      SELECT DISTINCT
        dt.id_toko as shop_id,
        dt.nama_toko as shop_name,
        CAST(dt.user_id AS INTEGER) as user_id,
        s.id as subscription_id,
        s.start_date as trial_started_at,
        s.plan_id,
        CASE 
          WHEN s.status = 'active' THEN 'active'
          WHEN s.status = 'expired' THEN 'completed'
          WHEN s.status = 'cancelled' THEN 'cancelled'
          ELSE 'completed'
        END as status
      FROM subscriptions s
      JOIN data_toko dt ON CAST(dt.user_id AS INTEGER) = CAST(s.user_id AS INTEGER)
      WHERE s.plan_id = '7-day-trial'
        AND NOT EXISTS (
          SELECT 1 FROM trial_usage_history tuh 
          WHERE tuh.shop_id = dt.id_toko AND tuh.plan_id = s.plan_id
        )
      ON CONFLICT (shop_id, plan_id) DO NOTHING;
    `);

        console.log('✓ Backfill completed');

        // Show summary
        const result = await pool.query('SELECT COUNT(*) as total FROM trial_usage_history');
        console.log(`\n📊 Total trial records: ${result.rows[0].total}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
