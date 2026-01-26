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

        console.log('Adding reset password columns to affiliates table...\n');

        // Add reset_password_token column
        await client.query(`
            ALTER TABLE affiliates 
            ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255)
        `);
        console.log('✅ Added reset_password_token column');

        // Add reset_password_expires column
        await client.query(`
            ALTER TABLE affiliates 
            ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP
        `);
        console.log('✅ Added reset_password_expires column');

        // Verify columns were added
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'affiliates'
            AND column_name IN ('reset_password_token', 'reset_password_expires')
        `);

        console.log('\nVerification:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} ✅`);
        });

        console.log('\n✅ Migration completed successfully!');

        client.release();
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
