const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
    database: 'soroboti_ads',
});

async function run() {
    const token = 'ec10fdb82d1180bbd6a2391890ad9f6d2d03f8db23439684f5be0008db747c10';

    try {
        const client = await pool.connect();

        console.log('=== TOKEN VALIDATION DEBUG ===\n');
        console.log('Token:', token.substring(0, 20) + '...\n');

        // Get server times
        const timeResult = await client.query(`
            SELECT 
                NOW() as server_now,
                NOW() AT TIME ZONE 'UTC' as server_now_utc,
                CURRENT_TIMESTAMP as current_ts
        `);

        console.log('Server Times:');
        console.log('- NOW():', timeResult.rows[0].server_now);
        console.log('- NOW() AT TIME ZONE UTC:', timeResult.rows[0].server_now_utc);
        console.log('- CURRENT_TIMESTAMP:', timeResult.rows[0].current_ts);

        // Check token
        const tokenResult = await client.query(`
            SELECT 
                email,
                reset_password_token,
                reset_password_expires,
                reset_password_expires > NOW() as valid_with_now,
                reset_password_expires > NOW() AT TIME ZONE 'UTC' as valid_with_utc,
                reset_password_expires > CURRENT_TIMESTAMP as valid_with_current
            FROM data_user
            WHERE reset_password_token = $1
        `, [token]);

        if (tokenResult.rows.length > 0) {
            const user = tokenResult.rows[0];
            console.log('\nToken Found:');
            console.log('- Email:', user.email);
            console.log('- Expires At:', user.reset_password_expires);
            console.log('- Valid with NOW():', user.valid_with_now ? 'YES ✅' : 'NO ❌');
            console.log('- Valid with NOW() AT TIME ZONE UTC:', user.valid_with_utc ? 'YES ✅' : 'NO ❌');
            console.log('- Valid with CURRENT_TIMESTAMP:', user.valid_with_current ? 'YES ✅' : 'NO ❌');

            // Manual comparison
            const expiresDate = new Date(user.reset_password_expires);
            const serverNow = new Date(timeResult.rows[0].server_now);
            const serverUtc = new Date(timeResult.rows[0].server_now_utc);

            console.log('\nManual Comparison:');
            console.log('- Expires:', expiresDate.toISOString());
            console.log('- Server NOW:', serverNow.toISOString());
            console.log('- Server UTC:', serverUtc.toISOString());
            console.log('- Diff (expires - server NOW):', Math.round((expiresDate - serverNow) / 1000 / 60), 'minutes');
            console.log('- Diff (expires - server UTC):', Math.round((expiresDate - serverUtc) / 1000 / 60), 'minutes');
        } else {
            console.log('\n❌ Token NOT found in database!');
        }

        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
