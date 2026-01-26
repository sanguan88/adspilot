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

        console.log('=== FINAL TOKEN CHECK ===\n');

        // Test with new query
        const result = await client.query(`
            SELECT 
                email,
                reset_password_expires,
                reset_password_expires > (NOW() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC' as is_valid_new_query,
                NOW() AT TIME ZONE 'Asia/Jakarta' as server_jakarta_time,
                (NOW() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'UTC' as server_utc_converted
            FROM data_user
            WHERE reset_password_token = $1
        `, [token]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('Token Found:');
            console.log('- Email:', user.email);
            console.log('- Expires At:', user.reset_password_expires);
            console.log('- Server Jakarta Time:', user.server_jakarta_time);
            console.log('- Server UTC (converted):', user.server_utc_converted);
            console.log('- Valid with NEW query:', user.is_valid_new_query ? 'YES ✅' : 'NO ❌');

            const expiresDate = new Date(user.reset_password_expires);
            const serverUtc = new Date(user.server_utc_converted);
            const diffMinutes = Math.round((expiresDate - serverUtc) / 1000 / 60);
            console.log('- Time remaining:', diffMinutes, 'minutes');

            if (diffMinutes < 0) {
                console.log('\n⚠️  Token SUDAH EXPIRED! Request forgot password lagi untuk token baru.');
            }
        } else {
            console.log('Token NOT found!');
        }

        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
