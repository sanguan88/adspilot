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
        const client = await pool.connect();

        console.log('=== TIMEZONE DEBUG ===\n');

        // Get current server time
        const timeResult = await client.query(`
            SELECT 
                NOW() as server_local_time,
                NOW() AT TIME ZONE 'UTC' as server_utc_time,
                CURRENT_TIMESTAMP as current_timestamp
        `);

        console.log('Server Times:');
        console.log('- Local Time:', timeResult.rows[0].server_local_time);
        console.log('- UTC Time:', timeResult.rows[0].server_utc_time);
        console.log('- Current Timestamp:', timeResult.rows[0].current_timestamp);

        // Get latest reset token
        const tokenResult = await client.query(`
            SELECT 
                email,
                reset_password_token,
                reset_password_expires,
                reset_password_expires > NOW() as is_valid_local,
                reset_password_expires > NOW() AT TIME ZONE 'UTC' as is_valid_utc
            FROM data_user
            WHERE reset_password_token IS NOT NULL
            ORDER BY reset_password_expires DESC
            LIMIT 1
        `);

        if (tokenResult.rows.length > 0) {
            const user = tokenResult.rows[0];
            console.log('\nLatest Reset Token:');
            console.log('- Email:', user.email);
            console.log('- Token:', user.reset_password_token.substring(0, 20) + '...');
            console.log('- Expires At:', user.reset_password_expires);
            console.log('- Valid (NOW()):', user.is_valid_local ? 'YES ✅' : 'NO ❌');
            console.log('- Valid (NOW() AT TIME ZONE UTC):', user.is_valid_utc ? 'YES ✅' : 'NO ❌');

            // Calculate difference
            const expiresDate = new Date(user.reset_password_expires);
            const now = new Date();
            const diffMinutes = Math.round((expiresDate - now) / 1000 / 60);
            console.log('- Time until expiry (JS):', diffMinutes, 'minutes');
        } else {
            console.log('\nNo reset tokens found in database');
        }

        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
