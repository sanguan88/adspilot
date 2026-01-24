const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function run() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected successfully.');

        // Check all users with their subscription status
        console.log('\n=== All Users with Subscription Status ===');
        const result = await client.query(`
      SELECT 
        du.user_id,
        du.username,
        du.status_user,
        s.status as subscription_status,
        s.end_date as subscription_end_date,
        s.plan_id
      FROM data_user du
      LEFT JOIN subscriptions s ON du.user_id = s.user_id AND s.status = 'active'
      ORDER BY du.created_at DESC
      LIMIT 50
    `);

        console.log(`\nFound ${result.rows.length} users:\n`);

        let pendingCount = 0;
        let activeWithSubCount = 0;
        let activeNoSubCount = 0;

        result.rows.forEach(row => {
            const hasActiveSub = row.subscription_status === 'active';
            const statusIcon = row.status_user === 'active' ? '✅' :
                row.status_user === 'pending_payment' ? '⏳' : '❌';

            console.log(`${statusIcon} ${row.username} (${row.user_id.substring(0, 8)}...)`);
            console.log(`   Status: ${row.status_user} | Sub: ${row.subscription_status || 'none'} | Plan: ${row.plan_id || 'none'}`);

            if (row.status_user === 'pending_payment') {
                pendingCount++;
                if (hasActiveSub) {
                    console.log(`   ⚠️  BUG: Has active subscription but status is pending_payment!`);
                }
            } else if (row.status_user === 'active') {
                if (hasActiveSub) {
                    activeWithSubCount++;
                } else {
                    activeNoSubCount++;
                    console.log(`   ⚠️  WARNING: Status active but no active subscription!`);
                }
            }
            console.log('');
        });

        console.log('\n=== Summary ===');
        console.log(`Pending payment: ${pendingCount} users`);
        console.log(`Active with subscription: ${activeWithSubCount} users`);
        console.log(`Active without subscription: ${activeNoSubCount} users`);

        client.release();
    } catch (e) {
        console.error('\n❌ Error:', e);
    } finally {
        await pool.end();
    }
}

run();
