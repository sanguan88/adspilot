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

        const result = await client.query(`
            SELECT 
                username, 
                email,
                reset_password_token,
                reset_password_expires
            FROM data_user
            WHERE email = '07raflycall45@gmail.com'
        `);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('User:', user.username);
            console.log('Email:', user.email);
            console.log('Reset Token:', user.reset_password_token ? user.reset_password_token.substring(0, 20) + '...' : 'NULL');
            console.log('Token Expires:', user.reset_password_expires);

            if (user.reset_password_expires) {
                const expiresAt = new Date(user.reset_password_expires);
                const now = new Date();
                const isValid = expiresAt > now;
                console.log('Token Valid:', isValid ? 'YES ✅' : 'NO (expired) ❌');
            }
        }

        client.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
