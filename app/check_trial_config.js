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
        console.log('Checking 7-day-trial plan configuration...\n');

        const result = await pool.query(`
      SELECT 
        plan_id,
        name,
        price,
        max_accounts,
        max_automation_rules,
        max_campaigns,
        support_level,
        duration_days,
        features
      FROM subscription_plans
      WHERE plan_id = '7-day-trial'
    `);

        if (result.rows.length > 0) {
            const plan = result.rows[0];
            console.log('📊 Current Configuration:');
            console.log('========================');
            console.log('Plan ID:', plan.plan_id);
            console.log('Name:', plan.name);
            console.log('Price:', plan.price);
            console.log('Max Accounts:', plan.max_accounts);
            console.log('Max Automation Rules:', plan.max_automation_rules);
            console.log('Max Campaigns:', plan.max_campaigns);
            console.log('Support Level:', plan.support_level);
            console.log('Duration Days:', plan.duration_days);
            console.log('Features (JSON):', plan.features);
        } else {
            console.log('❌ Plan not found!');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

run();
