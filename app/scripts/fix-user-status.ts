
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'soroboti_db',
    password: process.env.DB_PASSWORD || '123qweASD!@#!@#',
    database: process.env.DB_NAME || 'soroboti_ads',
});

async function run() {
    try {
        console.log('Connecting to database...');
        console.log(`Host: ${process.env.DB_HOST || '127.0.0.1'}`);

        const client = await pool.connect();
        console.log('Connected successfully.');

        // 1. Show current non-active users
        console.log('\n=== Current non-active users ===');
        const nonActiveUsers = await client.query(`
            SELECT user_id, username, email, status_user 
            FROM data_user 
            WHERE status_user != 'active'
        `);

        if (nonActiveUsers.rows.length === 0) {
            console.log('No non-active users found.');
        } else {
            nonActiveUsers.rows.forEach(u => console.log(`- ${u.username} (${u.status_user}) - ${u.email}`));
        }

        // 2. HOTFIX: Update ALL non-banned users to active
        // This handles cases where users have valid logins but status_user is invalid/expired/pending
        console.log('\n=== [HOTFIX] Updating all non-banned users to active ===');
        const updateResult = await client.query(`
            UPDATE data_user 
            SET status_user = 'active',
                update_at = NOW()
            WHERE status_user != 'active'
            AND (status_user IS NULL OR status_user NOT IN ('banned', 'blocked'))
            RETURNING user_id, username, status_user
        `);

        console.log(`\nUpdated ${updateResult.rows.length} user(s) to 'active' status:`);
        updateResult.rows.forEach(row => {
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
        console.log('\n✅ Hotfix completed successfully!');
    } catch (e) {
        console.error('\n❌ Error:', e);
    } finally {
        await pool.end();
    }
}

run();
