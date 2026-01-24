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

        // 1. Update all users with active subscription to have status_user = 'active'
        console.log('\n=== Updating users with active subscriptions ===');
        const updateResult = await client.query(`
      UPDATE data_user 
      SET status_user = 'active',
          update_at = NOW()
      WHERE user_id IN (
        SELECT DISTINCT user_id 
        FROM subscriptions 
        WHERE status = 'active' 
          AND end_date >= CURRENT_DATE
      )
      AND status_user != 'active'
      RETURNING user_id, username, status_user
    `);

        console.log(`\nUpdated ${updateResult.rows.length} user(s) to 'active' status:`);
        updateResult.rows.forEach(row => {
            console.log(`  - ${row.username} (${row.user_id}): ${row.status_user}`);
        });

        // 2. Also fix any 'aktif' to 'active' (legacy data)
        console.log('\n=== Fixing legacy "aktif" status ===');
        const fixLegacyResult = await client.query(`
      UPDATE data_user 
      SET status_user = 'active',
          update_at = NOW()
      WHERE status_user = 'aktif'
      RETURNING user_id, username, status_user
    `);

        console.log(`\nFixed ${fixLegacyResult.rows.length} user(s) from 'aktif' to 'active':`);
        fixLegacyResult.rows.forEach(row => {
            console.log(`  - ${row.username} (${row.user_id}): ${row.status_user}`);
        });

        // 3. Show summary
        console.log('\n=== Summary ===');
        const summaryResult = await client.query(`
      SELECT 
        status_user,
        COUNT(*) as count
      FROM data_user
      GROUP BY status_user
      ORDER BY count DESC
    `);

        console.log('\nUser status distribution:');
        summaryResult.rows.forEach(row => {
            console.log(`  ${row.status_user}: ${row.count} user(s)`);
        });

        client.release();
        console.log('\n✅ Migration completed successfully!');
    } catch (e) {
        console.error('\n❌ Error:', e);
    } finally {
        await pool.end();
    }
}

run();
