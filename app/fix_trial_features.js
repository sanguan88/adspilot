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
        console.log('Clearing hardcoded features for 7-day-trial plan...\n');

        // Set features to NULL agar pakai auto-generated features
        await pool.query(`
      UPDATE subscription_plans 
      SET features = NULL
      WHERE plan_id = '7-day-trial'
    `);

        console.log('✓ Features cleared successfully');
        console.log('✓ Plan will now use auto-generated features based on config');

        // Show new config
        const result = await pool.query(`
      SELECT 
        plan_id,
        max_accounts,
        max_automation_rules,
        max_campaigns,
        support_level,
        features
      FROM subscription_plans
      WHERE plan_id = '7-day-trial'
    `);

        console.log('\n📊 Updated Configuration:');
        console.log('========================');
        console.log('Max Accounts:', result.rows[0].max_accounts);
        console.log('Max Automation Rules:', result.rows[0].max_automation_rules);
        console.log('Max Campaigns:', result.rows[0].max_campaigns);
        console.log('Support Level:', result.rows[0].support_level);
        console.log('Features (JSON):', result.rows[0].features);

        console.log('\n✅ Auto-generated features will be:');
        console.log('1. Akses 7 hari gratis');
        console.log('2. 1 toko Shopee');
        console.log('3. 3 rules otomasi aktif');
        console.log('4. Semua fitur Shopee Ads Expert');
        console.log('5. BCG Matrix Analysis');
        console.log('6. Support via Email');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

run();
